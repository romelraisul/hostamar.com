export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeTier, PRICING, type Tier } from "@/lib/pricing";
import { fulfillPayment } from "@/lib/payments/fulfill";

/**
 * POST /api/payments/stripe/webhook
 * Handles checkout.session.completed -> add credits + invoice + SeoEvent
 * Verifies signature if STRIPE_WEBHOOK_SECRET set, else allows.
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: any;
  let verified = false;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret && sig && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2023-10-16" as any,
      });
      event = stripe.webhooks.constructEvent(raw, sig, secret);
      verified = true;
    } catch (e: any) {
      console.error("[stripe webhook] signature verify failed:", e?.message);
      return NextResponse.json({ error: "Invalid signature", message: e?.message }, { status: 400 });
    }
  } else {
    // No secret configured — parse raw and allow (dev / fallback). Log.
    try {
      event = JSON.parse(raw);
    } catch (e: any) {
      return NextResponse.json({ error: "Invalid JSON", message: e?.message }, { status: 400 });
    }
    if (secret && !sig) {
      console.warn("[stripe webhook] STRIPE_WEBHOOK_SECRET set but no signature header — allowing (set webhook secret correctly in prod)");
    } else {
      console.log("[stripe webhook] no STRIPE_WEBHOOK_SECRET — skipping verification (bKash-only fallback mode)");
    }
  }

  console.log(`[stripe webhook] ${event.type} verified=${verified} id=${event.id || ""}`);

  try {
    // Handle checkout.session.completed and also payment_intent.succeeded as fallback
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const tier = normalizeTier(session.metadata?.tier || session.client_reference_id) as Tier | null;
      const email: string | null = session.customer_email || session.customer_details?.email || session.metadata?.email || null;
      const customerId: string | null = session.metadata?.customerId || null;
      const trxId: string = session.id || session.payment_intent || `stripe_${Date.now()}`;

      if (!tier || !PRICING[tier]) {
        console.warn("[stripe webhook] missing/invalid tier in metadata, session:", session.id, session.metadata);
        return NextResponse.json({ received: true, warning: "no tier, skipping fulfill" });
      }
      if (!email && !customerId) {
        console.warn("[stripe webhook] no email/customerId in session, skipping", session.id);
        return NextResponse.json({ received: true, warning: "no email/customerId" });
      }

      const result = await fulfillPayment({
        tier,
        email: email || "unknown@hostamar.com",
        customerId,
        trxId,
        provider: "stripe",
        rawPayload: event,
      });

      return NextResponse.json({ received: true, ...result });
    }

    if (event.type === "payment_intent.succeeded") {
      // Alternative: payment_intent without checkout session (e.g. subscription invoice)
      const pi = event.data.object as any;
      // Try to get tier from metadata if present
      const tier = normalizeTier(pi.metadata?.tier) as Tier | null;
      if (!tier) {
        return NextResponse.json({ received: true, ignored: "payment_intent without tier metadata" });
      }
      const email = pi.receipt_email || pi.metadata?.email || null;
      const trxId = pi.id;
      const result = await fulfillPayment({
        tier,
        email: email || "unknown@hostamar.com",
        customerId: pi.metadata?.customerId || null,
        trxId,
        provider: "stripe",
        rawPayload: event,
      });
      return NextResponse.json({ received: true, ...result });
    }

    // For other events (invoice.paid etc.) just ack
    return NextResponse.json({ received: true, type: event.type });
  } catch (e: any) {
    console.error("[stripe webhook] fulfill error:", e);
    return NextResponse.json({ error: e?.message || "fulfill failed", received: false }, { status: 500 });
  }
}

// Stripe requires raw body; Next handles it but we already used req.text()
// Also support GET for health check
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: !!process.env.STRIPE_SECRET_KEY,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}
