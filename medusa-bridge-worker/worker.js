// FORGE medusa-bridge — forwards Vercel SSR checkout traffic to store.hostamar.com
// (tunnel origin). Reason: hostamar.com zone WAF challenges Vercel egress IPs;
// workers.dev egress is not challenged. Path is forwarded verbatim.
//
// V2 (FORGE 2026-09-15 07:4x): self-warm via scheduled(cron). Vercel Hobby
// rejects sub-daily crons (V25 rule), so the keepalive lives HERE — every 15
// min the worker hits its own origin, keeping the isolate + cloudflare tunnel
// + Medusa connection hot. Measured first-buy-of-hour checkout cold = 25.6s
// vs warm 3.9s (prod, 07:42); this kills the cold tax with zero Vercel budget.
export default {
  async fetch(req) {
    const u = new URL(req.url)
    const target = new URL('https://store.hostamar.com' + u.pathname + u.search)
    const headers = new Headers(req.headers)
    headers.set('host', 'store.hostamar.com')
    const res = await fetch(target.toString(), {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      duplex: 'half',
    })
    return new Response(res.body, { status: res.status, headers: res.headers })
  },

  // scheduled handler — CF Workers native cron (free tier, doesn't count as
  // a Vercel deploy, no new service). Warm the isolate + tunnel + Medusa.
  // NOTE: do NOT hammer the zone (store.hostamar.com sits behind CF WAF that
  // 403s challenge-able egress — 09-14 finding); one shallow GET per 15min
  // is nothing, keep it that way.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        fetch('https://store.hostamar.com/health', { signal: AbortSignal.timeout(10_000) })
          .then((r) => r.status)
          .catch(() => 0),
        // V3: hit the REAL buyer-facing catalog URL. Its edge item lapses
        // every s-maxage=300s; a buyer hitting an expired item eats the
        // ~20s blocking origin-fill (08:23: 4x19.7s). A */5 cron landing
        // inside the stale window serves STALE (0.1-0.7s) + refreshes in
        // background, so users never race the fill. Same-zone curl probes
        // of this URL all returned 200 — no WAF challenge risk (CF->CF).
        fetch('https://hostamar.com/api/store/products', { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
          .then((r) => r.status)
          .catch(() => 0),
        // V4: same trick for the services catalog (109 rows, /store + /chat
        // read it). Held at max-age=60/MISS ~1.5s per probe until FORGE's
        // SWR patch ships — keep it hot either way.
        fetch('https://hostamar.com/api/services/catalog', { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
          .then((r) => r.status)
          .catch(() => 0),
      ])
    )
  },
}
