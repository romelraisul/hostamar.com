// Cloudflare Worker — zero-cost API router for hostamar.com
//
// Routing policy:
//   api.hostamar.com  ->  primary  = api-primary.hostamar.com  (Cloudflare Tunnel -> your computer hostamar-app:3000, FREE, primary when up)
//                      ->  fallback = api-fallback.up.railway.app (Railway cold backup, used ONLY when primary fails)
//
// Primary gets 100% of traffic when your computer is up, so Railway receives 0
// requests and (with the auto-pause script) stays paused => $0 cost.
// If the computer/tunnel is down, the Worker fails over to Railway, and a
// circuit breaker short-circuits straight to fallback (no 2s wait per request)
// so users never see a 502 during a primary flap.
//
// The Worker only PROXIES. It never holds TELEGRAM_BOT_TOKEN / DB creds — those
// live in the VPS/Railway env only.
//
// Optional hardening (set as Worker secrets / vars):
//   FALLBACK_URL     — Railway cold-backup domain (default below)
//   UNPAUSE_HOOK_URL — a URL on your computer that unpauses Railway immediately
//                      when the Worker detects sustained primary failure (so the
//                      fallback is warm before traffic arrives). Can be empty.

const PRIMARY = 'https://api-primary.hostamar.com' // Cloudflare Tunnel -> your computer (hostamar-app:3000)
const TIMEOUT_MS = 2000

// --- Circuit breaker (in-memory, per Worker instance) ----------------------
// After PRIMARY_FAILURE_THRESHOLD consecutive primary failures, we enter
// "fallback-only" mode for CIRCUIT_OPEN_MS and stop waiting on the dead primary.
const PRIMARY_FAILURE_THRESHOLD = 2
const CIRCUIT_OPEN_MS = 60_000
let consecutivePrimaryFails = 0
let circuitOpenUntil = 0

const primaryHealthy = () => Date.now() < circuitOpenUntil
const recordPrimaryFail = () => {
  consecutivePrimaryFails++
  if (consecutivePrimaryFails >= PRIMARY_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS
    consecutivePrimaryFails = 0
  }
}
const recordPrimarySuccess = () => { consecutivePrimaryFails = 0 }

// Fire-and-forget wake-up of Railway so the fallback is warm during a flap.
async function wakeRailway(env) {
  const url = (env.UNPAUSE_HOOK_URL || '').trim()
  if (!url) return
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"action":"unpause-railway"}' })
  } catch (_) { /* best effort */ }
}

export default {
  async fetch(request, env) {
    const FALLBACK = (env.FALLBACK_URL || 'https://web-production-1234d.up.railway.app').trim() // Railway cold backup (real domain)
    const url = new URL(request.url)
    const targetPath = url.pathname + url.search

    const buildOpts = (body) => ({
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? body : undefined,
      redirect: 'follow',
    })

    const serveFallback = async (body, markerNote) => {
      try {
        const fallbackRes = await fetch(FALLBACK + targetPath, buildOpts(body))
        const outHeaders = new Headers(fallbackRes.headers)
        outHeaders.set('x-served-by', 'railway-fallback')
        const buf = await fallbackRes.arrayBuffer()
        return new Response(buf, { status: fallbackRes.status, headers: outHeaders })
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'both origins unreachable', detail: String(err) }),
          { status: 502, headers: { 'content-type': 'application/json' } }
        )
      }
    }

    // Circuit is open -> go straight to fallback (no 2s wait on dead primary).
    if (primaryHealthy()) {
      return serveFallback(
        request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : undefined
      )
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const body =
        request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.clone().arrayBuffer()
          : undefined

      const primaryRes = await fetch(PRIMARY + targetPath, {
        ...buildOpts(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      // Serve from primary on success OR any non-5xx (let app handle 4xx).
      if (primaryRes.ok || primaryRes.status < 500) {
        recordPrimarySuccess()
        const outHeaders = new Headers(primaryRes.headers)
        outHeaders.set('x-served-by', 'computer-primary')
        const buf = await primaryRes.arrayBuffer()
        return new Response(buf, { status: primaryRes.status, headers: outHeaders })
      }
      // 5xx from primary => treat as failure, fall through to fallback.
      throw new Error('primary returned ' + primaryRes.status)
    } catch (e) {
      clearTimeout(timer)
      recordPrimaryFail()
      // On a flap, ask the computer to wake Railway so fallback is warm.
      if (consecutivePrimaryFails >= PRIMARY_FAILURE_THRESHOLD - 1 || primaryHealthy()) {
        wakeRailway(env)
      }
      return serveFallback(
        request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : undefined
      )
    }
  },
}
