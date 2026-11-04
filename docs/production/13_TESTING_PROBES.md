# Hostamar.com — Testing & Probes

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** 53 vitest tests PASS, 13/13 endpoints GREEN, signed video 200

## 4x200 Probe (Core Health)

```bash
for p in /tv /api/tv /api/tv/live /models.json; do
  echo -n "$p "
  curl -s -o /dev/null -w "%{http_code}\n" "https://hostamar.com$p"
done
```

**Expected (ALL 200):**
```
/tv 200
/api/tv 200
/api/tv/live 200
/models.json 200
```

**Headers check:** All must return `cf-ray`, no `x-vercel`

## 13/13 Endpoint Probe (Full Deploy Verification)

```bash
for u in \
  https://hostamar.com/ \
  https://hostamar.com/login \
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
  https://hostamar.com/api/admin/stats \
  https://hostamar.com/models.json; do
  echo -n "$u: "
  curl -s -o /dev/null -w "%{http_code}\n" -m 10 "$u"
done
```

**Expected:**
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/` | 200 | Homepage |
| `/login` | 200 | Custom JWT, amber notice for SSO error |
| `/pricing` | 200 | 1cr=1 taka, bKash 01822417463 |
| `/api/v1/models` | 200 | 152 models, 10 categories |
| `/api/store/products` | 200 | 124 bKash products |
| `/tv` | 200 | 374 videos, auto-loop player |
| `/tv/manifest.json` | 200 | 374 videos, B2-served |
| `/api/tv` | 200 | B2 cache, count 362, b2_only true |
| `/api/tv/playlist` | 200 | 374 signed URLs via f005 worker |
| `/api/tv/stable-channels` | 200 | Graceful fallback |
| `/api/tv/status` | 200 | |
| `/api/tv/heartbeat` | 200 | |
| `/admin` | 307 | Redirect to login |
| `/api/admin/stats` | 401 | Auth guard works |
| `/models.json` | 200 | v40, 152 models |

## models.json Assertions

```bash
curl -s https://hostamar.com/models.json | jq '.version, .models'
# expect: version "40"
#         models.total 152, categories 10, edge_tools 53, renders 168
```

## /api/tv Assertions

```bash
curl -s https://hostamar.com/api/tv | jq '{count, source, b2_only}'
# expect: count 362, source "b2-cache", b2_only true

# Regression guards (must return 0 matches)
grep -r "353" app/api/tv/          # hardcoded fallback removed
grep -r "R2_BUCKET" workers/      # B2 not R2
grep -r "fallback-zero" app/api/tv/  # never returned now
```

## Signed-URL Delivery Test

```bash
# Get first video URL from playlist
VIDEO_URL=$(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import sys,json; print(json.load(sys.stdin)['videos'][0]['url'])")

# Test signed URL
curl -s -o /dev/null -w "%{http_code}\n" "$VIDEO_URL"
# expect: 200

# Full header check
curl -I "$VIDEO_URL" 2>&1 | grep -E "HTTP|content-type|cf-cache-status|x-source|x-f005"
# Expected: HTTP/2 200, content-type: video/mp4, cf-cache-status: HIT, x-source: b2-live, x-f005-worker: true
```

## Guard Health (NVIDIA Guard)

```bash
curl -s http://127.0.0.1:12436/v1/models | jq '.data | length'
# expect: 6 models
# glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash,
# step-5-preview, nemotron-3.5-bolt, nemotron-ultra
```

## Container Health Checks

```bash
# Podman (WSL local fleet)
podman ps --format '{{.Names}} {{.Status}}'
# expect: infisical, postgres-infisical, redis-foundation, forgejo,
#         hostamar-tv-rtmp, openwebui, code-server, uptime, minio, puppy-linux

# Docker (hosted stack)
docker ps --format '{{.Names}} {{.Status}}'
# expect: teldrive, teldrive-db, litellm-play, freellmapi,
#         host-hls2, cloudflare-tunnel, redis-foundation, medusa-wsl,
#         coolify-wsl, openobserve-wsl, hostamar-postgres
```

## In-Repo Tests

```bash
# Unit tests (vitest)
cd /home/romel/hostamar.com && pnpm test
# → Test Files 9 passed (9), Tests 53 passed (53)

# Typecheck
npm run typecheck
# → tsc --noEmit (no errors)

# Build (must pass before any push)
npm run build
# → Compiled successfully, types valid
```

## TV Agent Test

```bash
# Poll commands endpoint
curl -s "https://hostamar.com/api/tv/agent/commands?secret=686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b"
# expect: {ok: true, commands: []}

# Check service status
systemctl --user status tv-agent.service
# expect: active (running)
```

## Playback Verification (Manual)

1. Open `https://hostamar.com/tv` in browser
2. Video should auto-play (muted) within 2s
3. No rapid-loop (error → retry → advance after 2s)
4. Playlist drawer shows 374 clickable items
5. Prev/Next buttons work
6. Auto-advances on `ended` (modulo 374)

## CI/CD Verification

- **Prepush hook:** Vercel quota check + build
- **GitHub Actions:** 6h mirror Turso → Supabase → Neon (gated by GitHub suspension)
- **Worker deploy:** `npm run worker:build` → `wrangler deploy -c wrangler-pages.toml`
- **Rule:** Fix isn't done until its probe was actually run this session and printed expected values