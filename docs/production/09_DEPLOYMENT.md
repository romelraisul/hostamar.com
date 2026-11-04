# Hostamar.com — Deployment

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** WSL Hermes source of truth, mask-safe deploy, 13/13 probe green

## Deploy Flow (Verified)

```bash
# 1. Clean Hermes limits (mask-safe, persistent paths)
python3 << 'PY'
import os, glob
for p in glob.glob('/home/romel/.hermes/tool_results/*.json')[:800]:
    try: os.remove(p)
    except: pass
import sqlite3
sqlite3.connect('/home/romel/.hermes/state.db').execute("VACUUM;")
PY

# 2. Clean build artifacts
rm -rf /home/romel/hostamar.com/.next/cache
cd /home/romel/hostamar.com && pnpm store prune 2>&1 | tail -5
podman system prune -f 2>&1 | tail-5

# 3. Build Next.js + OpenNext worker
cd /home/romel/hostamar.com
npm run worker:build
# → .open-next/worker.js created, 11 require("node:sqlite") patched

# 4. Generate TV playlist keys
node scripts/generate-tv-playlist.mjs
# → 374 keys in lib/tv-playlist.ts

# 5. Deploy hostamar-pages worker (Cloudflare Pages)
export CLOUDFLARE_API_TOKEN=$(python3 -c "
import re
with open('/home/romel/automation/infisical.env') as f: t=f.read()
m=re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', t)
print(m.group(1) if m else '')
")
npx wrangler deploy -c wrangler-pages.toml

# 6. Deploy f005-cdn worker
cd /home/romel/hostamar.com/workers/f005-cdn && npx wrangler deploy

# 7. Sync B2 manifests
cd /home/romel/hostamar.com
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs
# Expected: "Uploaded models.json to B2", "tv.json: count=362, source=b2-live"

# 8. Cloudflare Purge
# Dashboard → Caching → Purge Everything + Custom Purge hostamar.com/models.json, hostamar.com/api/tv*

# 9. Verify 13/13 + 4x200
for u in https://hostamar.com/ https://hostamar.com/login https://hostamar.com/pricing \
  https://hostamar.com/api/v1/models https://hostamar.com/api/store/products \
  https://hostamar.com/tv https://hostamar.com/tv/manifest.json \
  https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist \
  https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status \
  https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin \
  https://hostamar.com/api/admin/stats https://hostamar.com/models.json; do
  echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 "$u"
done
```

## Mask-Safe Python Pattern (No Token Leakage)

```python
import re, subprocess, os

with open('/home/romel/automation/infisical.env') as f:
    txt = f.read()

# Extract without shell echo
cf_token = re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', txt).group(1)
b2_id = re.search(r'B2_APPLICATION_KEY_ID=([^\n]+)', txt).group(1).strip().strip('"')
b2_key = re.search(r'B2_APPLICATION_KEY=([^\n]+)', txt).group(1).strip().strip('"')

# Use in subprocess with env var — NEVER echo
subprocess.run(
    ['wrangler', 'secret', 'put', 'B2_APPLICATION_KEY_ID'],
    input=b2_id.encode(),
    env={**os.environ, 'CLOUDFLARE_API_TOKEN': cf_token}
)
```

## Persistent Paths (NOT /tmp)

| Path | Purpose |
|------|---------|
| `/home/romel/.hermes/` | Hermes state, tool_results, state.db |
| `/home/romel/automation/infisical.env` | Secret mirror (chmod 600) |
| `/home/romel/hostamar.com/` | Repo, build output |
| `/home/romel/.cloudflared/` | Tunnel credentials |

**Rule:** `/tmp` self-deletes `hermes-completion-*` — never use for persistent data.

## Git Push (Forgejo = Live Remote)

```bash
cd /home/romel/hostamar.com
git add -A
git commit -m "deploy: <description>"
git push forgejo main   # LIVE: git.hostamar.com
git push gitlab main    # Mirror
# git push codeberg main # QUOTA-BLOCKED — delete via web UI first
```

**GitHub:** Suspended (appeal #4892433) — push blocked, Vercel gated.

## Verification After Deploy

```bash
# 13x probe
for u in https://hostamar.com/ https://hostamar.com/login https://hostamar.com/pricing \
  https://hostamar.com/api/v1/models https://hostamar.com/api/store/products \
  https://hostamar.com/tv https://hostamar.com/tv/manifest.json \
  https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist \
  https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status \
  https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin \
  https://hostamar.com/api/admin/stats https://hostamar.com/models.json; do
  echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 "$u"
done

# Signed video URL
curl -I "$(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['videos'][0]['url'])")" 2>&1 | grep -E "HTTP|content-type|cf-cache|x-source"

# Tests
cd /home/romel/hostamar.com && pnpm test
# Expected: 53 tests pass
```