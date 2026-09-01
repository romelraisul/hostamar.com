export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * GET /api/owner-check — honest owner-actions status board (V28).
 *
 * The standing owner actions (FB Page token, GSC service-account JSON, Vercel
 * dashboard runbooks) are HUMAN-LOGIN steps that cannot be automated — the keys
 * are minted in Facebook/Google consoles and exist nowhere on this machine
 * (verified by the V24 335-file env scan). This endpoint reports, live, exactly
 * which branches flip the moment each credential lands — the same HONEST/LIVE
 * pattern as the FB/GSC MCP tools. Never 504s, never leaks values.
 */
export async function GET() {
  const fb = {
    configured: Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    status: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? 'LIVE — fb tools post + real permalink checks' : 'UNAUTHENTICATED (honest 0cr) — owner: facebook.com → Graph API Explorer → Page token → Vercel env FACEBOOK_PAGE_ACCESS_TOKEN',
    runbook: 'docs/v19-audit.md',
  }
  const gsc = {
    configured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    status: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'LIVE — Indexing API URL_UPDATED pings' : 'missing note + Bing ping attempted (honest) — owner: Cloud Console service account → GSC Owner → Vercel env GOOGLE_SERVICE_ACCOUNT_JSON',
    runbook: 'docs/v21-audit.md',
  }
  const aiChain = {
    kilocode: Boolean(process.env.KILOCODE_API_KEY),
    litellm: Boolean(process.env.LITELLM_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    replicate: Boolean(process.env.REPLICATE_API_TOKEN),
    note: 'chain runs on kilocode slots today; missing providers degrade honestly (gradient slides / browser TTS), never fail',
  }
  const deploy = {
    project: 'hostamar-build (single project, all domains)',
    gitPushOnly: 'NEVER vercel --prod --yes from repo',
    crons: 10,
    rewriteV1: '/v1/:path* -> /api/v1/:path*',
    prebuiltFallback: 'local recipe proven (V25-V27) if the git webhook ever stalls again',
    webhookStatus: 'live (bot pushes self-deploy since V25)',
  }
  const dashboards = {
    runbook: 'docs/v23-audit.md',
    items: [
      'Vercel Settings → Git: reconnect if builds ever stop firing',
      'Vercel Settings → Remote Caching: enable',
      'Vercel Security → Firewall: rate-limit /api/* + block empty UA',
      'Vercel Usage → Alerts: 75% quota thresholds',
      'Cloudflare: Cache Rules + Bot Fight Mode',
    ],
  }

  return NextResponse.json(
    {
      ok: true,
      fb,
      gsc,
      aiChain,
      deploy,
      dashboards,
      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
