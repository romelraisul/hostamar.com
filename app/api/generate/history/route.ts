import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
 * Generate history — real, DB-backed.
 * Returns the authenticated user's actual generation jobs from the Video
 * table. Unauthenticated callers get an empty list (no fabricated data).
 * Brand: #2563EB
 */

const BRAND = "#2563EB";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitRaw || "10", 10) || 10, 1), 50);

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json(
      { jobs: [], total: 0, limit, brand: BRAND, message: "Log in to see your generation history." },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { customerId: authUser.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          prompt: true,
          title: true,
          status: true,
          url: true,
          thumbnailUrl: true,
          createdAt: true,
        },
      }),
      prisma.video.count({ where: { customerId: authUser.id } }),
    ]);

    const jobs = videos.map((v) => ({
      id: v.id,
      prompt: v.prompt || v.title,
      status:
        v.status === "ready" || v.status === "completed" || v.status === "complete"
          ? "completed"
          : v.status === "failed"
            ? "failed"
            : v.status === "queued"
              ? "queued"
              : "processing",
      model: "hostamar-video",
      createdAt: v.createdAt.toISOString(),
      imageUrl: v.url || undefined,
      thumbUrl: v.thumbnailUrl || undefined,
      brand: BRAND,
    }));

    return NextResponse.json(
      { jobs, total, limit, brand: BRAND },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[generate/history] error:", e?.message || e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
