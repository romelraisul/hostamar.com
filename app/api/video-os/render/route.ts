import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { script } = await req.json().catch(() => ({}))
  return NextResponse.json({
    brand: 'hostamar.com',
    product: 'Video OS $0.10/min',
    status: 'queued',
    script,
    cdn: 'Hostamar CDN + bKash paywall',
    next: 'Auto YouTube TikTok',
    pc_vps: 'omni.hostamar.com 546 models LIVE',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
