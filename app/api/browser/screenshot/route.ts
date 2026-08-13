export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright-core'

function base64PngToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

// ---- Steel (cloud) provider: works even when local PC is off ----
async function screenshotWithSteel(url: string, apiKey: string, fullPage: boolean): Promise<Buffer> {
  // 1. Create a cloud browser session
  const createRes = await fetch('https://api.steel.dev/v1/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => '')
    throw new Error(`Steel session create failed (${createRes.status}): ${detail}`)
  }
  const session = (await createRes.json()) as { id?: string; sessionId?: string }
  const sessionId = session.id || session.sessionId
  if (!sessionId) {
    throw new Error('Steel session response missing id')
  }

  let browser
  try {
    // 2. Connect to the remote browser over CDP (no local browser binary needed)
    const cdpUrl = `wss://connect.steel.dev?apiKey=${encodeURIComponent(apiKey)}&sessionId=${encodeURIComponent(sessionId)}`
    browser = await chromium.connectOverCDP(cdpUrl)
    const context = browser.contexts()[0] || (await browser.newContext())
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const buffer = await page.screenshot({ fullPage, type: 'png' })
    return Buffer.from(buffer)
  } finally {
    if (browser) {
      try { await browser.close() } catch {}
    }
    // 3. Release the session so it doesn't keep billing
    try {
      await fetch(`https://api.steel.dev/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    } catch {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, userId = 'hostamar', sessionKey, tabId, fullPage = false, width, height } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const provider = (process.env.BROWSER_PROVIDER || 'local').toLowerCase()

    // ---- Cloud fallback (Steel) ----
    if (provider === 'steel') {
      const steelKey = process.env.STEEL_API_KEY
      if (!steelKey) {
        return NextResponse.json({ error: 'STEEL_API_KEY not configured' }, { status: 500 })
      }
      try {
        const buffer = await screenshotWithSteel(url, steelKey, fullPage)
        return new NextResponse(buffer, {
          status: 200,
          headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
        })
      } catch (e: any) {
        console.error('Steel screenshot error:', e)
        return NextResponse.json({ error: 'Steel screenshot failed', detail: e?.message }, { status: 502 })
      }
    }

    // ---- Local Camofox (default) ----
    const camofoxHost = process.env.CAMOFOX_HOST || 'http://localhost:9377'
    const base = camofoxHost.replace(/\/$/, '')

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
