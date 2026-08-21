import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/game/generate — DB-backed via GameBalance (no in-memory state).
 * Body: { prompt: string, model?: string }
 * Returns: { jobId, status: queued, cost, credits, max, brand }
 * Brand #2563EB
 */

const COST = 5;
const MAX = 10000;
const DEFAULT = 1000; // matches GameBalance.credits default
const BRAND = "#2563EB";

async function getOrCreateBalance(customerId: string) {
  const existing = await prisma.gameBalance.findUnique({ where: { customerId } });
  if (existing) return existing;
  return prisma.gameBalance.create({
    data: { customerId, credits: DEFAULT, balance: DEFAULT, mode: "free" },
  });
}

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json(
      { error: "Login required to spend game credits", brand: BRAND },
      { status: 401 }
    );
  }

  let body: { prompt?: string; model?: string; count?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", brand: BRAND }, { status: 400 });
  }

  const prompt = (body.prompt || "").toString().trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required", brand: BRAND }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000)", brand: BRAND }, { status: 400 });
  }

  try {
    const bal = await getOrCreateBalance(authUser.id);
    if (bal.credits < COST) {
      return NextResponse.json(
        { error: "Insufficient credits", credits: bal.credits, max: MAX, brand: BRAND },
        { status: 402, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const updated = await prisma.gameBalance.update({
      where: { customerId: authUser.id },
      data: { credits: { decrement: COST }, balance: { decrement: COST } },
    });

    const jobId = `game_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    return NextResponse.json(
      {
        success: true,
        jobId,
        id: jobId,
        status: "queued",
        prompt,
        model: body.model || "hostamar-game-v1",
        cost: COST,
        credits: updated.credits,
        balance: updated.credits,
        max: MAX,
        maxCredits: MAX,
        brand: BRAND,
        queuedAt: new Date().toISOString(),
      },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[game/generate] error:", e?.message || e);
    return NextResponse.json({ error: "Failed to queue game generation" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  let credits = DEFAULT;
  if (authUser) {
    try {
      const bal = await getOrCreateBalance(authUser.id);
      credits = bal.credits;
    } catch {
      // fall back to default
    }
  }
  return NextResponse.json(
    {
      service: "Hostamar Game Generate",
      brand: BRAND,
      cost: COST,
      credits,
      max: MAX,
      usage: 'POST { prompt: string, model?: string } -> { jobId, status: "queued", cost, credits }',
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
  );
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
