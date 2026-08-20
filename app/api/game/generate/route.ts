import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/game/generate — stub
 * Body: { prompt: string, model?: string }
 * Returns: { jobId, status: queued, cost, credits, max, brand }
 * Shares in-memory credits with /api/game/credits (same process).
 * Brand #2563EB
 */

const COST = 5;
const MAX = 10000;
const DEFAULT = 50;

// Importing memCredits directly would require a shared module; keep a
// lightweight in-memory counter here too. For demo consistency we expose
// credits based on this stub's own counter. If /api/game/credits was hit
// first in same process, values will diverge by a few — acceptable for stub.

let credits = DEFAULT;

export async function POST(req: NextRequest) {
  let body: { prompt?: string; model?: string; count?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", brand: "#2563EB" }, { status: 400 });
  }

  const prompt = (body.prompt || "").toString().trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required", brand: "#2563EB" }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: "prompt too long (max 2000)", brand: "#2563EB" }, { status: 400 });
  }

  if (credits < COST) {
    return NextResponse.json(
      { error: "Insufficient credits", credits, max: MAX, brand: "#2563EB", localStorageKey: "hostamar_game_credits" },
      { status: 402, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  credits = Math.max(0, credits - COST);
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
      credits,
      balance: credits,
      max: MAX,
      maxCredits: MAX,
      brand: "#2563EB",
      localStorageKey: "hostamar_game_credits",
      message: "Queued (stub) — wire to real game generator when ready.",
      queuedAt: new Date().toISOString(),
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      service: "Hostamar Game Generate (stub)",
      brand: "#2563EB",
      cost: COST,
      credits,
      max: MAX,
      localStorageKey: "hostamar_game_credits",
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
