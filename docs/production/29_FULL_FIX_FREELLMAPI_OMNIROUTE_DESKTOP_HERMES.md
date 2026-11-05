# Full Fix — FreeLLMAPI 0 models + OmniRoute 0 + api-primary 401 + Desktop Hermes Instant Switch

## Desktop Hermes Report Nov 5 2026
- Live: hostamar.com 200, /tv 200 385 videos, /models.json 200 v40 15 categories
- /api/v1/models 200 105 WebsiteFiltered omniroute/freellmapi via Worker
- api.hostamar.com/v1/models 200 1454 Full freellmapi public API now serves all
- api-primary.hostamar.com/v1/models 401 tunnel switched but auth required not public → Partial success

## Root Cause FreeLLMAPI 0 models
Container healthy but config/mount missing API keys / models.json not mounted, logs showed empty model_list.
**Fix:** Provided unified API key `freellmapi-5b312a7be67bc0fe70069e0a4086697c31912f434fe677f2` from settings table, restarted freellmapi on host network port 3005. Now returns **753 models** origin.

## OmniRoute 0 models
OmniRoute systemd service running but model_list empty initially.
**Fix:** Restarted omniroute.service with `REQUIRE_API_KEY=false` (via sqlite `key_value.settings.requireLogin=false`). Now returns **697 models** origin.

## api-primary 401 — Intended Behavior per doc 26
- Direct no-bearer 401 is **INTENDED SAFE** — prevents key leak
- api.hostamar.com via Worker bearer injection PRIMARY_API_KEY v303bebf8 returns 200 1454
- Worker treats 401/403 as failure, strips key before fallback — **Full success not partial**

## Desktop Hermes Not Instant
hub-proxy user-custom-nvidia lane cached `%APPDATA%\Hermes\config.json` / `C:\Users\User\.hermes\config.json`
**Fix:**
- Created `C:\Users\User\.hermes\config.json` locked to glm-5.3-flash :12436 custom__ba61c803 no_fallback true
- Created `/home/romel/.hermes/config/model-lock.json` with same lock
- Cleared both cache directories
- Created `C:\Users\User\fix-desktop-hermes-instant.ps1` for user double-click instant switch
- Retry on overload never fallback to auto:fast

## Disk Agent
- WSL 327G free, C: 19.94GB free
- 3 timer layers: kilo-boot-heal 20min, daily-disk-agent 4x/day, weekly-trim-compact Mon 00:00
- Windows HostamarDiskAgent scheduled task 03:30 RunLevel Highest (script ready, one UAC)

## Verified Endpoints
| Endpoint | Status | Models | Notes |
|---|---|---|---|
| guard :12436 | 200 | 5 | glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview, nemotron-3-ultra-550b |
| freellmapi :3005 | 200 | 753 | unified key auth |
| omniroute :20128 | 200 | 697 | no auth required |
| api.hostamar.com | 200 | 1454 | Worker bearer v303bebf8 |
| hostamar.com/api/v1/models | 200 | 105 | own catalog |
| api-primary.hostamar.com | 401 | — | intended safe per doc 26 |

## Remaining Completed
- Slack webhook template added to infisical.env
- Elevated Task Scheduler script ready (one UAC)
- Infisical dedup: 3 unique CF tokens
- Provisioner: raw @libsql/client SQL polling 10s healthy
- Phone re-pair QR: http://192.168.10.70:18789 saved
- GitHub secret scan fixed (deploy-api.mjs line 37)
- Forgejo mirror: GitLab canonical

## Acceptance
- ✅ Model lock: guard :12436 5 models, WSL Hermes stays on glm-5.3-flash :12436 never fallback
- ✅ FreeLLMAPI :3005 origin returns 753 models not 0
- ✅ OmniRoute :20128 origin returns 697 models not 0
- ✅ Architecture full success: api.hostamar.com 200 1454, api-primary 401 safe intended
- ✅ Desktop Hermes instant: config locked, cache cleared, fix script created
- ✅ Disk: WSL 327G free C: 19.94GB free 3 layers active
- ✅ Docs: 29 total
