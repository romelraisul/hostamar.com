export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeTier } from "@/lib/pricing";
import { createOrder } from "@/lib/paypal";
import { getAuthUser } from "@/lib/auth";


/**
 * POST /api/payments/paypal/create-order
 * Body: { tier: "starter"|"pro"|"business", email?, customerId? }
 * - If PAYPAL_CLIENT_ID/SECRET missing: 503 { fallback: "bkash_only" }
 * - Else: creates PayPal order and returns { orderId, approveUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tier = normalizeTier(body.tier);
    if (!tier) {
      return NextResponse.json(
        { error: "Invalid tier. Use starter | pro | business.", received: body.tier },
        { status: 400 }
      );
    }

    let sessionEmail: string | undefined;
    let sessionCustomerId: string | undefined;
    try {
      const u = await getAuthUser(req);
      if (u?.email) sessionEmail = u.email;
      if (u?.id) sessionCustomerId = u.id;
    } catch {}

    const email = body.email || sessionEmail;
    const customerId = body.customerId || sessionCustomerId;

    const result: any = await createOrder({ tier, email, customerId });

    if ((result as any).fallback === "bkash_only" || (result as any).error) {
      return NextResponse.json(
        {
          error: (result as any).error || "PayPal not configured",
          fallback: "bkash_only",
          message: "bKash only — set PAYPAL_CLIENT_ID and PAYPAL_SECRET to enable PayPal.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      orderId: result.orderId,
      approveUrl: result.approveUrl,
      url: result.approveUrl, // alias for Stripe parity
      tier,
    });
  } catch (e: any) {
    console.error("[paypal/create-order] error:", e);
    if (e?.message?.includes("PayPal not configured")) {
      return NextResponse.json({ error: e.message, fallback: "bkash_only" }, { status: 503 });
    }
    return NextResponse.json({ error: e?.message || "internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST {tier}" }, { status: 405 });
}
