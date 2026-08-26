export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeTier, type Tier } from "@/lib/pricing";
import { captureOrder } from "@/lib/paypal";
import { fulfillPayment } from "@/lib/payments/fulfill";

/**
 * POST /api/payments/paypal/capture
 * Body: { orderId: string }  (called from frontend after PayPal approve redirect)
 * Captures the order, then fulfills: credits + invoice + SeoEvent
 *
 * Also supports GET ?orderId=xxx&tier=pro for redirect flow (return_url).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // also try query if body empty (GET redirect lands here via POST fallback)
    const url = new URL(req.url);
    const orderId = body.orderId || url.searchParams.get("orderId") || url.searchParams.get("token");
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const capture = await captureOrder(orderId);
    // capture -> purchase_units[0].payments.captures[0]
    const pu = capture.purchase_units?.[0] as any;
    const cap = pu?.payments?.captures?.[0] || capture;
    const status: string = cap.status || capture.status || "UNKNOWN";

    if (status !== "COMPLETED" && capture.status !== "COMPLETED") {
      console.warn("[paypal/capture] not completed:", status, capture);
      return NextResponse.json({ error: "Capture not completed", status, capture }, { status: 400 });
    }

    // Extract tier from custom_id: "tier|customerId|email|credits|taka" or reference_id
    let tier: Tier | null = null;
    const customId: string = pu?.custom_id || pu?.reference_id || "";
    const referenceId: string = pu?.reference_id || "";
    tier = normalizeTier(customId.split("|")[0]) || normalizeTier(referenceId) || normalizeTier(body.tier);
    // fallback: infer from amount value
    if (!tier) {
      const val = pu?.amount?.value || cap?.amount?.value;
      if (val === "4.75") tier = "starter";
      else if (val === "10.30") tier = "pro";
      else if (val === "23.75") tier = "business";
    }
    if (!tier) {
      return NextResponse.json({ error: "Could not determine tier from capture", capture }, { status: 400 });
    }

    const email: string = customId.split("|")[2] || body.email || capture.payer?.email_address || "unknown@hostamar.com";
    const customerId: string | null = customId.split("|")[1] || body.customerId || null;
    const trxId: string = cap.id || capture.id || orderId;

    const result = await fulfillPayment({
      tier,
      email,
      customerId,
      trxId,
      provider: "paypal",
      rawPayload: capture,
    });

    return NextResponse.json({ status, captureId: trxId, ...result });
  } catch (e: any) {
    console.error("[paypal/capture] error:", e);
    if (e?.message?.includes("PayPal not configured")) {
      return NextResponse.json({ error: e.message, fallback: "bkash_only" }, { status: 503 });
    }
    return NextResponse.json({ error: e?.message || "capture failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // PayPal return_url redirect (user approved). Capture via orderId token and redirect to dashboard.
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || url.searchParams.get("orderId");
  const tier = url.searchParams.get("tier");
  if (!token) return NextResponse.json({ error: "token/orderId required" }, { status: 400 });

  try {
    const capture = await captureOrder(token);
    const pu = capture.purchase_units?.[0] as any;
    const resolvedTier = normalizeTier(tier) || normalizeTier(pu?.reference_id) || null;
    if (!resolvedTier) {
      return NextResponse.json({ captured: true, capture, warning: "tier not resolved" });
    }
    const customId: string = pu?.custom_id || "";
    const email: string = customId.split("|")[2] || capture.payer?.email_address || "unknown@hostamar.com";
    const customerId: string | null = customId.split("|")[1] || null;
    const cap = pu?.payments?.captures?.[0] || capture;
    const trxId: string = cap.id || capture.id || token;
    await fulfillPayment({
      tier: resolvedTier,
      email,
      customerId,
      trxId,
      provider: "paypal",
      rawPayload: capture,
    });
    const base =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://hostamar.com";
    return NextResponse.redirect(`${base.replace(/\/$/, "")}/dashboard?payment=success&tier=${resolvedTier}&provider=paypal&orderId=${token}`, 302);
  } catch (e: any) {
    console.error("[paypal/capture GET] error:", e);
    return NextResponse.json({ error: e?.message || "capture failed" }, { status: 500 });
  }
}
