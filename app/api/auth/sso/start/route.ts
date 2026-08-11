import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "login";

  const authorizeUrl = process.env.SSO_AUTHORIZE_URL || "https://accounts.google.com/o/oauth2/v2/auth";
  const clientId = process.env.SSO_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json(
      { error: "SSO not configured", missing: ["SSO_CLIENT_ID"] },
      { status: 501 }
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${appUrl}/api/auth/sso/callback`;

  // Persist state to DB for CSRF protection
  try {
    await prisma.ssoState.create({
      data: {
        state,
        mode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });
  } catch (dbErr) {
    console.error("[sso/start] Failed to persist state:", dbErr);
    return NextResponse.json({ error: "Failed to initiate SSO" }, { status: 500 });
  }

  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.SSO_SCOPE || "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", crypto.randomUUID());

  return Response.redirect(url.toString(), 302);
}
