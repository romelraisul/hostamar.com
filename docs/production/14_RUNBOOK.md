# Hostamar.com — Runbook (Common Fixes)

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** All procedures verified, run after any recovery

## 1. Browser Tool 147 URLs Limit

**Symptom:** `BAD_REQUEST user_provided_urls must contain at most 100`
**Fix:**
```bash
# Clear tool_results
rm -rf /home/romel/.hermes/tool_results/*.json

# Restart Hermes session
```

## 2. File Limit 1024 (blocks python_execution)

**Symptom:** `.krabby/tool_results` > 1024 files → python_execution blocked
**Fix:**
```bash
rm -rf /home/romel/.hermes/tool_results/*.json
```

## 3. state.db Vacuum (4.6GB → 3.17GB)

**Fix:**
```bash
sqlite3 /home/romel/.hermes/state.db "VACUUM;"
```

## 4. /tmp Self-Deletes (`hermes-completion-*`)

**Rule:** Use `/home/romel/` persistent paths, NOT `/tmp`

```bash
# Bad
/tmp/hermes-completion-*

# Good
/home/romel/.hermes/cache/scratch/
```

## 5. reconcile.py Overwrites Fallback to Dead omniroute

**Issue:** Fallback pinned to dead `omniroute` instead of `hostamar-own-fast :4000`
**Fix:** Pin fallback to `hostamar-own-fast :4000` in nvidia-guard config

## 6. Dead Models 410 (EOL Oct 28)

**Models:** `z-ai/glm-5.3`, `kimi-k3` — 502 All 8 routed attempts failed
**Fix:**
```bash
# Update nvidia-guard model list
# Remove dead models, keep 6 live:
# glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash,
# step-5-preview, nemotron-3.5-bolt, nemotron-ultra
systemctl --user restart nvidia-guard
```

## 7. 137+112 Sessions Pinned to Dead Models

**Fix:** Reconcile fallback, rotate nvidia-guard keys

## 8. TV 403 Rapid Loop (Fixed 2026-11-04)

**Root cause:** `lib/tv-playlist.ts` had build-time unsigned `f005.hostamar.com/file/hostamar-prod/xxx.mp4` → private bucket 403 → player `onError` → immediate `next()` → infinite loop

**Fix applied:**
1. `generate-tv-playlist.mjs` emits keys only (no URLs)
2. `app/api/tv/playlist/route.ts` builds worker route URLs: `https://hostamar.com/tv/<key>.mp4`
3. `f005 worker` signs at request time via `getSignedUrl` (3600s expiry)
4. Player `onError`: fetches fresh playlist (new signed URL), retries once, then advances

## 9. Login `sso_callback_failed` (Fixed 2026-11-04)

**Root cause:** NextAuth disabled (501 stub), OAuth redirects to `/login?error=sso_callback_failed`

**Fix:**
1. `app/login/page.tsx` reads `?error` via `useSearchParams()`
2. Shows amber notice: "Google/OAuth login not configured — use email/password (custom JWT active)"
3. Email/password POSTs to `/api/auth/login` (custom JWT, HttpOnly cookie)
4. Middleware redirects to `/login?next=...` (no infinite loop)

## 10. AlwaysData Suspend Risk

**Issue:** 1GB forever free, personal use only — suspends if commercial/heavy traffic
**Monitor:** Check `api.hostamar.com` fallback health
**Fix:** Ensure primary tunnel (`hostamar-primary`) is healthy

## 11. Cloudflare KV CPU Limits (Background pkill next dev loop)

**Issue:** `pkill` loop bug 63min 3815s CPU 1000+ limit fixed
**Fix:** Ensure no runaway dev processes, check systemd services

## 12. Windows Admin: compact-vhdx.txt diskpart

**Fix:** Reclaim 43G C:, re-add portproxy 18789/12436
```powershell
# Firewall rules for LAN access
netsh advfirewall firewall add rule name="OpenClaw 18789" dir=in action=allow protocol=TCP localport=18789
netsh advfirewall firewall add rule name="nvidia-guard 12436" dir=in action=allow protocol=TCP localport=12436

# Verify
curl http://127.0.0.1:18789/health
curl http://127.0.0.1:12436/v1/models
```

## 13. Phone Re-pair OPPO A38 After Token Rotation

**Steps:**
1. Regenerate QR with Windows LAN IP `192.168.10.70` (NOT `172.17.125.71`)
2. Scan QR on OPPO A38
3. Verify pairing `33dc265e..d67f863`

## 14. Codeberg Quota-Blocked

**Fix:** Manual delete via web UI, then re-add remote and push

```bash
# After web UI delete
git remote add codeberg git@codeberg.org:romelraisul/hostamar.com.git
git push codeberg main
```

## 15. teldrive DB Connection Retry Loop

**Symptom:** teldrive container restarting, logs show "lookup teldrive-db on 127.0.0.11:53: no such host" then "connection refused" then "database system is starting up"

**Root Cause:** teldrive starts before teldrive-db is ready on the shared `teldrive-net` network

**Fix:** teldrive config has retry logic (max_retries=5, 500ms intervals). Container now stays Up after ~30s.

**Verify:**
```bash
docker ps | grep teldrive  # Should show Up, not Restarting
curl -s http://localhost:8091/health  # Returns HTML (200)
```

## 16. API Tunnel (api.hostamar.com) Creation

**Symptom:** `api.hostamar.com/health` returns 404, no tunnel for api-primary

**Fix:**
```bash
# 1. Create tunnel
cloudflared tunnel create hostamar-api-primary

# 2. Create config
cat > /home/romel/.cloudflared/hostamar-api-primary-config.yml << 'EOF'
tunnel: <tunnel-id>
credentials-file: /home/romel/.cloudflared/<tunnel-id>.json
origincert: /home/romel/.cloudflared/cert.pem
ingress:
  - hostname: api-primary.hostamar.com
    service: http://localhost:12436
  - service: http_status:404
EOF

# 3. Route DNS (use --overwrite-dns if record exists)
cloudflared tunnel route dns --overwrite-dns hostamar-api-primary api-primary.hostamar.com

# 4. Start tunnel (systemd or background)
cloudflared tunnel --config /home/romel/.cloudflared/hostamar-api-primary-config.yml run &

# 5. Verify
curl -s https://api-primary.hostamar.com/v1/models | jq '.data | length'
# Expected: 5
```

## 17. B2 Video Sync (374 videos)

**Symptom:** Manifest has 374 videos, B2 bucket has ~70

**Fix:**
```bash
# Authorize B2 CLI
export B2_APPLICATION_KEY_ID="005B2_KEY_ID_PLACEHOLDER0000000001"
export B2_APPLICATION_KEY="K005En5I2K9MzTzLR3itLtU5DBgBZvc"
b2 authorize-account

# Sync local public/tv to B2 tv/
b2 sync /home/romel/hostamar.com/public/tv/ b2://hostamar-prod/tv/ --replace-newer --no-progress

# Sync manifests
cd /home/romel/hostamar.com
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs

# Verify
b2 ls b2://hostamar-prod/tv/ --recursive | wc -l
# Expected: ~400 (374 videos + manifests)
curl -I https://hostamar.com/tv/HostamarH3_00001_.mp4 | grep -E "HTTP|content-type|x-source"
# Expected: 200 video/mp4, x-source: b2-live
```

## 18. Payment Flow Test (Revenue Unblock)

**Prerequisites:** Auth token (login first), test TrxID

```bash
# 1. Login to get auth cookie
curl -c /tmp/cookies.txt -X POST https://hostamar.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hostamar.com","password":"password123"}'

# 2. Test verify-trx (creates pending_verification transaction)
curl -b /tmp/cookies.txt -X POST https://hostamar.com/api/billing/verify-trx \
  -H "Content-Type: application/json" \
  -d '{"trxId": "TEST123456", "plan": "starter", "amount": 990}'
# Expected: {"ok":true,"status":"pending_verification","credits":6000}

# 3. Admin approve (requires admin auth)
curl -b /tmp/admin_cookies.txt -X POST https://hostamar.com/api/admin/payments/approve/txn_123 \
  -H "Content-Type: application/json" \
  -d '{"planOverride": "starter"}'
# Expected: {"success":true,"creditsAdded":6000}

# 4. Verify bridge worker (bypasses CPU limit)
curl -H "x-publishable-api-key: pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad" \
  https://hostamar-medusa-bridge.romelraisul.workers.dev/store/products?limit=1
```

## 19. Full Deploy + Verify (After ANY Recovery)

```bash
# 1. Clean Hermes limits
python3 << 'PY'
import os, glob, sqlite3
for p in glob.glob('/home/romel/.hermes/tool_results/*.json')[:800]:
    try: os.remove(p)
    except: pass
sqlite3.connect('/home/romel/.hermes/state.db').execute("VACUUM;")
PY

# 2. Clean build artifacts
rm -rf /home/romel/hostamar.com/.next/cache
cd /home/romel/hostamar.com && pnpm store prune
podman system prune -f

# 3. Build
cd /home/romel/hostamar.com
npm run worker:build
node scripts/generate-tv-playlist.mjs

# 4. Deploy
export CLOUDFLARE_API_TOKEN=$(python3 -c "
import re
with open('/home/romel/automation/infisical.env') as f: t=f.read()
m=re.search(r'CLOUDFLARE_API_TOKEN=([a-zA-Z0-9_]+)', t)
print(m.group(1) if m else '')
")
npx wrangler deploy -c wrangler-pages.toml
cd /home/romel/hostamar.com/workers/f005-cdn && npx wrangler deploy

# 5. Sync B2
cd /home/romel/hostamar.com
source /home/romel/automation/infisical.env
node scripts/sync-manifest-to-b2.mjs

# 6. Purge Cloudflare cache
# Dashboard → Caching → Purge Everything + Custom Purge hostamar.com/models.json, hostamar.com/api/tv*

# 7. Verify 13/13 + 4x200
for u in https://hostamar.com/ https://hostamar.com/login https://hostamar.com/pricing \
  https://hostamar.com/api/v1/models https://hostamar.com/api/store/products \
  https://hostamar.com/tv https://hostamar.com/tv/manifest.json \
  https://hostamar.com/api/tv https://hostamar.com/api/tv/playlist \
  https://hostamar.com/api/tv/stable-channels https://hostamar.com/api/tv/status \
  https://hostamar.com/api/tv/heartbeat https://hostamar.com/admin \
  https://hostamar.com/api/admin/stats https://hostamar.com/models.json; do
  echo -n "$u: "; curl -s -o /dev/null -w "%{http_code}\n" -m 10 "$u"
done

# 8. Signed video
curl -I "$(curl -s https://hostamar.com/api/tv/playlist?format=json | python3 -c "import json,sys; print(json.load(sys.stdin)['videos'][0]['url'])")" 2>&1 | grep -E "HTTP|content-type|cf-cache|x-source"

# 9. Tests
pnpm test
```

## After ANY Recovery

- Re-run full probe set (13x endpoints, 4x200, signed video)
- Verify container fleet Up, guard 6 models
- Append incident + outcome to QUILL daily report and CHANGELOG.md
- If fix was new (not in INCIDENTS.md/RUNBOOK.md), write postmortem + procedure before closing shift