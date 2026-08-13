export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

function base64PngToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

export async function POST(request: NextRequest) {
  try {
    const { url, userId = 'hostamar', sessionKey, tabId, fullPage = false, width, height } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const camofoxHost = process.env.CAMOFOX_HOST || 'http://localhost:9377'
    const base = camofoxHost.replace(/\/$/, '')

    // Reuse existing tab if provided, otherwise create a new one
    let targetTabId = tabId
    if (!targetTabId) {
      const createRes = await fetch(`${base}/tabs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, sessionKey: sessionKey || 'hostamar-default', url, width, height }),
      })

      const createData = (await createRes.json()) as { tabId?: string; error?: string }
      if (!createRes.ok || !createData.tabId) {
        return NextResponse.json({ error: createData.error || 'Failed to create tab' }, { status: 502 })
      }
      targetTabId = createData.tabId
    }

    // Small delay to allow page load when a new tab was just created
    if (!tabId) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    const screenshotUrl = new URL(`${base}/tabs/${encodeURIComponent(targetTabId)}/screenshot`)
    screenshotUrl.searchParams.set('userId', userId)
    if (fullPage) screenshotUrl.searchParams.set('fullPage', 'true')

    const screenshotRes = await fetch(screenshotUrl.toString())
    if (!screenshotRes.ok) {
      const errorBody = await screenshotRes.text().catch(() => 'unknown screenshot error')
      if (screenshotRes.status === 404 || screenshotRes.status === 410) {
        return NextResponse.json({ error: 'Tab not found or browser restarted', detail: errorBody }, { status: 404 })
      }
      return NextResponse.json({ error: 'Screenshot service unavailable. Ensure camofox/canvas service is running.', detail: errorBody }, { status: 502 })
    }

    const contentType = screenshotRes.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await screenshotRes.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Screenshot proxy error:', error)
    return NextResponse.json({ error: 'Internal screenshot error' }, { status: 500 })
  }
}
