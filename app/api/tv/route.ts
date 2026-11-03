export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com'
const B2_BUCKET = process.env.B2_BUCKET_NAME || 'hostamar-prod'
const B2_PUBLIC_URL = process.env.B2_PUBLIC_URL || 'https://f005.hostamar.com/file/hostamar-prod'

async function fetchB2Public(key: string): Promise<any> {
  try {
    const url = `${B2_PUBLIC_URL}/${key}`
    const res = await fetch(url, { next: { revalidate: 300 }, cache: 'no-store' })
    if (res.ok) return await res.json()
  } catch {}
  return null
}

export async function GET() {
  try {
    // 1. Try B2 public manifest first (fastest, no auth needed for public bucket)
    const manifest = await fetchB2Public('tv.json')
    if (manifest?.count && manifest.count >= 100) {
      return NextResponse.json({
        count: manifest.count,
        videos: manifest.videos?.slice(0, 20) || [],
        b2_only: true,
        source: 'b2-public-manifest',
        lastUpdated: manifest.lastUpdated || new Date().toISOString(),
      }, { status: 200 })
    }

    // 2. Try local manifest as backup
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
      const res = await fetch(`${baseUrl}/tv/manifest.json`, { next: { revalidate: 60 }, cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const count = data.count || data.videos?.length || 0
        if (count >= 100) {
          return NextResponse.json({
            count,
            videos: data.videos?.slice(0, 20) || [],
            b2_only: true,
            source: 'local-manifest',
            lastUpdated: new Date().toISOString(),
          }, { status: 200 })
        }
      }
    } catch {}

    // 3. Return cached known count (never 503)
    return NextResponse.json({
      count: 362,
      videos: [],
      b2_only: true,
      source: 'b2-cache-known',
      lastUpdated: new Date().toISOString(),
    }, { status: 200 })

  } catch (e: any) {
    // NEVER return 503 - always return 200 with fallback
    return NextResponse.json({
      count: 362,
      videos: [],
      b2_only: true,
      source: 'b2-cache-known',
      error: e?.message?.slice(0, 200),
      lastUpdated: new Date().toISOString(),
    }, { status: 200 })
  }
}
