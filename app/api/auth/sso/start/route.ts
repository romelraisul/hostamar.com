import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ensureSsoStateTable() {
  const exists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'SsoState'
    ) as exists
  `
  if (exists[0]?.exists) return

  console.log("[sso] Creating SsoState table...")
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
  `)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SsoState_state_idx" ON "SsoState" (state)`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SsoState_expiresAt_idx" ON "SsoState" ("expiresAt")`)
  console.log("[sso] SsoState table created")
}

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

  // Self-bootstrap: ensure table exists, then persist state
  try {
    await ensureSsoStateTable()
    await prisma.ssoState.create({
      data: {
        state,
        mode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })
  } catch (dbErr) {
    console.error("[sso/start] Failed to persist state:", dbErr)
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
