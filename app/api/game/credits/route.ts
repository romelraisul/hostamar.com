import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public Game Credits + Generate stub
 *  GET  /api/game/credits  -> { credits: 50, max: 10000, brand, ... }
 *  POST /api/game/credits  -> same as GET (alias)
 *  POST /api/game/generate -> stub { jobId, status: queued, cost: 5, credits, ... }
 * Brand #2563EB — free-only, no DB, in-memory mock.
 */

const DEFAULT_CREDITS = 50;
const MAX_CREDITS = 10000;
const GENERATE_COST = 5;

// in-memory balance (per-process; real app would use DB/Redis)
let memCredits = DEFAULT_CREDITS;

function creditsPayload(credits = memCredits) {
  return {
    credits,
    balance: credits,
    max: MAX_CREDITS,
    maxCredits: MAX_CREDITS,
    brand: "#2563EB",
    currency: "credits",
    free: {
      dailyGrant: 50,
      maxCap: MAX_CREDITS,
      note: "Free 50 credits/day, cap 10000. Stored in localStorage + server mock.",
    },
    localStorageKey: "hostamar_game_credits",
    checkedAt: new Date().toISOString(),
  };
}

export async function GET() {
  return NextResponse.json(creditsPayload(), {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Alias: some clients POST to /credits to "claim" daily grant
export async function POST(req: NextRequest) {
  // If caller hits /api/game/credits with POST and no generate intent, treat as balance check.
  // Detect generate intent: body has { prompt } or caller actually meant /api/game/generate
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // ignore
  }

  // If body looks like a generate request but was sent to wrong path, handle gracefully
  if (typeof body.prompt === "string" && body.prompt.trim()) {
    return handleGenerate(body, req);
  }

  // Optional: ?grant=1 to simulate daily grant (cap at MAX)
  const url = new URL(req.url);
  if (url.searchParams.get("grant") === "1" || body.grant === 1 || body.grant === "1") {
    memCredits = Math.min(MAX_CREDITS, memCredits + 50);
  }

  return NextResponse.json(creditsPayload(), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}

function handleGenerate(body: Record<string, unknown>, _req: NextRequest) {
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required", brand: "#2563EB" }, { status: 400 });
  }
  if (memCredits < GENERATE_COST) {
    return NextResponse.json(
      { error: "Insufficient credits", credits: memCredits, max: MAX_CREDITS, brand: "#2563EB" },
      { status: 402 }
    );
  }
  memCredits = Math.max(0, memCredits - GENERATE_COST);
  const jobId = `game_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return NextResponse.json(
    {
      success: true,
      jobId,
      status: "queued",
      prompt,
      cost: GENERATE_COST,
      credits: memCredits,
      max: MAX_CREDITS,
      brand: "#2563EB",
      message: "Game generate queued (stub). Wire to real generator when ready.",
      localStorageKey: "hostamar_game_credits",
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
