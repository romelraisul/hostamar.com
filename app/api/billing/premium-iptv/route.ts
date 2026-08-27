import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

const FREE_CHANNELS = [
  '#EXTINF:-1 tvg-name="Channel 1" group-title="Free",Channel 1 Free',
  'https://hostamar.com/hls/tv/index.m3u8',
  '#EXTINF:-1 tvg-name="Channel 2" group-title="Free",Channel 2 Free',
  'https://hostamar.com/hls/tv2/index.m3u8',
]

const PREMIUM_CHANNELS = [
  ...FREE_CHANNELS,
  '#EXTINF:-1 tvg-name="Channel 3 Premium" group-title="Premium",Channel 3 Premium',
  'https://hostamar.com/hls/tv3/index.m3u8',
  '#EXTINF:-1 tvg-name="Channel 4 Premium" group-title="Premium",Channel 4 Premium',
  'https://hostamar.com/hls/tv4/index.m3u8',
  '#EXTINF:-1 tvg-name="Channel 5 Premium" group-title="Premium",Channel 5 Premium',
  'https://hostamar.com/hls/tv5/index.m3u8',
  '#EXTINF:-1 tvg-name="Channel 6 Premium" group-title="Premium",Channel 6 Premium',
  'https://hostamar.com/hls/tv6/index.m3u8',
]

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || req.nextUrl.searchParams.get('key') || ''
  const expected = process.env.API_PUBLIC_KEY || process.env.AGENT_SECRET || ''
  const isPremium = expected && apiKey === expected

  const channels = isPremium ? PREMIUM_CHANNELS : FREE_CHANNELS
  const m3u = ['#EXTM3U', ...channels].join('\n')

  return new NextResponse(m3u, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': isPremium ? 'private, no-cache' : 'public, s-maxage=3600, stale-while-revalidate=600',
      'X-Premium': isPremium ? 'true' : 'false',
    },
  })
}

export async function POST(req: NextRequest) {
  // bKash verification stub - in prod verify via bKash API
  const { trxId, amount } = await req.json().catch(()=>({}))
  if (!trxId || amount < 199) {
    return NextResponse.json({ error: 'Invalid bKash transaction. Amount must be >=199 BDT' }, { status: 400 })
  }
  // TODO: verify with bKash API using BKASH_* env
  return NextResponse.json({ success: true, message: 'Premium activated', key: process.env.API_PUBLIC_KEY?.slice(0,8)+'…' })
}
