import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "login";

  const authorizeUrl = process.env.SSO_AUTHORIZE_URL || "https://accounts.google.com/o/oauth2/v2/auth";
  const clientId = process.env.SSO_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!clientId) {
    return new Response(
      JSON.stringify({
        error: "SSO not configured",
        missing: ["SSO_CLIENT_ID"],
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
  url.searchParams.set("scope", process.env.SSO_SCOPE || "openid email profile");
  url.searchParams.set("state", state);
  // Google requires nonce for OIDC
  url.searchParams.set("nonce", crypto.randomUUID());

  return Response.redirect(url.toString(), 302);
}
