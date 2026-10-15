import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// SECURITY FIX 2026-10-15: the old guard was dead code — PUBLIC_PATHS contains "/"
// and the match used startsWith(p), so every path (incl. /dashboard) matched and
// the auth check never ran. /dashboard/videos rendered the credits dashboard to
// anonymous visitors. Scopes below are deliberate: only routes known to serve
// customer data are cookie-gated here; every other /api/* route keeps its own
// internal auth (API-key/session checks) so nothing else changes behavior.
const PAGE_PROTECTED = "/dashboard";
// SECURITY FIX 2026-10-15 #2: /admin pages were serving customer emails +
// video rows to anonymous visitors (page-level gate existed only for
// /dashboard). Same cookie gate extended to /admin pages.
const ADMIN_PAGE_PROTECTED = "/admin";
const API_PROTECTED = ["/api/dashboard/", "/api/admin/"];
// Admin endpoints that are intentionally public (unchanged from previous behavior).
const ADMIN_PUBLIC = ["/api/admin/chat", "/api/admin/audit", "/api/admin/health", "/api/admin/models", "/api/video-os/"];
// Dashboard nodes route is an infrastructure health beacon, not customer data.
const DASH_API_PUBLIC = ["/api/dashboard/nodes"];

// MIGRATION 2026-10-15: comfy.hostamar.com subdomain removed. Video OS is now
// same-origin on hostamar.com — middleware proxies these paths from the edge
// to the WSL :8199 backend (cloudflared tunnel), streaming the response back.
// Same-origin = host-only SameSite=Lax cookie just works; no CORS, no Domain
// attr, no SameSite=None, login loop structurally impossible.
// comfy.hostamar.com remains a BACKEND-ONLY hostname (tunnel ingress kept);
// browsers never hit it directly anymore.
const COMFY_BACKEND = "https://comfy.hostamar.com";
const VIDEO_OS_PAGE = "/video-os";
const COMFY_PROXY = ["/video-os", "/api/comfy", "/view", "/api/sign"];

// ponytail: in-memory sliding window, per-instance ceiling only.
// Fine at edge scale (each isolate is its own bucket). If /api/auth/* traffic
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

  // Same-origin proxy to the Video OS backend (comfy tunnel). Everything is
  // served under hostamar.com — the browser only ever talks to this domain.
  if (COMFY_PROXY.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"))) {
    // /video-os is the human UI → require login at the edge (redirect);
    // API paths stay unauthenticated here — the backend enforces JWT/401 itself.
    if (pathname === VIDEO_OS_PAGE || pathname.startsWith(VIDEO_OS_PAGE + "/")) {
      if (!req.cookies.get("auth_token")?.value) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      // /video-os/* → backend /* (UI lives at / on :8199)
      const rest = pathname === VIDEO_OS_PAGE ? "/" : pathname.slice(VIDEO_OS_PAGE.length);
      return NextResponse.rewrite(new URL(COMFY_BACKEND + rest + req.nextUrl.search));
    }
    return NextResponse.rewrite(new URL(COMFY_BACKEND + pathname + req.nextUrl.search));
  }

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

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return res;
  }

  const needsAuth =
    pathname === PAGE_PROTECTED || pathname.startsWith(PAGE_PROTECTED + "/") ||
    pathname === ADMIN_PAGE_PROTECTED || pathname.startsWith(ADMIN_PAGE_PROTECTED + "/") ||
    API_PROTECTED.some(p => pathname.startsWith(p));
  const isPublicApi =
    ADMIN_PUBLIC.some(p => pathname.startsWith(p)) ||
    DASH_API_PUBLIC.some(p => pathname.startsWith(p));

  if (needsAuth && !isPublicApi && !req.cookies.get("auth_token")?.value) {
    if (pathname.startsWith("/api/")) {
      const auto = req.headers.get("x-hostamar-autonomous");
      if (auto && process.env.AUTONOMOUS_SECRET && auto === process.env.AUTONOMOUS_SECRET) return res;
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHENTICATED", hint: "Need auth_token cookie - hostamar.com/login" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
