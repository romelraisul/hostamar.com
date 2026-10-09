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

## Known remaining hotspots (not fixed, no 1102 observed)

`/store` ~1.1 s cpuTime (Prisma render), `/api/admin/status` ~0.8 s,
`/pricing` ~0.6 s, `/api/drive/list` ~0.5 s, `/api/v1/models` ~0.37 s cold.
