# TESTING — Verification Loops, Probes, Health Checks

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** 53 vitest tests PASS, 13/13 endpoints GREEN

---

## The 13x Endpoint Probe (Run After Every Deploy)

```bash
for u in \
  https://hostamar.com/ \
  https://hostamar.com/pricing \
  https://hostamar.com/api/v1/models \
  https://hostamar.com/api/store/products \
  https://hostamar.com/tv \
  https://hostamar.com/tv/manifest.json \
  https://hostamar.com/api/tv \
  https://hostamar.com/api/tv/playlist \
  https://hostamar.com/api/tv/stable-channels \
  https://hostamar.com/api/tv/status \
  https://hostamar.com/api/tv/heartbeat \
  https://hostamar.com/admin \
  https://hostamar.com/api/admin/stats; do
  echo -n "$u: "
  curl -s -o /dev/null -w "%{http_code}\n" -m 10 $u
done
```

**Expected (ALL GREEN):**
```
https://hostamar.com/: 200
https://hostamar.com/pricing: 200
https://hostamar.com/api/v1/models: 200
https://hostamar.com/api/store/products: 200
https://hostamar.com/tv: 200
https://hostamar.com/tv/manifest.json: 200
https://hostamar.com/api/tv: 200
https://hostamar.com/api/tv/playlist: 200
https://hostamar.com/api/tv/stable-channels: 200
https://hostamar.com/api/tv/status: 200
https://hostamar.com/api/tv/heartbeat: 200
https://hostamar.com/admin: 307
https://hostamar.com/api/admin/stats: 401
```

---

## models.json Assertions

```bash
curl -s https://hostamar.com/models.json | jq '.version, .models'
# expect: version "40"
#         models.total 152, categories 10, edge_tools 53, renders 168
```

---

## /api/tv Assertions

```bash
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'
# expect: count 362, source "b2-cache-known", b2_only true

# Regression guards (must return 0 matches)
grep -r "353" app/api/tv/          # hardcoded fallback removed
grep -r "R2_BUCKET" workers/      # B2 not R2
grep -r "fallback-zero" app/api/tv/  # never returned now
```

---

## Signed-URL Delivery Test

```bash
# Request signed URL for known object, then:
curl -s -o /dev/null -w "%{http_code}\n" "$SIGNED_URL"
# expect: 200 with video/mp4 content-type

# Known good: receipt-explainer.mp4 in hostamar-prod
# FAIL (403) = signing flow broken — do NOT make bucket public
```

---

## Guard Health (NVIDIA Guard)

```bash
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'
# expect: 6 models
# glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash,
# step-5-preview, nemotron-3.5-bolt, nemotron-ultra

# On guard failure → kilo.ai fallback (384 models) serves
# Verify provider field to know WHICH path answered
```

---

## Container Health Checks

```bash
# Podman (WSL local fleet)
podman ps --format '{{.Names}} {{.Status}}'
# expect: infisical, postgres-infisical, redis-infisical, forgejo, 
#         hostamar-tv-rtmp, openwebui, code-server, uptime, minio, puppy-linux

# Docker (hosted stack)
docker ps --format '{{.Names}} {{.Status}}'
# expect 11 Up: teldrive, teldrive-db, litellm-play, freellmapi,
#         host-hls2, cloudflare-tunnel, redis-foundation, medusa-wsl,
#         coolify-wsl, openobserve-wsl, hostamar-postgres

# Restart-loop or Restarting → INCIDENTS.md → RUNBOOK.md
```

---

## In-Repo Tests

```bash
# Unit tests (vitest)
pnpm test
# → Test Files 9 passed (9), Tests 53 passed (53)

# Typecheck
npm run typecheck
# → tsc --noEmit

# Build (must pass before any push)
npm run build
# → Compiled successfully, types valid
```

---

## TV Agent Test

```bash
# Poll commands endpoint
curl -s "https://hostamar.com/api/tv/agent/commands?secret=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b"
# expect: {ok: true, commands: []}

# Check service status
systemctl --user status tv-agent.service
# expect: active (running)
```

---

## CI/CD Verification

- **Prepush hook:** Vercel quota check + build
- **GitHub Actions:** 6h mirror Turso → Supabase → Neon (currently gated by GitHub suspension)
- **Worker deploy:** `npm run worker:build` → `wrangler deploy -c wrangler-pages.toml`
- **Rule:** Fix isn't done until its probe was actually run this session and printed expected values