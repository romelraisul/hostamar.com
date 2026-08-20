import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public hosting status — UptimeRobot mock + BDIX latency
// Brand: #2563EB

const UPTIME = 99.97;
const BADGE_URL =
  "https://img.shields.io/badge/uptime-99.97%25-2563EB?style=flat-square&logo=uptimerobot&logoColor=white";

function bdixLatencyMs(): number {
  // 18-22ms BDIX — random per request to look alive
  return Math.floor(18 + Math.random() * 5); // 18..22 inclusive
}

export async function GET() {
  const latencyMs = bdixLatencyMs();

  return NextResponse.json(
    {
      status: "ok",
      uptime: UPTIME,
      uptimePercent: UPTIME,
      latency: `${latencyMs}ms`,
      latencyMs,
      latency_human: `${latencyMs}ms BDIX`,
      region: "BDIX",
      dc: "Dhaka BDIX",
      badge_url: BADGE_URL,
      badgeUrl: BADGE_URL,
      brand: "#2563EB",
      checkedAt: new Date().toISOString(),
      provider: "Hostamar BDIX — UptimeRobot (mock)",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function HEAD() {
  // lightweight probe
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
