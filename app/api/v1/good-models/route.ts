import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json({ brand: 'hostamar.com', object: 'list', data: [], count: 0, error: 'no-redis' })
  }
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  const good = await redis.get('omnirouter:good-models').catch(() => null) as any[] | null
  return NextResponse.json({
    brand: 'hostamar.com',
    object: 'list',
    data: good || [],
    count: good?.length || 0,
    source: 'self-heal-hourly GLM:18791 fallback',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
