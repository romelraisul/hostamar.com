# V41 — Model health-check: hourly probe, healthy-only list

**Date:** 2026-09-20 · **Status:** SHIPPED

## What exists vs what was added

The app already had the model gateway: `/api/v1/models` (156 models: Cloudflare KV catalog + live free-model discovery from kilo/openrouter/opencode/nvidia). OmniRoute (the local router on :20128) is an empty shell — no API keys registered, no provider nodes — so the health layer was built on the real gateway, not on OmniRoute.

## Added

1. **`lib/model-health.ts`** — `pingModel()` probes the real inference path (kilocode gateway, `max_tokens:1`, 12s cap); results stored in Upstash key `omnirouter:health` (TTL 2h).
2. **`app/api/v1/health-check/route.ts`** — `POST` (auth: `x-cron-secret` = `CRON_SECRET`) pings a rotating sample of 12 models/hour (full 156-model sweep ≈ every 13h), merges into Upstash. `GET` returns the summary.
3. **`/api/v1/models` now filters**: models marked `ok:false` are removed from the list. Unprobed models stay listed (absence of data ≠ down). Response gains `healthFiltered: N`.
4. **WSL cron** `0 * * * *` — `~/hostamar-migrate/omnirouter/check-models-health.sh` POSTs the endpoint; logs one line per hour to `health.log`.

## Secret handling

`CRON_SECRET` generated fresh, stored in `.env.local` + Vercel Production + Infisical (`hostamar-foundation`/dev).

## Why serverless-side probing

The inference keys (KILOCODE_API_KEY etc.) live only in Vercel env — WSL doesn't have them. The probe runs where the keys are; WSL cron just triggers it.

## Verify after deploy

```bash
curl -s https://hostamar.com/api/v1/health-check          # GET summary (404 until first POST)
bash ~/hostamar-migrate/omnirouter/check-models-health.sh # trigger now
curl -s https://hostamar.com/api/v1/models | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('healthFiltered'), 'filtered;', len(d['data']), 'listed')"
```

## Correction (same session): OmniRoute IS real and now wired in

OmniRoute is a systemd service (not docker — no container exists), v16.3.1, port 20128, serving **604 models** (nvidia 126, aihorde 163, dva 125, auto 38, ...). It was unreachable because its `api_keys` table was empty (every key 401'd).

Fixes applied:
1. Inserted API key `sk-hostamar-wsl-2026` directly into its sqlite (`api_keys` table, plaintext `key` column) → 604 models listed
2. `proxy_enabled=0` on the nvidia-hostamar connection + service restart → inference works (`auto/fast` 200)
3. **Known wedge:** omniroute v16.3.1 queues its nvidia connection until `maxWaitMs=15000` expires (504) while the same key 200s direct in ~4s. Workaround in the probe: `nvidia/*` models are probed against `integrate.api.nvidia.com` directly (ground truth); `auto/*` via omniroute. Upstream bug, not ours.

## Probe pipeline (final)

- `probe-omniroute.js`: chat-capable ids only (`auto/*` + `nvidia/*`, 164), rotating 2/hour, merges into Upstash `omnirouter:health` alongside the serverless kilocode probes
- Verified: dead models correctly marked down (palmyra 404, starcoder2 404, dbrx 404 — removed upstream), live glm-5.3-flash marked healthy (200, 15s), image-only families (aihorde) excluded
- `OMNIROUTE_API_KEY` saved to `.env.local` + Infisical

## Skipped

- Turso `ModelRegistry` table — Upstash already is the store; a second one would drift.
- OmniRoute integration — it has no keys/models; revisit if it becomes the actual router.
- Per-model Turso/Telegram reporting — health.log on WSL + Upstash GET endpoint cover it.
