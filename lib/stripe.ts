/**
 * lib/stripe.ts — Stripe helper for Hostamar 3 tiers
 * - Uses Taka→USD mapping @126.25: starter $4.75, pro $10.30, business $23.75
 * - Zero-card fallback: returns null/error when STRIPE_SECRET_KEY missing
 * - Lazy Stripe import so building without `stripe` installed still works
 */
import { PRICING, type Tier } from "./pricing";

export type CreateCheckoutOpts = {
  tier: Tier;
  customerId?: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
};

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://hostamar.com"
  ).replace(/\/$/, "");
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getTierStripeAmount(tier: Tier) {
  const p = PRICING[tier];
  return { usdCents: p.usdCents, taka: p.taka, usd: p.usd, credits: p.credits, label: p.label };
}

/**
 * Create a Stripe Checkout Session for a tier.
 * Returns { url, sessionId } on success, or { error, fallback } when not configured.
 * Caller (API route) should handle fallback.
 */
export async function createCheckoutSession(
  opts: CreateCheckoutOpts
): Promise<{ url: string; sessionId: string } | { error: string; fallback: "bkash_only" }> {
  const { tier, customerId, email, successUrl, cancelUrl } = opts;

  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Stripe not configured — bKash only. Set STRIPE_SECRET_KEY in Vercel env.", fallback: "bkash_only" };
  }

  if (!PRICING[tier]) {
    return { error: `Invalid tier: ${tier}`, fallback: "bkash_only" } as any;
  }

  const pricing = PRICING[tier];
  const baseUrl = getBaseUrl();

  // Lazy import stripe
  let Stripe: any;
  try {
    Stripe = (await import("stripe")).default;
  } catch (e: any) {
    return { error: `Stripe SDK not installed: ${e?.message || e}. Run: npm i stripe`, fallback: "bkash_only" };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Hostamar ${pricing.label}`,
            description: `${pricing.credits.toLocaleString()} credits — ৳${pricing.taka} (~$${pricing.usd.toFixed(2)} @126.25)`,
          },
          unit_amount: pricing.usdCents,
        },
        quantity: 1,
      },
    ],
    success_url:
      successUrl || `${baseUrl}/dashboard?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${baseUrl}/pricing?payment=cancelled&tier=${tier}`,
    customer_email: email || undefined,
    metadata: {
      tier,
      credits: String(pricing.credits),
      taka: String(pricing.taka),
      customerId: customerId || "",
      email: email || "",
    },
    // allow promotion codes if desired later
    allow_promotion_codes: false,
  });

  if (!session.url) {
    throw new Error("Stripe session created but no URL returned");
  }

  return { url: session.url, sessionId: session.id };
}

/**
 * Verify webhook signature if STRIPE_WEBHOOK_SECRET is set, else parse raw JSON.
 */
export async function verifyStripeWebhook(
  rawBody: string | Buffer,
  signature: string | null
): Promise<{ event: any; verified: boolean }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    // No secret configured — allow without verification (dev / fallback)
    const event = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"));
    return { event, verified: false };
  }
  // Verify with stripe
  let Stripe: any;
  try {
    Stripe = (await import("stripe")).default;
  } catch {
    const event = JSON.parse(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"));
    return { event, verified: false };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
  });
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  return { event, verified: true };
}
