/**
 * kilo.ai API client (server-only).
 *
 * Wraps kilo.ai's tRPC usage-analytics surface that we verified:
 *   - https://kilo.ai/api/trpc/usageAnalytics.{getSummary,getTimeseries,getBreakdown,getTable}
 *
 * Auth is via process.env.KILO_API_TOKEN — must NEVER be exposed to the
 * client. All callers of this module must be server-only (no "use client"
 * imports).
 *
 * This client is zero-cost (kilo.ai's analytics are account-billed, not
 * per-request). When the token is missing, callers should treat as "not
 * configured" and surface a 503 to the admin, NOT 500 — that way the
 * admin UI degrade-gracefully until a token is provisioned.
 */
type KiloAnalyticsInput = Record<string, unknown>

type KiloFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; retryable: boolean }

const DEFAULT_BASE = 'https://kilo.ai'

function getBase(): string {
  return process.env.KILO_API_BASE || DEFAULT_BASE
}

function getToken(): string | null {
  const t = process.env.KILO_API_TOKEN
  return t && t.trim().length > 0 ? t.trim() : null
}

/**
 * Call a kilo.ai tRPC analytics procedure.
 *
 * kilo.ai's tRPC surface accepts GET with the input as a `input` query
 * parameter (JSON-encoded). For an empty input, we send the literal
 * `null` so the route's zod schema sees a valid `object|null` envelope.
 */
async function callProcedure<T = unknown>(
  procedure: string,
  input: KiloAnalyticsInput | null = null,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 12_000
): Promise<KiloFetchResult<T>> {
  const token = getToken()
  if (!token) {
    return { ok: false, status: 503, error: 'kilo.ai token not configured', retryable: false }
  }
  const base = getBase()
  const url = new URL(`/api/trpc/${procedure}`, base)
  if (input !== null) {
    // tRPC v11 input envelope: JSON string of { json: <input> }
    url.searchParams.set('input', JSON.stringify({ json: input }))
  } else {
    url.searchParams.set('input', JSON.stringify({ json: null }))
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'hostamar-admin/0.1',
      },
      signal: ctrl.signal,
    })
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408
      return { ok: false, status: res.status, error: text.slice(0, 400) || `kilo.ai HTTP ${res.status}`, retryable }
    }
    try {
      const parsed = JSON.parse(text)
      // tRPC v11 response shape: { result: { data: { json: <payload> } } }
      // or { error: ... } on failure.
      if (parsed && typeof parsed === 'object' && 'result' in parsed) {
        const data = ((parsed as any).result?.data?.json ?? null) as T
        return { ok: true, data }
      }
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        return { ok: false, status: 502, error: JSON.stringify(parsed.error), retryable: false }
      }
      return { ok: true, data: parsed as T }
    } catch (e: any) {
      return { ok: false, status: 502, error: `kilo.ai returned non-JSON: ${e?.message || 'parse'}`, retryable: false }
    }
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'kilo.ai timeout' : e?.message || 'fetch error'
    return { ok: false, status: 504, error: msg, retryable: true }
  } finally {
    clearTimeout(timer)
  }
}

export const kilo = {
  base: () => getBase(),
  isConfigured: () => Boolean(getToken()),
  getSummary: <T = unknown>(input: KiloAnalyticsInput | null = null) =>
    callProcedure<T>('usageAnalytics.getSummary', input),
  getTimeseries: <T = unknown>(input: KiloAnalyticsInput | null = null) =>
    callProcedure<T>('usageAnalytics.getTimeseries', input),
  getBreakdown: <T = unknown>(input: KiloAnalyticsInput | null = null) =>
    callProcedure<T>('usageAnalytics.getBreakdown', input),
  getTable: <T = unknown>(input: KiloAnalyticsInput | null = null) =>
    callProcedure<T>('usageAnalytics.getTable', input),
}

export type { KiloFetchResult }
