import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  return NextResponse.json({ playlist: ['https://hostamar.com/hls/tv/index.m3u8'] }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
