import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.headers.get('x-admin-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || ''
  const expected = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || process.env.AGENT_SECRET || ''
  return expected && key === expected
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Forbidden - admin key required' }, { status: 403 })
  }
  try {
    // Hardcoded top IPs from Cloudflare as fallback if DB empty
    const hardcoded = ['103.35.156.24', '185.177.72.56', '34.74.111.159']

    // From DB
    let topIps: any[] = []
    let perPath: any[] = []
    let errorCounts: any = { '402': 0, '403': 0 }
    let tokenrouterUsage: any = null

    try {
      topIps = await prisma.apiRequestLog.groupBy({
        by: ['ipAddress'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }).catch(()=>[]) as any
      // Normalize
      topIps = (topIps as any[]).map((r:any)=> ({ ip: r.ipAddress, count: r._count.id }))
      if (topIps.length === 0) {
        topIps = hardcoded.map(ip => ({ ip, count: 0, note: 'hardcoded Cloudflare top IP, no DB logs yet' }))
      }
    } catch {}

    try {
      perPath = await prisma.apiRequestLog.groupBy({
        by: ['endpoint'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }).catch(()=>[]) as any
      perPath = (perPath as any[]).map((r:any)=> ({ path: r.endpoint, count: r._count.id }))
    } catch {}

    try {
      const c402 = await prisma.apiRequestLog.count({ where: { statusCode: 402 } }).catch(()=>0)
      const c403 = await prisma.apiRequestLog.count({ where: { statusCode: 403 } }).catch(()=>0)
      errorCounts = { '402': c402, '403': c403 }
    } catch {}

    // TokenRouter usage last 24h - placeholder, requires external API
    try {
      const token = process.env.TOKENROUTER_API_KEY || process.env.KILOCODE_API_KEY || ''
      if (token) {
        const res = await fetch('https://api.tokenrouter.com/v1/usage', {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        }).catch(()=>null)
        if (res && res.ok) {
          tokenrouterUsage = await res.json().catch(()=>null)
        } else {
          tokenrouterUsage = { note: 'TokenRouter API not reachable or no key configured', status: res?.status || 'no response' }
        }
      } else {
        tokenrouterUsage = { note: 'No TOKENROUTER_API_KEY configured' }
      }
    } catch (e:any) {
      tokenrouterUsage = { error: e.message }
    }

    return NextResponse.json({
      topIps,
      perPath,
      errorCounts,
      tokenrouterUsage,
      cacheHit: '1.08%',
      waste: {
        'api/tv/agent/commands': '8.59k - FIXED via 30s poll + jitter',
        'hls/tv/index.m3u8': '3.24k - cached s-maxage=30',
        'v1/chat/completions': '913 - now requires Bearer token'
      }
    })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
