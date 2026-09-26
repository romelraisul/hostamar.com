import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    fix: 'SSO sso_callback_failed',
    root_causes: [
      'NEXTAUTH_URL mismatch: must be https://hostamar.com in Vercel env NOT http://127.0.0.1:3001',
      'AUTH_SECRET mismatch: must match between Vercel and local .env.local',
      'Google OAuth Authorized redirect URI missing: https://hostamar.com/api/auth/sso/callback',
      'Cookies not set via Cloudflare Tunnel: SameSite=None Secure required for cross-site',
      'State/PKCE lost: cookie state mismatch between start and callback'
    ],
    checks: [
      'NEXTAUTH_URL must be https://hostamar.com in Vercel env',
      'AUTH_URL same as NEXTAUTH_URL (NextAuth v5)',
      'AUTH_SECRET same in Vercel + local.env.local - generate: openssl rand -base64 32',
      'Google OAuth Authorized redirect URI: https://hostamar.com/api/auth/sso/callback',
      'Cloudflare Tunnel config.yml: hostamar.com -> http://127.0.0.1:3001 with cookies SameSite=None Secure',
      'NextAuth callback /api/auth/callback/* must be public not protected by middleware',
      'Clear cookies + state: delete __Secure-next-auth.state + PKCE cookies'
    ],
    env_template: {
      NEXTAUTH_URL: 'https://hostamar.com',
      AUTH_URL: 'https://hostamar.com',
      AUTH_SECRET: 'openssl rand -base64 32',
      GOOGLE_CLIENT_ID: '***.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: '***',
      NEXTAUTH_SECRET: 'same as AUTH_SECRET'
    },
    vercel_fix: 'vercel env rm NEXTAUTH_URL && vercel env add NEXTAUTH_URL production -> https://hostamar.com && vercel env rm AUTH_URL && vercel env add AUTH_URL production -> https://hostamar.com && vercel deploy --prod',
    cloudflare_fix: 'cloudflared tunnel route dns hostamar-tunnel hostamar.com && check ~/.cloudflared/config.yml ingress hostamar.com service http://127.0.0.1:3001',
    test: 'curl https://hostamar.com/api/auth/providers -> should return google github etc not error'
  })
}

export const runtime = 'edge'
