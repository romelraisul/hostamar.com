import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code) return new Response("Missing code", { status: 400 });

  // TODO: exchange code -> token with your IdP
  // const res = await fetch(process.env.SSO_TOKEN_URL!, { method: "POST", body: ... })
  // For now, stub that issues same auth_token format your /api/auth/login uses

  // Example stub - replace with real token exchange when IdP exists:
  if (!process.env.SSO_TOKEN_URL) {
    // dev stub: redirect to login with message, don't crash
    return Response.redirect(`/login?error=sso_not_configured&state=${state}`, 302);
  }

  return Response.redirect("/", 302);
}
