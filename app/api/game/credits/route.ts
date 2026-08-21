import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Game Credits — DB-backed via the GameBalance model (no in-memory state).
 *  GET  /api/game/credits  -> authenticated user's persisted balance
 *  POST /api/game/credits  -> claim daily grant / generate (mutates DB)
 *
 * Brand #2563EB. Balances persist per-customer in Prisma GameBalance.
 * Unauthenticated callers get a read-only demo balance (not persisted);
 * any mutation requires login.
 */

const DEFAULT_CREDITS = 1000; // matches GameBalance.credits default
const MAX_CREDITS = 10000;
const DAILY_GRANT = 50;
const GENERATE_COST = 5;
const BRAND = "#2563EB";

function payload(credits: number, persisted: boolean) {
  return {
    credits,
    balance: credits,
    max: MAX_CREDITS,
    maxCredits: MAX_CREDITS,
    brand: BRAND,
    currency: "credits",
    persisted,
    free: {
      dailyGrant: DAILY_GRANT,
      maxCap: MAX_CREDITS,
      note: persisted
        ? "Balance stored in your account (GameBalance)."
        : "Log in to save your balance across sessions.",
    },
    checkedAt: new Date().toISOString(),
  };
}

async function getOrCreateBalance(customerId: string) {
  const existing = await prisma.gameBalance.findUnique({ where: { customerId } });
  if (existing) return existing;
  return prisma.gameBalance.create({
    data: { customerId, credits: DEFAULT_CREDITS, balance: DEFAULT_CREDITS, mode: "free" },
  });
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    // Public demo balance — read-only, not persisted.
    return NextResponse.json(payload(DEFAULT_CREDITS, false), {
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  }
  try {
    const bal = await getOrCreateBalance(authUser.id);
    return NextResponse.json(payload(bal.credits, true), {
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e: any) {
    console.error("[game/credits] GET error:", e?.message || e);
    return NextResponse.json({ error: "Failed to load game balance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json(
      { error: "Login required to save or spend game credits", brand: BRAND },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // ignore malformed body
  }

  try {
    const bal = await getOrCreateBalance(authUser.id);

    // Generate intent: { prompt } -> spend GENERATE_COST, return a job handle.
    if (typeof body.prompt === "string" && body.prompt.trim()) {
      const prompt = body.prompt.trim();
      if (bal.credits < GENERATE_COST) {
        return NextResponse.json(
          { error: "Insufficient credits", credits: bal.credits, max: MAX_CREDITS, brand: BRAND },
          { status: 402 }
        );
      }
      const updated = await prisma.gameBalance.update({
        where: { customerId: authUser.id },
        data: { credits: { decrement: GENERATE_COST }, balance: { decrement: GENERATE_COST } },
      });
      const jobId = `game_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      return NextResponse.json(
        {
          success: true,
          jobId,
          status: "queued",
          prompt,
          cost: GENERATE_COST,
          credits: updated.credits,
          max: MAX_CREDITS,
          brand: BRAND,
        },
        { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
      );
    }

    // Daily grant: ?grant=1 or body.grant
    const url = new URL(req.url);
    const wantsGrant =
      url.searchParams.get("grant") === "1" || body.grant === 1 || body.grant === "1";
    if (wantsGrant) {
      const updated = await prisma.gameBalance.update({
        where: { customerId: authUser.id },
        data: { credits: Math.min(MAX_CREDITS, bal.credits + DAILY_GRANT) },
      });
      return NextResponse.json(payload(updated.credits, true), {
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      });
    }

    // Default: return current persisted balance.
    return NextResponse.json(payload(bal.credits, true), {
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[game/credits] POST error:", e?.message || e);
    return NextResponse.json({ error: "Failed to update game balance" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
