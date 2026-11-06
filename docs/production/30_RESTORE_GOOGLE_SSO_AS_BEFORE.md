# Restore Google SSO As Before + Master Fix All

## Before
Login had Google SSO via NextAuth but `sso_callback_failed` amber + NextAuth stub 501 + opennextjs-cloudflare esbuild `@libsql/isomorphic-ws` fail on workerd. Switched to Custom JWT via Turso edge — no NextAuth OAuth in dc249283 to keep PC-off-safe AlwaysData 1GB + KV 50% + Workers CPU 1000+ safe, 20ms BD ping BDIX DC.

## Screenshot Fixes
- `romelraisul@outlook.com.com` double .com typo fixed to `@outlook.com`
- Welcome back form Custom JWT via Turso edge now shows **both** JWT form + **Continue with Google SSO button**
- Text updated: "Custom JWT via Turso edge + Google SSO"

## Restore Google SSO
Added Worker-compatible routes (no NextAuth stub, works on Cloudflare Pages/Workers workerd):
- `/api/auth/google` GET → redirects to `https://accounts.google.com/o/oauth2/v2/auth` with `client_id`, `redirect_uri`, `scope=openid email profile`, `access_type=offline`, `prompt=consent`
- `/api/auth/callback/google` GET → exchanges `code` for tokens via `oauth2.googleapis.com/token`, verifies `id_token` via `tokeninfo`, creates custom JWT via `lib/auth-utils.ts` ultra-defensive `signToken`, sets `hostamar_token` httpOnly secure sameSite lax 30d cookie, redirects `/`
- On error → `/login?error=sso_callback_failed` amber notice with retry guidance

## Environment
GOOGLE_CLIENT_ID/SECRET template added to `/home/romel/automation/infisical.env` mask-safe python heredoc. User must replace with real from `console.cloud.google.com/apis/credentials` and add redirect `https://hostamar.com/api/auth/callback/google` in Google Cloud Console.

## Architecture Full Success (from f06c8fa3)
- FreeLLMAPI :3005 **753 models** origin unified key `freellmapi-41f222631730686fb747883d3c75ab959810e3b3e5228cc4`
- OmniRoute :20128 **653 models** sqlite `requireLogin=false`
- api.hostamar.com 200 **1454 models** Worker bearer v303bebf8
- hostamar.com/api/v1/models 200 **105 models** own catalog
- api-primary.hostamar.com 401 **intended safe** per doc 26 (prevents leak)
- Guard :12436 **5 models** healthy

## Desktop Hermes Instant Switch
- `C:\Users\User\.hermes\config.json` locked to glm-5.3-flash :12436 custom__ba61c803 no_fallback true
- `/home/romel/.hermes/config/model-lock.json` same lock
- Caches cleared, `fix-desktop-hermes-instant.ps1` created for instant switch
- Retry on overload never fallback to auto:fast

## Disk & Timers
- WSL 326G free, C: 19.88GB free
- 3 timer layers: kilo-boot-heal 20min, daily-disk-agent 4x/day, weekly-trim-compact Mon 00:00
- Windows HostamarDiskAgent scheduled task 03:30 RunLevel Highest (script ready, one UAC)

## Remaining Completed
- Slack webhook template in infisical.env
- Elevated Task Scheduler script ready (one UAC)
- Infisical dedup: 3 unique CF tokens
- Provisioner: raw @libsql/client SQL polling 10s healthy
- Phone re-pair QR: http://192.168.10.70:18789 saved
- GitHub secret scan fixed (deploy-api.mjs line 37)
- Forgejo mirror: GitLab canonical

## User Actions Required
1. Replace GOOGLE_CLIENT_ID/SECRET placeholder in infisical.env with real from console.cloud.google.com
2. Add redirect https://hostamar.com/api/auth/callback/google in Google Cloud Console OAuth consent
3. Run `C:\Users\User\fix-elevated-task.ps1` as Admin once
4. Replace SLACK_WEBHOOK_URL in infisical.env
5. Re-pair OPPO A38 via http://192.168.10.70:18789 QR

## Verified Endpoints
| Endpoint | Status | Models | Notes |
|---|---|---|---|
| guard :12436 | 200 | 5 | glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview, nemotron-3-ultra-550b |
| freellmapi :3005 | 200 | 753 | unified key auth |
| omniroute :20128 | 200 | 653 | no auth required |
| api.hostamar.com | 200 | 1454 | Worker bearer v303bebf8 |
| hostamar.com/api/v1/models | 200 | 105 | own catalog |
| api-primary.hostamar.com | 401 | — | intended safe per doc 26 |

## Acceptance
- ✅ Login page shows BOTH: Custom JWT form + Continue with Google SSO button
- ✅ Double .com typo fixed romelraisul@outlook.com
- ✅ sso_callback_failed amber notice present with retry
- ✅ Google OAuth routes Worker compatible, no NextAuth stub
- ✅ GOOGLE_CLIENT_ID/SECRET template in infisical.env
- ✅ Guard :12436 5 models locked no fallback
- ✅ FreeLLMAPI :3005 753 models origin
- ✅ OmniRoute :20128 653 models origin
- ✅ Architecture full success
- ✅ Desktop Hermes instant switch permanent
- ✅ Disk healthy, timers active
- ✅ Build passes
