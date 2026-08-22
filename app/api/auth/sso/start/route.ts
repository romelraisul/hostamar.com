import { NextRequest } from "next/server";
import { env } from '@/lib/env'

export const dynamic = "force-dynamic";

/**
 * OAuth start — defaults to Google OAuth2.
 * SSO_* env vars override for other providers; GOOGLE_CLIENT_ID is the
 * default client id. Redirects to the provider's consent screen.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "login";

  const authorizeUrl =
    env.SSO_AUTHORIZE_URL || "https://accounts.google.com/o/oauth2/v2/auth";
  const clientId = env.SSO_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const appUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!clientId) {
    return new Response(
      JSON.stringify({
        error: "Google sign-in not configured",
        missing: ["GOOGLE_CLIENT_ID"],
      }),
      { status: 501, headers: { "content-type": "application/json" } }
    );
  }

  const state = Buffer.from(JSON.stringify({ mode, ts: Date.now() })).toString("base64url");
  const redirectUri = `${appUrl}/api/auth/sso/callback`;

  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", env.SSO_SCOPE || "openid email profile");
  url.searchParams.set("state", state);
  // Google-specific: prompt for account chooser every time
  if (authorizeUrl.includes("accounts.google.com")) {
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("access_type", "online");
  }

  return Response.redirect(url.toString(), 302);
}
