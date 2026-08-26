export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeTier, type Tier } from "@/lib/pricing";
import { fulfillPayment } from "@/lib/payments/fulfill";

/**
 * POST /api/payments/paypal/webhook
 * Handles PayPal webhook events. Verifies if PAYPAL_WEBHOOK_ID set, else allows.
 * Listens for PAYMENT.CAPTURE.COMPLETED / CHECKOUT.ORDER.APPROVED
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify if configured
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  let verified = false;
  if (webhookId) {
    try {
      const { verifyPayPalWebhook } = await import("@/lib/paypal");
      // collect relevant headers (case-insensitive)
      const headers: Record<string, string> = {};
      req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      const res = await verifyPayPalWebhook(headers, raw);
      verified = res.verified;
      body = res.body;
      if (!verified) {
        console.warn("[paypal webhook] verification failed, but allowing (check PAYPAL_WEBHOOK_ID)");
      }
    } catch (e: any) {
      console.warn("[paypal webhook] verify error, allowing:", e?.message);
    }
  } else {
    console.log("[paypal webhook] no PAYPAL_WEBHOOK_ID — skipping verification (bKash-only fallback mode)");
  }

  const eventType: string = body.event_type || body.eventType || "";
  console.log(`[paypal webhook] ${eventType} verified=${verified} id=${body.id || ""}`);

  try {
    // PayPal sends PAYMENT.CAPTURE.COMPLETED with resource
    if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.COMPLETED") {
      const resource = body.resource as any;
      // resource.custom_id is our "tier|customerId|email|credits|taka" or try supplementary_data
      const customId: string = resource.custom_id || resource.customId || resource.purchase_units?.[0]?.custom_id || "";
      const referenceId: string = resource.purchase_units?.[0]?.reference_id || "";
      let tier: Tier | null = normalizeTier(customId.split("|")[0]) || normalizeTier(referenceId) || null;
      // fallback amount inference
      if (!tier) {
        const val = resource.amount?.value || resource.purchase_units?.[0]?.amount?.value;
        if (val === "4.75") tier = "starter";
        else if (val === "10.30") tier = "pro";
        else if (val === "23.75") tier = "business";
      }
      if (!tier) {
        console.warn("[paypal webhook] no tier in payload, ignoring", resource);
        return NextResponse.json({ received: true, ignored: "no tier" });
      }
      const email: string = customId.split("|")[2] || resource.payer?.email_address || "unknown@hostamar.com";
      const customerId: string | null = customId.split("|")[1] || null;
      const trxId: string = resource.id || body.id || `paypal_${Date.now()}`;

      const result = await fulfillPayment({
        tier,
        email,
        customerId,
        trxId,
        provider: "paypal",
        rawPayload: body,
      });
      return NextResponse.json({ received: true, verified, ...result });
    }

    // PAYMENT.CAPTURE.REFUNDED, etc. -> just ack
    return NextResponse.json({ received: true, type: eventType });
  } catch (e: any) {
    console.error("[paypal webhook] fulfill error:", e);
    return NextResponse.json({ error: e?.message || "fulfill failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
    webhookIdSet: !!process.env.PAYPAL_WEBHOOK_ID,
    env: process.env.PAYPAL_ENV || "sandbox",
  });
}
