/**
 * Bing Webmaster Tools API (JSON protocol, apikey auth).
 * Server-side only. Requires BING_WEBMASTER_API_KEY.
 * Docs: https://www.bing.com/webmasters/help/webmaster-api-66a14e98
 */

const BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

export function hasBingKey(): boolean {
  return !!process.env.BING_WEBMASTER_API_KEY
}

export function bingSiteUrl(): string {
  return process.env.BING_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
}

export type BingSubmitResult = {
  ok: boolean
  status: number
  detail: string
}

export async function submitUrlsToBing(urls: string[]): Promise<BingSubmitResult> {
  const key = process.env.BING_WEBMASTER_API_KEY
  if (!key) return { ok: false, status: 0, detail: 'BING_WEBMASTER_API_KEY missing' }
  const siteUrl = bingSiteUrl()
  // SubmitUrlBatch caps at 500 URLs/site/day, max 100 per call
  const urlList = urls.slice(0, 100)
  try {
    const res = await fetch(`${BASE}/SubmitUrlBatch?apikey=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl, urlList }),
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, detail: text.slice(0, 300) }
  } catch (e: any) {
    return { ok: false, status: 0, detail: String(e?.message || e) }
  }
}

export type BingStats = {
  ok: boolean
  crawlStats?: any
  detail: string
}

export async function getBingStats(): Promise<BingStats> {
  const key = process.env.BING_WEBMASTER_API_KEY
  if (!key) return { ok: false, detail: 'BING_WEBMASTER_API_KEY missing' }
  const siteUrl = bingSiteUrl()
  try {
    const res = await fetch(
      `${BASE}/GetCrawlStats?apikey=${encodeURIComponent(key)}&siteUrl=${encodeURIComponent(siteUrl)}`,
      { method: 'GET' }
    )
    const json: any = await res.json()
    if (!res.ok) return { ok: false, detail: JSON.stringify(json).slice(0, 300) }
    return { ok: true, crawlStats: json.d || json, detail: 'ok' }
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e) }
  }
}
