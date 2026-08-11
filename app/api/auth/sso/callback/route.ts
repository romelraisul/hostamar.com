import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { signToken } from "@/lib/auth";

const COOKIE_NAME = "auth_token";
const COOKIE_OPTS: Record<string, unknown> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

const TOKEN_URL = process.env.SSO_TOKEN_URL || "https://oauth2.googleapis.com/token";
const USERINFO_URL = process.env.SSO_USERINFO_URL || "https://www.googleapis.com/oauth2/v3/userinfo";
const CLIENT_ID = process.env.SSO_CLIENT_ID!;
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET!;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;
const PROVIDER = process.env.SSO_PROVIDER_NAME || "google";

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string; id_token?: string }> {
  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${err}`);
  }

  return resp.json();
}

async function fetchUserInfo(accessToken: string): Promise<{ sub: string; email: string; name?: string; picture?: string }> {
  const resp = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(`UserInfo fetch failed: ${resp.status}`);
  }

  return resp.json();
}

async function getOrCreateUser(profile: { sub: string; email: string; name?: string; picture?: string }) {
  // Find existing by SSO link
  const existing = await prisma.customer.findFirst({
    where: { ssoId: profile.sub, ssoProvider: PROVIDER },
  });
  if (existing) return existing;

  // Find by email (case-insensitive, link SSO on first login)
  const byEmail = await prisma.customer.findFirst({
    where: { email: { equals: profile.email, mode: 'insensitive' } },
  });
  if (byEmail) {
    return prisma.customer.update({
      where: { id: byEmail.id },
      data: { ssoId: profile.sub, ssoProvider: PROVIDER, emailVerified: new Date() },
    });
  }

  // New user — JIT provision
  const randomPass = crypto.randomUUID();
  const passwordHash = await hash(randomPass, 12);

  return prisma.customer.create({
    data: {
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      password: passwordHash,
      ssoId: profile.sub,
      ssoProvider: PROVIDER,
      emailVerified: new Date(),
      role: "customer",
    },
  });
}

async function signToken_sso(user: { id: string; email: string; name?: string; role: string }) {
  return signToken({
    id: user.id,
    email: user.email,
    name: user.name || user.email.split("@")[0],
    role: user.role,
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const loginUrl = `${req.nextUrl.origin}/login`

  if (error) {
    return Response.redirect(`${loginUrl}?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${loginUrl}?error=missing_code`, 302);
  }

  if (!state) {
    return Response.redirect(`${loginUrl}?error=missing_state`, 302);
  }

  // Validate state against SsoState row created by /api/auth/sso/start.
  // The state must exist, not be expired, and not have been consumed already
  // (consumedAt = CSRF replay protection).
  let mode = "login";
  let ssoState;
  try {
    ssoState = await prisma.ssoState.findUnique({ where: { state } });
  } catch (dbErr) {
    console.error("[sso/callback] SsoState lookup failed, attempting bootstrap:", dbErr);
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SsoState" (
          id          TEXT PRIMARY KEY,
          state       TEXT NOT NULL UNIQUE,
          nonce       TEXT,
          mode        TEXT NOT NULL DEFAULT 'login',
          "customerId" TEXT,
          "expiresAt" TIMESTAMP NOT NULL,
          "consumedAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      ssoState = await prisma.ssoState.findUnique({ where: { state } });
    } catch (bootstrapErr) {
      console.error("[sso/callback] Bootstrap failed:", bootstrapErr);
      return Response.redirect(`${loginUrl}?error=sso_state_db_unavailable`, 302);
    }
  }

  if (!ssoState) {
    return Response.redirect(`${loginUrl}?error=invalid_state`, 302);
  }
  if (ssoState.consumedAt) {
    return Response.redirect(`${loginUrl}?error=state_already_used`, 302);
  }
  if (ssoState.expiresAt.getTime() < Date.now()) {
    return Response.redirect(`${loginUrl}?error=state_expired`, 302);
  }

  mode = ssoState.mode || "login";

  // Mark state consumed (replay protection). Fire-and-log so it never blocks the redirect.
  prisma.ssoState.update({
    where: { state },
    data: { consumedAt: new Date() },
  }).catch((err) => console.warn("[sso/callback] state consume failed:", err.message));

  // Required env check
  const required = ["SSO_TOKEN_URL", "SSO_CLIENT_ID", "SSO_CLIENT_SECRET", "SSO_USERINFO_URL", "NEXTAUTH_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return Response.redirect(`${loginUrl}?error=sso_not_configured&missing=${missing.join(",")}`, 302);
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/sso/callback`;

  try {
    const { access_token, id_token } = await exchangeCodeForToken(code, redirectUri);
    const profile = await fetchUserInfo(access_token);
    let user;
    try {
      user = await getOrCreateUser(profile);
    } catch (dbErr) {
      console.error('SSO DB error:', dbErr instanceof Error ? dbErr.message : dbErr);
      return Response.redirect(`${loginUrl}?error=db_unavailable`, 302);
    }
    const token = await signToken_sso({ id: user.id, email: user.email, role: user.role });

    // Response.redirect returns a Headers object that is IMMUTABLE in Next.js
    // runtime, so we can't call .headers.set() on it. Build the response with
    // headers passed at construction time using NextResponse.redirect().
    const cookieValue = `${COOKIE_NAME}=${token}; ${Object.entries(COOKIE_OPTS).map(([k, v]) => `${k}=${v}`).join("; ")}`;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin'
    const dashboardUrl = `${req.nextUrl.origin}${isAdmin ? '/admin' : '/dashboard'}`
    return NextResponse.redirect(dashboardUrl, {
      status: 302,
      headers: {
        "Set-Cookie": cookieValue,
      },
    });
  } catch (e) {
    // Clean error logging — keeps last 80 chars in URL for browser debugging.
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[sso/callback] failed:", errMsg);
    return NextResponse.redirect(
      `${loginUrl}?error=sso_callback_failed&reason=${encodeURIComponent(errMsg.slice(0, 80))}`,
      { status: 302 }
    );
  }
}
