// Cloudflare Worker — thin failover router for api.hostamar.com (layer 1).
//
//   api.hostamar.com  ->  PRIMARY   = your computer via Cloudflare Tunnel (env PRIMARY_URL)
//                      ->  FALLBACK = hostamar.alwaysdata.net lite API (env FALLBACK_URL)
//
// The Worker ONLY proxies — no app logic, no secrets, CPU far under the free
// 10ms limit. When the PC is off/tunnel down, a circuit breaker skips the 2s
// primary timeout so failover is instant and callers get the Alwaysdata
// {"status":"PC offline, your request is queued"} 202 instead of a 502.
//
// Repoint either origin without a redeploy:
//   npx wrangler secret put PRIMARY_URL   (e.g. a new tunnel hostname)
//   npx wrangler secret put FALLBACK_URL  (e.g. back to a full-app origin)

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

export default {
  async fetch(request, env) {
    const PRIMARY = ((env && env.PRIMARY_URL) || DEFAULT_PRIMARY).replace(/\/+$/, '')
    const FALLBACK = ((env && env.FALLBACK_URL) || DEFAULT_FALLBACK).replace(/\/+$/, '')
    const url = new URL(request.url)
    const targetPath = url.pathname + url.search

    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.clone().arrayBuffer()
        : undefined
    const opts = { method: request.method, headers: request.headers, body, redirect: 'follow' }

    const serveFallback = async () => {
      try {
        const res = await fetch(FALLBACK + targetPath, opts)
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
      const res = await fetch(PRIMARY + targetPath, { ...opts, signal: controller.signal })
      clearTimeout(timer)
      if (res.status < 500) {
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
