# 1102 Worker exceeded resource limits — fix record (2026-10-09)

Ray `a47d58db1eb8db4f` (2026-10-09 12:21:47 UTC). Fixed in worker version
`6de74793-2442-4e30-ae79-eba8e2fa4d30`.

## What was draining the Worker

1. **`libsql://` = WebSocket Hrana in workerd** — `lib/turso-edge.ts` passed the
   `libsql://` URL straight to `@libsql/client/web`, which then opens a
   `wss://` Hrana socket per isolate. Route invocations on that client were the
   ones killed (`/api/tv/playlist`, `/api/tv/agent/commands`).
   **Rule: on Workers, Turso goes over `https://` (Hrana over fetch).** Never
   hand the `libsql://` scheme to the web client.
2. **Re-deriving the free-model catalog per request** —
   `lib/free-model-router.ts` fetched 4 upstreams and merged ~1.25 MB of JSON
   inside the request (26–363 ms cpuTime). Now: KV read first
   (`HOSTAMAR_CATALOG.FREE_MODELS`, bound in `wrangler-pages.toml`), compute only
   as the cold-KV fallback, published with `waitUntil`.

## Evidence on record

`wrangler tail` live captures, same day:

* version `61d0ddf7` (pre-fix), 45 invocations → **5 × `outcome=exceededCpu`,
  "Worker exceeded CPU time limit."** at cpuTime 10–11 ms, every one on a DB-backed route:
  `/api/tv/agent/commands` (12:47:51, 12:48:01) and `/api/tv/playlist` (13:07:02/04/07).
* version `6de74793` (this fix), 123 invocations → **0 non-ok, 0 exceptions**;
  those same routes complete: `/api/tv/agent/commands` 58/58 ok (max 474 ms),
  `/api/tv/playlist` 8/8 ok (max 430 ms).

A route finishing at 474 ms cpuTime while the kills report 10 ms = the exhausted budget was the
`libsql://` WebSocket socket holding the request context, not compute. That is fix #1.

## Keep it this way

* Refresh is the hourly Hermes cron `free-model-router-hourly` →
  `scripts/model-router.sh` → `tsx scripts/kv-seed-free-models.ts`.
  Check it with:
  `ls -lt ~/memories/models/ | head` (hourly snapshots) and
  `tail -3 ~/memories/models/kv-seed.log`.
  Re-seed by hand: `cd ~/hostamar.com && ./node_modules/.bin/tsx scripts/kv-seed-free-models.ts`
  (needs a valid wrangler OAuth session — `CLOUDFLARE_API_TOKEN` must be UNSET,
  the scoped token 401s on KV).
* Diagnostic that found this — `wrangler tail` is the only live CPU view:
  ```bash
  cd ~/hostamar.com
  env -u CLOUDFLARE_API_TOKEN npx wrangler tail hostamar-pages -c wrangler-pages.toml --format json > /tmp/tail.json
  ```
  `--format json` emits **pretty-printed concatenated** objects, so a line-based
  parse finds nothing. Decode with `json.JSONDecoder().raw_decode` in a loop,
  then bucket `cpuTime` by `event.request.url`. Anything with a 3-digit cpuTime
  on a plain GET is a 1102 candidate.

## Round 2 — `cbad910e-35dc-4873-bab7-a93e89e53c61` (same day, later)

`/store` dropped the ORM (its one live number is a `COUNT(*)`, now via `lib/turso-edge.ts`) and
`/api/admin/status` cut its upstream probe 8 s → 3 s. Live tail, 300 s, **125 invocations, all on
`cbad910e`: ok 124 / exceededCpu 1**, 0 error logs. Max cpuTime per route:

```
/api/admin/status 670   /pricing 617   / 505   /api/tv/agent/commands 498
/api/drive/list   494 (1 kill)  /store 455   /api/v1/models 333
/api/tv/playlist   88   /api/v1/free-models 17
```

`/store` ~1.1 s → **455 ms**. Client-side sweeps: 30/30 (10 routes × 3) all 200; 150 reps in a
second pass → 148 in the expected class (200, or 401 where the route is cookie-gated).

### The residual: cold-isolate bootstrap, ~1%

The one kill was `/api/drive/list` (cpuTime 417, wallTime 492, `Worker exceeded CPU time limit`,
cf-ray `a47e6514fe22b92b`) — but re-probed 30× it returned 30 × 401 with zero 503, and the next
503 in the session landed on `/pricing` instead. **The failures follow the cold isolate, not a
route:** every route's maximum sits in the same 450–670 ms band (`/` 505, `/store` 455,
`/pricing` 617, `/api/admin/status` 670) whatever work it does. Session totals: 1 exceededCpu /
125 tail events, 2 × 503 / ~230 client requests.

Next lever (identified, NOT changed blind): `lib/auth-utils.ts` imports **`jsonwebtoken` (CJS)** and
**`bcryptjs`** at module scope, and every authenticated API route inherits that graph.
`verifyToken` is a plain HS256 verify — a sync edge-native HMAC version removes a CJS require-tree
from worker init for all authenticated routes. It is a security path, so it needs its own deploy +
token round-trip test.

A 500 ms ceiling is not reachable while cold init is 400–700 ms; what is verified here is no
persistent 1102 and DB-backed routes 2–5× cheaper.
