// Cloudflare Worker — zero-cost API router for hostamar.com
//
// Routing policy:
//   api.hostamar.com  ->  primary  = api-primary.hostamar.com  (Cloudflare Tunnel -> your computer hostamar-app:3000, FREE, primary when up)
//                      ->  fallback = api-fallback.up.railway.app (Railway cold backup, used ONLY when primary fails)
//
// Primary gets 100% of traffic when your computer is up, so Railway receives 0
// requests and (with the auto-pause script) stays paused => $0 cost.
// If the computer/tunnel is down, the Worker fails over to Railway in ~2s and
// the site stays up.
//
// The Worker only PROXIES. It never holds TELEGRAM_BOT_TOKEN / DB creds — those
// live in the VPS/Railway env only.

export default {
  async fetch(request, env) {
    const PRIMARY = 'https://api-primary.hostamar.com' // Cloudflare Tunnel -> your computer (hostamar-app:3000)
    // Railway cold-backup domain. Paste the real <id>.up.railway.app here once
    // the Railway service exists. The Worker calls it ONLY when primary fails,
    // so Railway receives 0 traffic (and 0 cost) when your computer is up.
    const FALLBACK = env.FALLBACK_URL || 'https://web-production-1234d.up.railway.app' // Railway cold backup (real domain)
    const TIMEOUT_MS = 2000

    const url = new URL(request.url)
    const targetPath = url.pathname + url.search

    // Helpers ---------------------------------------------------------------
    const buildOpts = (body) => ({
      method: request.method,
      headers: request.headers,
      // GET/HEAD have no body; for others clone + buffer so we can retry on fallback
      body: request.method !== 'GET' && request.method !== 'HEAD' ? body : undefined,
      redirect: 'follow',
    })

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
        const outHeaders = new Headers(primaryRes.headers)
        outHeaders.set('x-served-by', 'computer-primary')
        const buf = await primaryRes.arrayBuffer()
        return new Response(buf, { status: primaryRes.status, headers: outHeaders })
      }
      // 5xx from primary => treat as failure, fall through to fallback.
      throw new Error('primary returned ' + primaryRes.status)
    } catch (e) {
      clearTimeout(timer)
      try {
        const body =
          request.method !== 'GET' && request.method !== 'HEAD'
            ? await request.clone().arrayBuffer()
            : undefined
        const fallbackRes = await fetch(FALLBACK + targetPath, buildOpts(body))
        // Explicitly build headers (incl. our marker) so Cloudflare propagates it
        // even when the upstream response is a streamed body.
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
  },
}
