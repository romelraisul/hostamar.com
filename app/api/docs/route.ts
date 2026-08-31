import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/docs?lang=bn — serve the pre-rendered docs content JSON.
 * Static files stay OUT of the JS bundle (2.5MB EN payload would blow the
 * serverless asset limit); the page fetches this instead.
 */
export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get('lang') === 'bn' ? 'bn' : 'en'
  try {
    const p = join(process.cwd(), 'lib', 'docs', lang === 'bn' ? 'bn' : '', 'content.json')
    const data = readFileSync(p, 'utf-8')
    return new NextResponse(data, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    })
  } catch {
    return NextResponse.json({ sections: [] }, { status: 200 })
  }
}
