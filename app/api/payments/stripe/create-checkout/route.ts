export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { normalizeTier } from "@/lib/pricing";
import { createCheckoutSession } from "@/lib/stripe";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/payments/stripe/create-checkout
 * Body: { tier: "starter"|"pro"|"business", email?, customerId? }
 * - If STRIPE_SECRET_KEY missing: 503 with { error, fallback: "bkash_only" }
 * - Else: creates Stripe Checkout Session and returns { url, sessionId }
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

    // Try to enrich with session if available (keeps zero-card guest flow working)
    let sessionEmail: string | undefined;
    let sessionCustomerId: string | undefined;
    try {
      const u = await getAuthUser(req);
      if (u?.email) sessionEmail = u.email;
      if (u?.id) sessionCustomerId = u.id;
    } catch {}

    const email = body.email || sessionEmail;
    const customerId = body.customerId || sessionCustomerId;

    const result: any = await createCheckoutSession({
      tier,
      email,
      customerId,
    });

    if ((result as any).fallback === "bkash_only" || (result as any).error) {
      return NextResponse.json(
        {
          error: (result as any).error || "Stripe not configured",
          fallback: "bkash_only",
          message: "bKash only — configure STRIPE_SECRET_KEY to enable cards. Taka amount unchanged.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ url: result.url, sessionId: result.sessionId, tier });
  } catch (e: any) {
    console.error("[stripe/create-checkout] error:", e);
    // If it's the Stripe missing fallback, surface as 503
    if (e?.message?.includes("Stripe not configured") || e?.message?.includes("fallback")) {
      return NextResponse.json({ error: e.message, fallback: "bkash_only" }, { status: 503 });
    }
    return NextResponse.json({ error: e?.message || "internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST {tier}" }, { status: 405 });
}
