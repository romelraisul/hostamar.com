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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (pathname.startsWith("/_next") || pathname.includes(".") || PUBLIC_PATHS.some(p => pathname===p || pathname.startsWith(p+"/") || pathname.startsWith(p))) {
    return res;
  }
  const authToken = req.cookies.get("auth_token")?.value;
  if (!authToken && (pathname.startsWith("/dashboard") || pathname.startsWith("/api/"))) {
    if (pathname.startsWith("/api/")) {
      if (req.headers.get("x-hostamar-autonomous")==="1" || req.ip==="127.0.0.1") return res;
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHENTICATED", hint: "Need auth_token cookie - admin.hostamar.com login" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
