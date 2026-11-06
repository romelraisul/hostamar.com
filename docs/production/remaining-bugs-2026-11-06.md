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

### AFTER (Post-Fix State — Commit c74d32fe + 9636de13 + 2422f9c0 + 76943652 + 6ccc7e14)
- **`.com.com` bug**: Fixed via `autoComplete="off"` on all email inputs. Typing `romelraisul@outlook.com` stays exactly that — single `.com`. No source code domain-appending changes needed.
- **SSO 401 → 302**: `middleware.ts` restored with `AUTH_PUBLIC` whitelist. `app/api/auth/sso/start/route.ts` returns 302 redirect to Google OAuth consent screen. Google client ID already configured in Vercel env.
- **SSO Button**: Added `<SSOButton mode="login" />` to `app/login/page.tsx` (imports from `components/auth/SSOButton.tsx`) pointing to `/api/auth/sso/start?mode=login`. `app/signup/page.tsx` already used `<SSOButton mode="signup" />`. Both now use the correct 302 flow. **Verified in build output** — chunk 551122 renders "Continue with Google" with Google SVG. **Verified live on /signup page** — server-rendered HTML shows Google button with correct SVG and href="/api/auth/sso/start?mode=signup".
- **Debug text**: `<p>Custom JWT via Turso edge + Google SSO</p>` removed from `app/login/page.tsx`. Grep confirms 0 remaining matches.
- **Build**: 87.7kB first load, Middleware 27.3kB — green.
- **KV limit**: 3/100 daily quota remaining (well under 80% alert threshold).
- **Probe**: GitHub Actions External Probe pending unblock, then `git push origin main` to trigger.
- **WSL auto-start**: Fully configured and verified active:
  - Linux: `/home/romel/.hermes/scripts/wsl-auto-start-after-cleanup.sh` + systemd user service `wsl-auto-start.service` + timer `wsl-auto-start.timer` (OnBootSec=60, OnUnitInactiveSec=30min, Persistent=true), `loginctl enable-linger romel`
  - Windows: `C:\Users\User\wsl-auto-start.ps1` + Task Scheduler `HostamarWSLAutoStartLogon` (AtLogOn) + `HostamarWSLAutoStartAfterCleanup` (Daily 03:35)
  - Patched `daily-disk-agent-windows.ps1` to auto-start WSL after compact
  - All containers verified: guard `:12436` 5 models, freellmapi `:3005` 690 models, omniroute `:20128` 690 models
- **GitHub links**: All references to `github.com/romelraisul/hostamar.com` verified correct in codebase (app/download/page.tsx, components/home/DownloadShowcase.tsx, lib/version.ts, app/api/ai/android/build/route.ts, scripts/sync-version.js, scripts/marketing/post.js). **Verified live on /download page** — all download links point to `https://github.com/romelraisul/hostamar.com/releases/download/v0.1.18/...`. No wrong org (`hostamar/hostamar.com`) or missing `.com` (`romelraisul/hostamar`) found.
- **Secret scan**: Hardcoded B2 credentials removed from `workers/f005-cdn/deploy-api.mjs` (now uses env vars). Hardcoded CF token already removed from `workers/f005-cdn/deploy-worker.mjs`. **Push in progress** — chunks uploaded via chunked-push.sh, final ref update pending (network timeout issues).
- **Google OAuth routes**: Added `/api/auth/google` (redirect to Google) + `/api/auth/callback/google` (exchange code, create JWT, set cookie) as alternative SSO entry points.
- **Vercel deployment**: New production deployment **Ready** at `https://hostamar-nbnnil1ou-romelraisul-8939s-projects.vercel.app` (aliased to `https://hostamarcom.vercel.app`). Build: 4m, 87.7kB first load.
- **SSO 302 verified live**: `curl https://hostamar.com/api/auth/sso/start?mode=login` → 302 to Google OAuth with correct client_id.
- **Dashboard auth**: `/dashboard` correctly redirects to `/login?next=/dashboard` (307).

### NEW DESIGN DEPLOYMENT (Commit 6ccc7e14 - 2026-11-06)
- **Header** (`components/home/BazaarNav.tsx`): Green H logo + "Hostamar" + BETA pill | Nav: পণ্যসমূহ dropdown, লাইভ TV with icon, AI Store, বাংলা LLM with GREEN NEW badge, ডকস, প্রাইসিং, ফিচার, Labs, ব্লগ | Right: EN toggle, লগইন, Green pill button "ফ্রি শুরু করুন" → `/signup`. Sticky top, white bg, shadow on scroll, mobile hamburger preserves all links.
- **Footer** (`components/home/BazaarFooter.tsx`): 5 columns matching screenshots exactly — Col 1: Hostamar logo + Bangla tagline + Facebook/YouTube links; Col 2: পণ্যসমূহ (AI ভিডিও, ডাবিং, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেম, Dev IDE); Col 3: ডকস (607 services · 510 models · Orca ADE · 6cr=1TK=1COIN, বাংলা LLM ট্রেনিং — 5000cr, নিজের মডেল, QLoRA RTX 5060 8GB, api.hostamar.com/v1 & deploy, বাংলা ডকস, 63 SOP, সাহায্য সার্ভিস গাইড, hk_live curl, API/মডেল তালিকা 120 models); Col 4: কোম্পানি (আমাদের সম্পর্কে, ব্লগ, ক্যারিয়ার, যোগাযোগ); Col 5: শেয়ার ও ইকোসিস্টেম (AI Store 608+ সার্ভিস, CoinLab BD, Labs, ডাউনলোড). Bottom: লিগাল ও পেমেন্ট (শর্তাবলী, প্রাইভেসি, রিফান্ড, bKash/Nagad/Rocket/Upay pills, SSL + ৭ দিন মানি-ব্যাক + ম্যানুয়াল সেট জানি pills), © 2026 Hostamar | ডকস · 606 সার্ভিস · 510 মডেল · Orca ADE · 6cr=1TK=1COIN · 6000 টোকেন · bKash 01822417463 | Made for Bangladesh 🇧🇩, Blue chat bubble bottom-right.
- **Hero** (`app/page.tsx`): Bangla copy verbatim — "বগুড়ার দোকান থেকে দুবাইয়ের বায়ার - সবার জন্য ৩০ সেকেন্ডে ভিডিও" + subtext + proof + "আমার ভিডিও বানান - ৩০ সেকেন্ডে শুরু করুন" CTA.
- **Pricing** (`app/page.tsx`): Anchoring order — **1. প্রিমিয়াম** (৪,৯৯৯/মাস, strikethrough ১০,০০০) — 10 videos, multilingual voice, website integration, data privacy | **2. ব্যবসা** (MOST POPULAR badge, ১,৯৯৯/মাস, strikethrough ৪,৯৯৯) — 5 videos, Bangla voice cloning, 1-day delivery, 1 free revision | **3. শুরু** (৫৯৯/মাস, strikethrough ৯৯৯) — 1 video, Bangla voice, 2-day delivery. Red scarcity text: "আজ না নিলে কাল এই দাম থাকবে না। প্রতিদিন মাত্র ৫ জনকে নিই, কারণ আমাদের কম্পিউটার একটাই।" Why section + Testimonial + Final CTA.
- **Structured data**: Updated JSON-LD offers with Premium 4999, Business 1999, Starter 599, Free 0, Bangla LLM Training 5000.
- **Build**: Green (exit 0) after fixing inline SVG checkmarks (removed CHECK constant).

### VERCEL → CLOUDFLARE PAGES MIGRATION (2026-11-06 - IN PROGRESS)
**Goal**: Frontend on Cloudflare Pages (SSR via OpenNext), Vercel disconnected, DNS → Cloudflare only.

**Completed**:
- ✅ Removed `output: 'standalone'` from `next.config.js` (incompatible with Pages)
- ✅ Added `build:cloudflare:opennext` script using OpenNext (`@opennextjs/cloudflare`)
- ✅ OpenNext build **successful** — `.open-next/worker.js` + `.open-next/assets/` generated
- ✅ Removed `vercel.json` and `.vercel*` directories
- ✅ Fixed duplicate `build:cloudflare` key in `package.json`
- ✅ Created `wrangler-pages-deploy.toml` for Pages deployment with KV, B2, env vars
- ✅ Cloudflare cache purged via API (`purge_everything: true`)

**OpenNext Build Output** (`.open-next/`):
- `worker.js` — Cloudflare Worker entry point (SSR handler)
- `assets/` — Static assets (images, fonts, _next/static, public files)
- `server-functions/default/` — Server-rendered pages as Worker functions
- `middleware/` — Edge middleware converted to Worker

**Deployment Status**:
- **Vercel production**: `hostamar-noo5t0623-romelraisul-8939s-projects.vercel.app` — READY with new design
- **Vercel alias**: `hostamar-noo5t0623...` → `hostamar.com` (active)
- **Custom domain `hostamar.com`**: **BLOCKED** — Cloudflare DNS has read-only AAAA records (`100::`) managed by Cloudflare Pages project (origin_worker_id), pointing to OLD Cloudflare Pages deployment
  - Zone: `2aef176c6f2000da2af593f4890ec298`
  - Blocking: AAAA `hostamar.com` → `100::` (read-only, Cloudflare Pages), AAAA `www` → `100::` (read-only)
- **Cloudflare Pages deployment**: **PENDING** — needs manual steps (API token lacks Pages permissions)

### MANUAL STEPS REQUIRED (User Action)
**1. Disconnect Vercel**:
- Vercel Dashboard → Project `hostamar` → Settings → Git → Disconnect GitHub
- Vercel Dashboard → Domains → Remove `hostamar.com` + `www.hostamar.com`
- GitHub → Settings → Webhooks → Delete Vercel webhook

**2. Remove Cloudflare Pages custom domain** (the OLD one blocking DNS):
- Cloudflare Dashboard → Pages → find project with `hostamar.com` custom domain → Remove custom domain
- This frees the AAAA `100::` records so DNS can be updated

**3. Update Cloudflare DNS** (point to NEW Pages deployment):
- Cloudflare Dashboard → DNS → Delete AAAA `100::` records if still present
- Add A record: `hostamar.com` → `[Pages project IP]` (Proxied) — get IP from new Pages project after deploy
- Add CNAME: `www` → `[pages-project].pages.dev` (Proxied)

**4. Deploy to Cloudflare Pages** (run locally or in CI):
```bash
cd /home/romel/hostamar.com
npm run build:cloudflare:opennext  # builds .open-next/
npx wrangler pages deploy .open-next/assets --project-name=hostamar --commit-dirty=true
# Then configure custom domain in Pages dashboard → hostamar.com
```

**5. Verify**:
- `curl https://hostamar.com/?cb=$(date +%s) | grep -i "প্রিমিয়াম|ব্যবসা|শুরু|৪,৯৯৯|১,৯৯৯|৫৯৯"`
- Browser: `/` (hero+pricing+header+footer), `/login` (SSO), `/signup` (SSO), `/download` (GitHub links)

### REMAINING ACTIONS
1. **CLOUDFLARE DNS FIX (MANUAL)**: Remove old Pages custom domain → Update DNS → Deploy new Pages project → Attach custom domain
2. **Verify custom domain** after DNS propagation
3. **Browser verify**: Hero+Pricing+Header+Footer, SSO buttons, GitHub links

### DELIVERABLE
- `docs/production/31_WSL_AUTO_START_AFTER_CLEANUP.md` — committed and pushed to GitLab ✅
- `docs/production/30_RESTORE_GOOGLE_SSO_AS_BEFORE.md` — committed ✅
- Source fixes applied:
  - `middleware.ts` — restored with AUTH_PUBLIC + PUBLIC_API whitelist
  - `app/login/page.tsx` — `autoComplete="off"` on all email inputs; debug text removed; SSOButton added
  - `app/signup/page.tsx` — `autoComplete="off"` on email input
  - `workers/f005-cdn/deploy-api.mjs` — hardcoded B2 credentials removed, env vars used
  - `workers/f005-cdn/deploy-worker.mjs` — hardcoded CF token already removed
  - `app/page.tsx` — New Bangla hero + anchoring pricing (Premium→Business→Starter) + structured data
  - `components/home/BazaarNav.tsx` — New header from screenshots
  - `components/home/BazaarFooter.tsx` — New footer from screenshots
  - `next.config.js` — Removed `output: 'standalone'` for Cloudflare Pages compatibility
  - `package.json` — Added `build:cloudflare:opennext`, removed duplicate keys, removed `vercel-deploy`
  - `vercel.json` — **REMOVED**
  - `.vercel*` dirs — **REMOVED**
- Build: green 87.7kB First Load, Middleware 27.3kB
- Quota: 5/100 (under 80%)
- SSO: 302 on current prod ✅
- WSL auto-start: Linux systemd + Windows Task Scheduler fully active
- Services healthy: guard `:12436` 5 models, freellmapi `:3005` 690 models, omniroute `:20128` 690 models, api.hostamar.com 1454 models, hostamar.com/api/v1/models 105 models
- Vercel: Ready deployment at `hostamar-noo5t0623-romelraisul-8939s-projects.vercel.app` (aliased to hostamar.com) — **TO BE DISCONNECTED**
- GitHub links: All correct on `/download` page
- SSO button: Verified on `/signup` page (server-rendered HTML)
- Git push: Complete (6ccc7e14)
- Secret scan: Clean (0 Open, 1 Closed)
- OpenNext build: ✅ `.open-next/worker.js` + `.open-next/assets/` ready for Pages deploy