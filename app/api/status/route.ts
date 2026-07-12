// /api/status — PUBLIC status summary (no auth). Returns green/yellow/red per
// product derived from the Tier1 checks. Cached 30s at the route layer.
import { NextResponse } from 'next/server'
import { runAllChecks } from '@/lib/support/checks'

export const runtime = 'nodejs'
export const revalidate = 30 // cache 30s

// Map infra services -> the 7 Hostamar products (+ app platform).
const PRODUCT_MAP: Record<string, string[]> = {
  app: ['app', 'hosting', 'browser', 'ide', 'game'],
  postgres: ['hosting', 'video'],
  redis: ['app', 'browser'],
  livekit: ['voice'],
  saml: ['SSO'],
  nginx: ['app'],
}

export async function GET() {
  let checks: Awaited<ReturnType<typeof runAllChecks>> = []
  try {
    checks = await runAllChecks()
  } catch {
    checks = []
  }

  const statusByService: Record<string, 'green' | 'yellow' | 'red'> = {}
  for (const c of checks) statusByService[c.service] = c.status

  // Per-product worst-status rollup.
  const products = ['app', 'video', 'voice', 'hosting', 'SSO', 'browser', 'ide', 'game']
  const productStatus: Record<string, 'green' | 'yellow' | 'red'> = {}
  for (const p of products) {
    const services = Object.entries(PRODUCT_MAP).filter(([, ps]) => ps.includes(p)).map(([s]) => s)
    const states = services.map((s) => statusByService[s]).filter(Boolean)
    productStatus[p] = states.includes('red') ? 'red' : states.includes('yellow') ? 'yellow' : 'green'
  }

  return NextResponse.json(
    { products: productStatus, checks, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  )
}
