/**
 * lib/paypal.ts — PayPal REST helper for Hostamar 3 tiers
 * - Same 126.25 rate: starter $4.75, pro $10.30, business $23.75
 * - Uses PAYPAL_CLIENT_ID + PAYPAL_SECRET + PAYPAL_ENV (sandbox|live)
 * - Graceful fallback when env missing -> bkash_only
 */
import { PRICING, type Tier } from "./pricing";

export type PayPalEnv = "sandbox" | "live";

export function getPayPalEnv(): PayPalEnv {
  const e = (process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || "").toLowerCase();
  if (e === "live" || e === "production") return "live";
  return "sandbox";
}

export function getPayPalBaseUrl(): string {
  return getPayPalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://hostamar.com"
  ).replace(/\/$/, "");
}

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error("PayPal not configured: PAYPAL_CLIENT_ID/PAYPAL_SECRET missing");
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;

  const base = getPayPalBaseUrl();
  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`PayPal token failed ${res.status}: ${txt}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export type CreateOrderOpts = {
  tier: Tier;
  customerId?: string;
  email?: string;
};

export async function createOrder(
  opts: CreateOrderOpts
): Promise<{ orderId: string; approveUrl: string; raw: any } | { error: string; fallback: "bkash_only" }> {
  const { tier, customerId, email } = opts;

  if (!isPayPalConfigured()) {
    return { error: "PayPal not configured — bKash only. Set PAYPAL_CLIENT_ID and PAYPAL_SECRET.", fallback: "bkash_only" };
  }
  if (!PRICING[tier]) {
    return { error: `Invalid tier: ${tier}`, fallback: "bkash_only" } as any;
  }

  const pricing = PRICING[tier];
  const baseUrl = getAppBaseUrl();
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: tier,
          description: `Hostamar ${pricing.label} — ${pricing.credits} credits (৳${pricing.taka})`,
          custom_id: `${tier}|${customerId || ""}|${email || ""}|${pricing.credits}|${pricing.taka}`,
          amount: {
            currency_code: "USD",
            value: pricing.usd.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Hostamar",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${baseUrl}/api/payments/paypal/capture?tier=${tier}`,
        cancel_url: `${baseUrl}/pricing?payment=cancelled&tier=${tier}`,
      },
    }),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal create order failed ${res.status}: ${JSON.stringify(data)}`);
  }

  const approveUrl = (data.links || []).find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href || null;
  if (!approveUrl) {
    console.warn("[paypal] no approve link in response", data);
  }

  return { orderId: data.id, approveUrl: approveUrl || `${base}/checkout?token=${data.id}`, raw: data };
}

export async function captureOrder(orderId: string): Promise<any> {
  if (!isPayPalConfigured()) throw new Error("PayPal not configured");
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal capture failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Verify PayPal webhook if PAYPAL_WEBHOOK_ID is set, else allow.
 * PayPal verification requires calling /v1/notifications/verify-webhook-signature.
 * If not configured, we trust the payload (fallback) and return verified=false.
 */
export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  rawBody: string
): Promise<{ verified: boolean; body: any }> {
  const body = JSON.parse(rawBody);
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    return { verified: false, body };
  }
  try {
    const token = await getPayPalAccessToken();
    const base = getPayPalBaseUrl();
    const headerMap: any = {};
    // PayPal sends these headers
    const want = [
      "paypal-transmission-id",
      "paypal-transmission-time",
      "paypal-cert-url",
      "paypal-auth-algo",
      "paypal-transmission-sig",
    ];
    for (const k of want) {
      if (headers[k]) headerMap[k] = headers[k];
      if (headers[k.toLowerCase()]) headerMap[k] = headers[k.toLowerCase()];
    }
    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transmission_id: headerMap["paypal-transmission-id"],
        transmission_time: headerMap["paypal-transmission-time"],
        cert_url: headerMap["paypal-cert-url"],
        auth_algo: headerMap["paypal-auth-algo"],
        transmission_sig: headerMap["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    return { verified: data.verification_status === "SUCCESS", body };
  } catch (e) {
    console.warn("[paypal] verify webhook error, allowing:", (e as Error).message);
    return { verified: false, body };
  }
}
