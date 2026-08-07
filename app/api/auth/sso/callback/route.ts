import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { hash } from "bcryptjs";

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

  // Find by email (link SSO on first login)
  const byEmail = await prisma.customer.findUnique({
    where: { email: profile.email },
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

async function signToken(user: { id: string; email: string; role: string }) {
  const secret = new TextEncoder().encode(NEXTAUTH_SECRET!);
  return new SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const loginUrl = `${req.nextUrl.origin}/login`;
  const dashboardUrl = `${req.nextUrl.origin}/dashboard`;

  if (error) {
    return Response.redirect(`${loginUrl}?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${loginUrl}?error=missing_code`, 302);
  }

  if (!state) {
    return Response.redirect(`${loginUrl}?error=missing_state`, 302);
  }

  let mode = "login";
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    mode = decoded.mode || "login";
  } catch {
    // ignore malformed state
  }

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
    const token = await signToken({ id: user.id, email: user.email, role: user.role });

    const resp = Response.redirect(dashboardUrl, 302);
    resp.headers.set("Set-Cookie", `${COOKIE_NAME}=${token}; ${Object.entries(COOKIE_OPTS).map(([k, v]) => `${k}=${v}`).join("; ")}`);
    return resp;
  } catch (e) {
    console.error("SSO callback error:", e);
    return Response.redirect(`${loginUrl}?error=sso_callback_failed`, 302);
  }
}
