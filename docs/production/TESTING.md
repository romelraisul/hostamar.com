# TESTING — verification loops: 4x200 probe, count assertions, container and guard health, signed-URL checks.

## The 4x200 endpoint probe (run after every deploy and every shift start)

```bash
for p in /tv /api/tv /api/tv/live /models.json; do
  echo -n "$p "; curl -s -o /dev/null -w "%{http_code}\n" "https://hostamar.com$p"
done
```

PASS = all four return **HTTP 200**. Any non-200 → RUNBOOK.md before anything else.

## models.json assertions

```bash
curl -s https://hostamar.com/models.json | jq '.version, .models'
# expect: version 40
#         models.total 152, categories 10, edge_tools 53, renders 168
```

- FAIL (version drift / total drift) means the manifest on B2 is stale — re-run the
  sync (`scripts/sync-manifest-to-b2.mjs` runs inside `worker:build`).
- Homepage must render the same catalog numbers (renders=168) — homepage render count
  assertion: the homepage's rendered stat block matches models.json, not a hardcode.

## /api/tv assertions

```bash
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'
# expect: count 362, source "b2-cache" (or "b2-live" on a cold edge), b2_only true
```

- Regression guards: `grep -r "353" app/api/tv/` → 0 matches; `grep -r "R2_BUCKET" workers/`
  → 0 matches. `source: "fallback-zero"` or a hardcoded count = deploy is broken.

## Signed-URL 200 test (delivery chain)

```bash
# request a signed URL for a known object via the worker flow, then:
curl -s -o /dev/null -w "%{http_code}\n" "$SIGNED_URL"
# expect: 200 with a video/mp4 content-type for receipt-explainer.mp4
```

- Known good object: `receipt-explainer.mp4` in bucket hostamar-prod.
- FAIL (403) = signing flow broken; do NOT respond by making the bucket public.

## Guard health

```bash
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'
# expect: 6  (z-ai/glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash,
#             step-5-preview, nemotron-3-ultra-550b, nemotron-3.5-bolt)
```

- On guard failure, the kilo.ai fallback (384 models) serves — verify the fallback banner/
  provider field so you know WHICH path answered.

## Container health checks

```bash
podman ps --format '{{.Names}} {{.Status}}'   # infisical, postgres-15432, redis-infisical,
                                              # forgejo, hostamar-tv-rtmp, openwebui,
                                              # code-server, uptime, minio, puppy-linux
docker  ps --format '{{.Names}} {{.Status}}'  # expect 11 Up: teldrive, teldrive-db,
                                              # litellm-play, freellmapi, host-hls2,
                                              # cloudflare-tunnel, redis-foundation, medusa-wsl,
                                              # coolify-wsl, openobserve-wsl, hostamar-postgres
```

- Restart-loop or Restarting status → INCIDENTS.md → RUNBOOK.md (Infisical, teldrive).

## In-repo tests

- `npm test` → vitest; `npm run typecheck` → tsc --noEmit; `npm run build` must pass before
  any push (the prepush hook runs the Vercel quota check + build).
- Rule: a fix isn't done until its probe was actually run this session and printed the
  expected values. No "should pass now".
