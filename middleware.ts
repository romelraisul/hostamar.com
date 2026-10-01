import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/", "/pricing", "/docs", "/docs/bn", "/blog",
  "/api/health", "/api/v1/models", "/api/docs", "/api/ai-services/catalog",
  "/api/chat", "/api/hermes", "/api/admin/chat", "/api/admin/audit", "/api/admin/health", "/api/admin/models", "/api/video-os/models", "/api/video-os/comfyui",
  "/api/store/checkout",
  "/api/probe-store",
  "/sitemap.xml", "/robots.txt", "/favicon.ico", "/_next", "/static"
];

// ponytail: in-memory sliding window, per-instance ceiling only.
// Fine at Vercel scale (each Lambda is its own bucket). If /api/auth/* traffic
// ever needs cross-instance correctness, swap to Upstash Ratelimit. 10 req/10s
// per IP matches bot-abuse signature without touching real users.
const RL = new Map<string, number[]>();
setInterval(() => { if (RL.size > 5000) RL.clear() }, 60000).unref?.()
function rateLimited(ip: string, limit = 10, windowMs = 10000): boolean {
  const now = Date.now();
  const arr = (RL.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= limit) { RL.set(ip, arr); return true; }
  arr.push(now); RL.set(ip, arr); return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Rate limit auth endpoints — this was the 1M invocation driver
  if (pathname.startsWith("/api/auth")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": "10" } });
    }
  }

  if (pathname.startsWith("/_next") || pathname.includes(".") || PUBLIC_PATHS.some(p => pathname===p || pathname.startsWith(p+"/") || pathname.startsWith(p))) {
    return res;
  }
  const authToken = req.cookies.get("auth_token")?.value;
  if (!authToken && (pathname.startsWith("/dashboard") || pathname.startsWith("/api/"))) {
    if (pathname.startsWith("/api/")) {
      const auto = req.headers.get("x-hostamar-autonomous");
      if (auto && process.env.AUTONOMOUS_SECRET && auto === process.env.AUTONOMOUS_SECRET) return res;
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHENTICATED", hint: "Need auth_token cookie - admin.hostamar.com login" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
