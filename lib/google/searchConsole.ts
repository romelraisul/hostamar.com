/**
 * Google Search Console helpers (URL Inspection API).
 * - checkPreferredSourceEligibility: is the page indexed under our domain?
 * - getIndexingStatus: batch inspect.
 * "Preferred Source" itself has no public API yet — eligibility here means
 * "indexed + canonical points at hostamar.com", which is the prerequisite
 * Google documents for Preferred Sources surfacing in Top Stories/AI Overviews.
 * Server-side only.
 */
import { getGoogleAccessToken, getSearchConsoleSiteUrl } from './auth'

const INSPECT_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
const SCOPE = 'https://www.googleapis.com/webmasters.readonly'

export type InspectResult = {
  url: string
  indexed: boolean
  verdict: string
  canonical: string | null
  coverageState: string
  ok: boolean
  error?: string
}

async function inspectUrl(url: string): Promise<InspectResult> {
  try {
    const token = await getGoogleAccessToken(SCOPE)
    const res = await fetch(INSPECT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: getSearchConsoleSiteUrl(),
      }),
    })
    const json: any = await res.json()
    if (!res.ok) {
      return { url, indexed: false, verdict: 'error', canonical: null, coverageState: '', ok: false, error: JSON.stringify(json).slice(0, 300) }
    }
    const idx = json.inspectionResult?.indexStatusResult || {}
    const verdict = idx.verdict || 'UNKNOWN'
    return {
      url,
      indexed: verdict === 'PASS',
      verdict,
      canonical: idx.canonical || null,
      coverageState: idx.coverageState || '',
      ok: true,
    }
  } catch (e: any) {
    return { url, indexed: false, verdict: 'error', canonical: null, coverageState: '', ok: false, error: String(e?.message || e) }
  }
}

export async function checkPreferredSourceEligibility(url: string): Promise<{
  eligible: boolean
  reason: string
  inspection: InspectResult
  preferenceDeeplink: string
}> {
  const inspection = await inspectUrl(url)
  const site = getSearchConsoleSiteUrl().replace(/^scdomain:/, 'https://').replace(/\/$/, '')
  if (!inspection.ok) {
    return { eligible: false, reason: `GSC inspect failed: ${inspection.error}`, inspection, preferenceDeeplink: '' }
  }
  if (!inspection.indexed) {
    return { eligible: false, reason: `not indexed (verdict=${inspection.verdict}, ${inspection.coverageState})`, inspection, preferenceDeeplink: '' }
  }
  const canonicalOk = !inspection.canonical || inspection.canonical.includes(new URL(site).hostname)
  return {
    eligible: canonicalOk,
    reason: canonicalOk ? 'indexed + canonical on-domain — Preferred Source eligible' : `canonical off-domain: ${inspection.canonical}`,
    inspection,
    preferenceDeeplink: `https://www.google.com/preferences/source?q=${encodeURIComponent(new URL(site).hostname)}`,
  }
}

export async function getIndexingStatus(urls: string[]): Promise<InspectResult[]> {
  const slice = urls.slice(0, 15)
  return Promise.all(slice.map(inspectUrl))
}
