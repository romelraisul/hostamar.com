/**
 * Google Indexing API — submit URL_UPDATED notifications so Preferred Sources /
 * Top Stories pick fresh Hostamar content faster.
 * Server-side only. Requires GOOGLE_SERVICE_ACCOUNT_JSON whose client_email is
 * added as a delegated owner in Search Console.
 *
 * NOTE: Google restricts this API to JobPosting/BroadcastEvent pages for some
 * accounts; upstream rejections are surfaced verbatim, never swallowed.
 */
import { getGoogleAccessToken } from './auth'

const ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
const SCOPE = 'https://www.googleapis.com/indexing'

export type IndexingResult = {
  url: string
  ok: boolean
  status: number
  detail: string
}

export async function submitUrlToGoogle(url: string, type: 'URL_UPDATED' | 'URL_INSERTED' = 'URL_UPDATED'): Promise<IndexingResult> {
  try {
    const token = await getGoogleAccessToken(SCOPE)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type }),
    })
    const text = await res.text()
    let detail = text.slice(0, 400)
    try {
      const json = JSON.parse(text)
      detail = json.urlNotificationMetadata?.latestUpdate?.url ? `queued: ${json.urlNotificationMetadata.latestUpdate.url}` : text.slice(0, 400)
    } catch {
      /* keep raw */
    }
    return { url, ok: res.ok, status: res.status, detail }
  } catch (e: any) {
    return { url, ok: false, status: 0, detail: String(e?.message || e) }
  }
}

export async function submitUrlsToGoogle(urls: string[]): Promise<IndexingResult[]> {
  // Indexing API quota is tiny (~200/day default) — cap batch hard
  const slice = urls.slice(0, 20)
  return Promise.all(slice.map((u) => submitUrlToGoogle(u)))
}

/** Deeplink that lets any reader set Hostamar as a Preferred Source manually. */
export function preferredSourceDeeplink(domain = 'hostamar.com'): string {
  return `https://www.google.com/preferences/source?q=${encodeURIComponent(domain)}`
}
