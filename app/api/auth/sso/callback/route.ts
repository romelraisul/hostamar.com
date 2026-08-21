import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function htmlRedirect(url: string, cookie?: { name: string; value: string }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting...</title><meta http-equiv="refresh" content="0; url=${url}"></head><body><p>Redirecting to <a href="${url}">${url}</a>...</p></body></html>`;
  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
  if (cookie) {
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
  return res;
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hostamar.com";
  try {
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`, 302);
    }
    if (!code) return new Response("Missing code", { status: 400 });

    // Resolve OAuth config: prefer SSO_* (production), fallback to GOOGLE_* (compat)
    const tokenUrl = process.env.SSO_TOKEN_URL || "https://oauth2.googleapis.com/token";
    const userInfoUrl = process.env.SSO_USERINFO_URL || "https://www.googleapis.com/oauth2/v3/userinfo";
    const clientId = process.env.SSO_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.SSO_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/sso/callback`;

    if (!clientId || !clientSecret) {
      console.error("SSO callback: missing client credentials");
      return NextResponse.redirect(`${baseUrl}/login?error=sso_not_configured`, 302);
    }

    // 1) Exchange code for tokens
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => "");
      console.error("SSO token exchange failed:", tokenRes.status, body);
      return NextResponse.redirect(`${baseUrl}/login?error=sso_token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string | undefined = tokenData.access_token;
    if (!accessToken) {
      console.error("SSO token exchange: no access_token", tokenData);
      return NextResponse.redirect(`${baseUrl}/login?error=sso_no_access_token`, 302);
    }

    // 2) Fetch userinfo
    const userInfoRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoRes.ok) {
      console.error("SSO userinfo failed:", userInfoRes.status, await userInfoRes.text().catch(() => ""));
      return NextResponse.redirect(`${baseUrl}/login?error=sso_userinfo_failed`, 302);
    }
    const googleUser = await userInfoRes.json();
    const email: string | undefined = googleUser.email?.toLowerCase?.() || googleUser.email;
    if (!email) {
      console.error("SSO userinfo: no email", googleUser);
      return NextResponse.redirect(`${baseUrl}/login?error=sso_no_email`, 302);
    }

    // 3) Lookup in DB — must exist, otherwise create as customer (SSO JIT provisioning)
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      // Auto-provision new SSO users as customer (never auto-admin)
      customer = await prisma.customer.create({
        data: {
          email,
          name: googleUser.name || email.split("@")[0],
          password: `sso_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: "customer",
          emailVerified: new Date(),
          credits: 6000, // free credit pool granted at signup
        },
      });
    }

    // 4) Issue our own JWT — use DB role truth (admin for romelraisul@gmail.com if DB says so)
    const token = signToken({
      id: customer.id,
      email: customer.email,
      name: customer.name || googleUser.name || email,
      role: customer.role || "customer",
    });

    const isAdmin = customer.role === "admin" || customer.role === "superadmin";
    const dest = isAdmin ? `${baseUrl}/admin` : `${baseUrl}/dashboard`;
    return htmlRedirect(dest, { name: "auth_token", value: token });
  } catch (err) {
    console.error("SSO callback error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=sso_callback_failed`, 302);
  }
}
