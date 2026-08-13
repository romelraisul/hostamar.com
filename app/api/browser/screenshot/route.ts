export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function base64PngToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, width, height, fullPage } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const target = new URL(url)
    const camofoxHost = process.env.CAMOFOX_HOST || 'http://localhost:4000'
    const userId = `hostamar-${request.ip || 'anon'}-${Date.now()}`
    const sessionKey = `screenshot-${Date.now()}`

    const createTabRes = await fetch(`${camofoxHost}/tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionKey,
        url: target.href,
      }),
    })

    if (!createTabRes.ok) {
      const detail = await createTabRes.text().catch(() => '')
      return NextResponse.json(
        { error: `Failed to create browser tab`, detail },
        { status: 502 }
      )
    }

    const createTabData = await createTabRes.json()
    const tabId = createTabData?.tabId
    if (!tabId) {
      return NextResponse.json(
        { error: 'Browser tab creation returned no tabId' },
        { status: 502 }
      )
    }

    try {
      const screenshotUrl = new URL(`${camofoxHost}/tabs/${encodeURIComponent(tabId)}/screenshot`)
      screenshotUrl.searchParams.set('userId', userId)
      if (fullPage === true) {
        screenshotUrl.searchParams.set('fullPage', 'true')
      }

      const screenshotRes = await fetch(screenshotUrl.toString())
      if (!screenshotRes.ok) {
        return NextResponse.json(
          { error: `Screenshot failed: ${screenshotRes.status}` },
          { status: 502 }
        )
      }

      const buffer = await screenshotRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      return NextResponse.json({ image: base64PngToDataUrl(base64) })
    } finally {
      try {
        await fetch(`${camofoxHost}/tabs/${encodeURIComponent(tabId)}?userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        })
      } catch {
        // best-effort cleanup
      }
    }
  } catch (error: any) {
    console.error('Browser screenshot error:', error)
    return NextResponse.json({ error: 'Invalid request', message: error?.message }, { status: 400 })
  }
}
