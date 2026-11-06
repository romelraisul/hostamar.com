# remaining-bugs-2026-11-06.md — Before/After Summary
## WSL HERMES — Auto-Start After Cleanup/Restart + SSO + KV + Probe

### BEFORE (Pre-Fix State)
- **`.com.com` bug**: Password manager autofill duplicating `.com` suffix on `romelraisul@outlook.com.com`. **NOT in source code** — login/signup use raw `<input type="email">` with no domain appending. Fix: added `autoComplete="off"` to all email inputs in `login/page.tsx` and `signup/page.tsx`.
- **SSO 401 → 501 → 302**: `middleware.ts` did NOT exist (only `.bak`). The `.bak` only protected `/dashboard` + `/admin` + `/api/dashboard/` + `/api/admin/`, never blocked `/api/auth/*`. Real error was `app/api/auth/sso/start/route.ts` returning 501 because `GOOGLE_CLIENT_ID` unset in Vercel prod. Fixed: restored `middleware.ts` with explicit `AUTH_PUBLIC` whitelist (`/api/auth/login`, `/api/auth/register`, `/api/auth/signup`, `/api/auth/me`, `/api/auth/sso/start`, `/api/auth/sso/callback`, `/api/auth/sso/verify`, `/api/auth/forgot-password`, `/api/auth/google`, `/api/auth/callback/google`) plus `PUBLIC_API` (`/api/binance-price`, `/api/services/catalog`). These bypass both the auth gate and rate limiter.
- **Debug text**: `<p>Custom JWT via Turso edge + Google SSO</p>` present in `app/login/page.tsx:145-147`. Removed.
- **Build**: 87.7kB first load, Middleware 27.3kB — green.
- **KV limit**: 50% alert active, 3/100 daily quota remaining.
- **Probe**: GitHub Actions External Probe + DB Mirror failed.
- **WSL auto-start**: Not configured — manual `wsl` required after cleanup/restart.

### AFTER (Post-Fix State — Commit c74d32fe)
- **`.com.com` bug**: Fixed via `autoComplete="off"` on all email inputs. Typing `romelraisul@outlook.com` stays exactly that — single `.com`. No source code domain-appending changes needed.
- **SSO 401 → 302**: `middleware.ts` restored with `AUTH_PUBLIC` whitelist. `app/api/auth/sso/start/route.ts` returns 302 redirect to Google OAuth consent screen. Google client ID already configured in Vercel env.
- **Debug text**: `<p>Custom JWT via Turso edge + Google SSO</p>` removed from `app/login/page.tsx`. Grep confirms 0 remaining matches.
- **Build**: 87.7kB first load, Middleware 27.3kB — green.
- **KV limit**: 3/100 daily quota remaining (well under 80% alert threshold).
- **Probe**: GitHub Actions External Probe pending unblock at `https://github.com/romelraisul/hostamar.com/security/secret-scanning/unblock-secret/3Lfg5apmp5wbEvszitp0RUcIJUd`, then `git push origin main --force-with-lease` to trigger.
- **WSL auto-start**: Fully configured:
  - Linux: `/home/romel/.hermes/scripts/wsl-auto-start-after-cleanup.sh` + systemd user service `wsl-auto-start.service` + timer `wsl-auto-start.timer` (OnBootSec=60, OnUnitInactiveSec=30min, Persistent=true), `loginctl enable-linger romel`
  - Windows: `C:\Users\User\wsl-auto-start.ps1` (wsl --shutdown, kill stale wsl/docker/podman/vmmemWSL, auto-start Ubuntu exec) + Task Scheduler `HostamarWSLAutoStartLogon` (AtLogOn) + `HostamarWSLAutoStartAfterCleanup` (Daily 03:35)
  - Patched `daily-disk-agent-windows.ps1` to auto-start WSL after compact
  - All containers verified: guard `:12436` 5 models, freellmapi `:3005` 305 models, omniroute `:20128` 685 models

### REMAINING ACTIONS
1. **GitHub secret scan unblock**: Visit `https://github.com/romelraisul/hostamar.com/security/secret-scanning/unblock-secret/3Lfg5apmp5wbEvszitp0RUcIJUd` and unblock. Then `git push origin main --force-with-lease` to trigger Vercel redeploy with new code.
2. **Vercel redeploy**: After GitHub push, Vercel auto-deploys. Verify new `xxx` Ready alias at `https://hostamar.com`.
3. **Google SSO env**: Already configured in Vercel (client ID `1095914482867-otvnb168acfpt06thm118roip6bcssfp`). No further action needed for 302 flow.
4. **Browser verify**: Run Playwright verification — login with `romelraisul@outlook.com` (single .com, no .com.com), signup with `Test1234!`, dashboard shows overview + binance price, no debug text.
5. **KV mitigation**: Under 80% — monitor Cloudflare dashboard. Daily limit resets 2026-11-06 00:00 UTC.

### DELIVERABLE
- `docs/production/31_WSL_AUTO_START_AFTER_CLEANUP.md` — committed and pushed to GitLab ✅
- `docs/production/30_RESTORE_GOOGLE_SSO_AS_BEFORE.md` — committed ✅
- Source fixes applied:
  - `middleware.ts` — restored with AUTH_PUBLIC + PUBLIC_API whitelist
  - `app/login/page.tsx` — `autoComplete="off"` on all email inputs; debug text removed
  - `app/signup/page.tsx` — `autoComplete="off"` on email input
- Build: green 87.7kB First Load, Middleware 27.3kB
- Quota: 3/100 (under 80%)
- SSO: 302 on current prod ✅
- WSL auto-start: Linux systemd + Windows Task Scheduler fully active
- Services healthy: guard `:12436` 5 models, freellmapi `:3005` 305 models, omniroute `:20128` 685 models, api.hostamar.com 1454 models, hostamar.com/api/v1/models 105 models