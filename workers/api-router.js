// Cloudflare Worker — thin failover router for api.hostamar.com (layer 1).
//
//   api.hostamar.com  ->  PRIMARY   = your computer via Cloudflare Tunnel (PRIMARY_URL)
//                      ->  FALLBACK = hostamar.alwaysdata.net lite API (FALLBACK_URL)
//
// The Worker ONLY proxies — no app logic, no secrets exposed to callers. When the
// PC is off/tunnel down, a circuit breaker skips the 2s primary timeout so
// failover is instant and callers get the Alwaysdata
// {"status":"PC offline, your request is queued"} 202 instead of a 502.
//
// Repoint either origin without a redeploy:
//   npx wrangler secret put PRIMARY_URL   (e.g. https://api-primary.hostamar.com)
//   npx wrangler secret put FALLBACK_URL  (e.g. back to a full-app origin)
//
// Auth for the primary origin (2026-11-05, kilocode isolate):
// When PRIMARY_API_KEY is set the Worker sends `Authorization: Bearer <key>`
// to the primary only — the key lives in a Wrangler secret so it is never
// public and never reaches the fallback. Use it when the primary is a
// single-user proxy (freellmapi/omniroute) that rejects unauthenticated
// requests; leave it unset for a no-auth origin (e.g. nvidia-guard :12436).
// cloudflared cannot inject originRequest.headers (validated), so the key must
// live here in the Worker.

const DEFAULT_PRIMARY = 'https://api-primary.hostamar.com'
const DEFAULT_FALLBACK = 'https://hostamar.alwaysdata.net'
const TIMEOUT_MS = 2000

// Circuit breaker: after 2 consecutive primary failures, go straight to
// fallback for 60s (no per-request 2s wait on a dead primary).
const PRIMARY_FAILURE_THRESHOLD = 2
const CIRCUIT_OPEN_MS = 60_000
let consecutivePrimaryFails = 0
let circuitOpenUntil = 0

const circuitOpen = () => Date.now() < circuitOpenUntil
const recordPrimaryFail = () => {
  consecutivePrimaryFails++
  if (consecutivePrimaryFails >= PRIMARY_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS
    consecutivePrimaryFails = 0
  }
}
const recordPrimarySuccess = () => { consecutivePrimaryFails = 0 }

// A 401/403 from the primary is a misconfigured key, not a "real" response:
// treat it as a primary failure so the lite fallback answers instead of
// leaking an auth error to every website user.
const isPrimaryHealthy = (status) => status < 500 && status !== 401 && status !== 403

export default {
  async fetch(request, env) {
    const PRIMARY = ((env && env.PRIMARY_URL) || DEFAULT_PRIMARY).replace(/\/+$/, '')
    const FALLBACK = ((env && env.FALLBACK_URL) || DEFAULT_FALLBACK).replace(/\/+$/, '')
    const PRIMARY_API_KEY = (env && env.PRIMARY_API_KEY) || ''
    const url = new URL(request.url)
    const targetPath = url.pathname + url.search

    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.clone().arrayBuffer()
        : undefined

    // Primary gets the caller's headers plus the origin's bearer (when set).
    const primaryHeaders = new Headers(request.headers)
    if (PRIMARY_API_KEY) primaryHeaders.set('Authorization', `Bearer ${PRIMARY_API_KEY}`)
    const primaryOpts = { method: request.method, headers: primaryHeaders, body, redirect: 'follow' }

    // The fallback is a public lite API — never forward the origin's key to it.
    const fallbackHeaders = new Headers(request.headers)
    fallbackHeaders.delete('Authorization')
    const fallbackOpts = { method: request.method, headers: fallbackHeaders, body, redirect: 'follow' }

    const serveFallback = async () => {
      try {
        const res = await fetch(FALLBACK + targetPath, fallbackOpts)
        const headers = new Headers(res.headers)
        headers.set('x-served-by', 'alwaysdata-lite')
        return new Response(await res.arrayBuffer(), { status: res.status, headers })
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'both origins unreachable', detail: String(err) }),
          { status: 502, headers: { 'content-type': 'application/json' } }
        )
      }
    }

    if (circuitOpen()) return serveFallback()

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(PRIMARY + targetPath, { ...primaryOpts, signal: controller.signal })
      clearTimeout(timer)
      if (isPrimaryHealthy(res.status)) {
        recordPrimarySuccess()
        const headers = new Headers(res.headers)
        headers.set('x-served-by', 'computer-primary')
        return new Response(await res.arrayBuffer(), { status: res.status, headers })
      }
      throw new Error('primary returned ' + res.status)
    } catch (_) {
      clearTimeout(timer)
      recordPrimaryFail()
      return serveFallback()
    }
  },
}
