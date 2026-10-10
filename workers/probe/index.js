/**
 * hostamar-probe — off-box watchdog for hostamar.com (Cloudflare Worker + Cron Trigger).
 *
 * WHY THIS EXISTS ALONGSIDE .github/workflows/external-probe.yml
 * The GitHub Actions workflow implements the same verdict, but this repo's `schedule`
 * events are not being delivered (measured 2026-10-10: tv-fallback.yml `*​/15` last ran on
 * cron 2h20m earlier, model-heal.yml 13 days earlier, external-probe.yml zero scheduled
 * runs in 104 min while workflow_dispatch worked instantly). GitHub's cron is documented as
 * best-effort, but hours of drift makes it useless as a "the box died while you were asleep"
 * alarm. A Worker Cron Trigger runs on Cloudflare's scheduler, which fires on time
 * (measured here: 15 checks in 75 min, every 5 min to the second).
 *
 * TWO INDEPENDENT BOX SIGNALS, because they fail at different speeds:
 *   1. tunnel probe  — fetch a service that only exists on the box, through the tunnel
 *      (decisions.hostamar.com/health). A dead box/tunnel answers 502/530/timeout within one
 *      tick, so this is the fast path. One failed tick is not enough (a CF edge hiccup should
 *      not page anyone): the alert needs TWO consecutive failures.
 *   2. heartbeat age — `pc.alive` in /api/health, i.e. the box's own report to Turso
 *      (fleet/loop.mjs, every ~5 min) younger than HOSTAMAR_PC_MAX_AGE_S. Slower (~15-20 min)
 *      but works even when the tunnel answers and the box's internals are wedged.
 *   The first implementation had only (2) and took ~19 min to notice a real host crash.
 *
 * VERDICTS
 *   UP                       site + database + box all healthy
 *   UP:edge_challenged       public URL was bot-challenged, workers.dev fallback answered 200
 *   DEGRADED:tunnel_down     box/tunnel did not answer twice in a row      <-- fast
 *   DEGRADED:pc_off          no box heartbeat inside the staleness window  <-- slow, catches wedges
 *   DOWN:*                   worker / database / DNS actually broken
 *
 * Blind spot, stated on purpose: this runs inside the same Cloudflare account as the site, so a
 * Cloudflare-wide outage silences the probe too. The GitHub workflow covers that case when it
 * runs; for a third-party view use a dedicated monitor (see ops/external-probe-setup.md).
 *
 * Diagnostics without waiting for a tick: GET /?check=1 runs one check and returns the verdict
 * (never alerts). GET / returns the stored state, which is how the cron was verified to fire.
 */

const STATE_KEY = 'probe:state'
const REALERT_AFTER_MS = 30 * 60 * 1000 // while still bad, don't spam: re-alert every 30 min
const TUNNEL_FAILS_TO_ALERT = 2 // consecutive failed tunnel probes before believing it

function challengeish(body) {
  return /just a moment|cf-mitigated|challenge-platform|_cf_chl/i.test(body || '')
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'hostamar-probe/1.0 (cloudflare-cron)' },
    cf: { cacheTtl: 0 },
  })
  const body = await res.text()
  let json = null
  try {
    json = JSON.parse(body)
  } catch {
    /* challenge page, error page or empty body */
  }
  return { code: res.status, challenged: challengeish(body) && !json, json }
}

function judgeHealth(health) {
  if (!health || !health.json) return 'DOWN:bad_payload'
  const d = health.json
  if (d.status !== 'healthy') return 'DOWN:bad_payload'
  if (d.database && d.database.connected === false) return 'DOWN:db_disconnected'
  if (d.pc && d.pc.alive === false) return 'DEGRADED:pc_off'
  return 'UP'
}

function isBad(verdict) {
  return !String(verdict).startsWith('UP')
}

async function probeTunnel(env) {
  const started = Date.now()
  try {
    const res = await fetchJson(env.TUNNEL_URL)
    const down = [502, 503, 530, 522, 524].includes(res.code) || res.code === 0
    return { code: res.code, down, challenged: res.challenged, ms: Date.now() - started }
  } catch (e) {
    return { code: 0, down: true, challenged: false, ms: Date.now() - started, error: String(e) }
  }
}

async function notify(env, text) {
  const results = []
  if (env.SLACK_WEBHOOK_URL) {
    try {
      const r = await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      results.push(`slack=${r.status}`)
    } catch (e) {
      results.push(`slack=error:${e}`)
    }
  } else {
    results.push('slack=unset')
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          disable_web_page_preview: true,
        }),
      })
      const j = await r.json().catch(() => ({}))
      results.push(`telegram=${r.status}${j && j.ok === false ? ':' + j.description : ''}`)
    } catch (e) {
      results.push(`telegram=error:${e}`)
    }
  } else {
    results.push('telegram=unset')
  }
  return results.join(' ')
}

async function runCheck(env) {
  const started = Date.now()
  let verdict = null
  let edge = 'direct'
  let observed = null

  let pub = null
  try {
    pub = await fetchJson(env.PUBLIC_URL)
  } catch (e) {
    pub = { code: 0, challenged: false, json: null, error: String(e) }
  }
  observed = pub

  if (pub.json && pub.code === 200) {
    verdict = judgeHealth(pub)
  } else if (pub.challenged) {
    edge = 'challenged'
    try {
      const fb = await fetchJson(env.WORKER_URL)
      observed = fb
      verdict = fb.code === 200 ? judgeHealth(fb) : `DOWN:fallback_http_${fb.code}`
    } catch (e) {
      verdict = `DOWN:fallback_error:${e}`
    }
  } else {
    // 000 (no route / dead tunnel) or any non-200 that is not a challenge
    try {
      const fb = await fetchJson(env.WORKER_URL)
      observed = fb
      verdict = fb.code === 200 ? `DOWN:public_http_${pub.code}` : `DOWN:http_${pub.code}_fallback_${fb.code}`
    } catch (e) {
      verdict = `DOWN:http_${pub.code}`
    }
  }

  // Fast path: ask the box through the tunnel whenever the site itself looks fine.
  const tunnel = await probeTunnel(env)
  if (tunnel.down && !tunnel.challenged && verdict === 'UP') {
    verdict = 'DEGRADED:tunnel_down_pending' // promoted to the real verdict by the caller's counter
  }

  if (env.FORCE_DOWN === '1' && !isBad(verdict)) verdict = 'DOWN:forced_test'

  const pc = (observed && observed.json && observed.json.pc) || null
  return { verdict, edge, code: observed && observed.code, pc, tunnel, ms: Date.now() - started }
}

async function runAndRecord(env, { alert }) {
  const result = await runCheck(env)
  const now = Date.now()
  const state = (await env.PROBE_STATE.get(STATE_KEY, 'json')) || {
    checks: 0,
    lastVerdict: null,
    lastAlertAt: 0,
    lastRecoverAt: 0,
    consecutiveTunnelFail: 0,
  }

  // Promote a repeated tunnel failure into a real verdict. Two consecutive failures are
  // required so a single CF edge hiccup does not page anyone.
  const tunnelFails = result.tunnel && result.tunnel.down && !result.tunnel.challenged
    ? (state.consecutiveTunnelFail || 0) + 1
    : 0
  if (result.verdict === 'DEGRADED:tunnel_down_pending') {
    result.verdict = tunnelFails >= TUNNEL_FAILS_TO_ALERT ? 'DEGRADED:tunnel_down' : 'UP:tunnel_blip'
  }

  const wasBad = state.lastVerdict ? isBad(state.lastVerdict) : false
  const nowBad = isBad(result.verdict)
  let alerted = null

  if (alert && nowBad) {
    const firstTime = !wasBad
    const stale = now - (state.lastAlertAt || 0) > REALERT_AFTER_MS
    if (firstTime || stale) {
      const label = result.verdict === 'DOWN:forced_test'
        ? '[TEST] :red_circle: hostamar probe alert path check (forced)'
        : result.verdict === 'DEGRADED:tunnel_down'
          ? ':large_yellow_circle: hostamar.com DEGRADED — home box/tunnel not answering (site itself serving)'
          : result.verdict === 'DEGRADED:pc_off'
            ? ':large_yellow_circle: hostamar.com DEGRADED — no box heartbeat, home box unreachable, site itself serving'
            : ':red_circle: hostamar.com DOWN'
      const detail = `tunnel=${result.tunnel ? result.tunnel.code : 'n/a'} pcAge=${result.pc ? result.pc.ageSeconds : 'n/a'}s`
      alerted = await notify(env, `${label} (${result.verdict}, edge=${result.edge}, ${detail}) — Cloudflare-cron probe at ${new Date(now).toISOString()}`)
      state.lastAlertAt = now
    }
  }
  if (alert && !nowBad && wasBad) {
    alerted = await notify(env, `:white_check_mark: hostamar.com recovered (${result.verdict}) — Cloudflare-cron probe at ${new Date(now).toISOString()}`)
    state.lastRecoverAt = now
  }

  const next = {
    ...state,
    checks: (state.checks || 0) + 1,
    lastVerdict: result.verdict,
    lastCheckAt: new Date(now).toISOString(),
    lastEdge: result.edge,
    lastHttpCode: result.code,
    lastPc: result.pc,
    lastTunnel: result.tunnel,
    consecutiveTunnelFail: tunnelFails,
    lastDurationMs: result.ms,
    // keep the previous delivery result until a new alert replaces it, so the last alert's
    // channel status stays readable after the fact
    lastAlerted: alerted || state.lastAlerted || null,
  }
  await env.PROBE_STATE.put(STATE_KEY, JSON.stringify(next))
  return { result, state: next }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAndRecord(env, { alert: true }))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.searchParams.get('check') === '1') {
      // diagnostics only: never alerts, so this endpoint stays safe to call by hand
      const result = await runCheck(env)
      return Response.json({ mode: 'check-only', ...result }, { headers: { 'cache-control': 'no-store' } })
    }
    if (url.pathname === '/' || url.pathname === '') {
      const state = (await env.PROBE_STATE.get(STATE_KEY, 'json')) || { note: 'no check recorded yet' }
      return Response.json(
        {
          what: 'off-box watchdog for hostamar.com (cron */5). GET /?check=1 to probe now.',
          crons: ['*/5 * * * *'],
          state,
        },
        { headers: { 'cache-control': 'no-store' } },
      )
    }
    return new Response('not found', { status: 404 })
  },
}
