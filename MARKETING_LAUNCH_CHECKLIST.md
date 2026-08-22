# HOSTAMAR — MARKETING LAUNCH CHECKLIST
Generated: 2026-08-22 · Post Phase 0–5 build (all phases green)

## ✅ DONE (verified live on hostamar.com)

### Payments — Personal Send Money (no merchant needed)
- [x] `/api/payments/personal-config` → enabled, real numbers (bKash 01822417463, Nagad 01711317101, Rocket 01822417463)
- [x] `/api/payments/verify-manual` → validates TrxID regex, ±1 Tk tolerance, duplicate check, 15-min expiry, rate limit 5/min
- [x] `/api/payments/sms-webhook` → auto-match incoming SMS (bKash Sync pattern), HMAC-secret protected
- [x] `/api/admin/payments/verifications` → PENDING queue, approve/reject, one-click credit grant
- [x] Full flow tested: submit TrxID → PENDING → admin approve → VERIFIED + credits + subscription
- [x] Payment UI panel at /dashboard/payment (Bangla instructions, copy buttons, QR)
- [x] Android SMS-sync setup doc: docs/personal-payment-android-setup.md

### Affiliate Program — 20% recurring
- [x] `/api/affiliate` → code + referral link + earnings (verified: commissionRate 0.2)
- [x] `/api/affiliate/track` → public attribution endpoint + cookie
- [x] Signup page captures `?ref=CODE` automatically
- [x] Commission recorded on every verified payment (lib/affiliate.ts)
- [x] /dashboard/affiliate — earnings, referral link, commission history

### API Keys
- [x] `/api/keys` — create/list/delete, Bearer auth, per-key rate limit (verified live)
- [x] /dashboard/api-keys UI

### Team Workspaces
- [x] `/api/team` — create workspace, list members + pending invites
- [x] `/api/team/invite` — email invite with 7-day token
- [x] `/api/team/accept` — join via token
- [x] /dashboard/team + /team/accept pages

### User Webhooks
- [x] `/api/webhooks/user` — CRUD, HMAC-SHA256 signed deliveries
- [x] `video.completed` event dispatched from render pipeline (lib/video-renderer.ts)

### 24/7 AI TV Station
- [x] Models: TvChannel, TvPlaylistItem, TvStreamDestination, TvSchedule
- [x] `/api/tv/status` → public, verified live (autoGenerateEnabled: true)
- [x] `/api/tv/playlist` → public
- [x] `/api/tv/generate` → admin manual generate (RSS → prompt → real orchestrator)
- [x] `/api/tv/generate-loop` → CRON_SECRET-protected, Vercel cron daily 03:00
- [x] `/api/tv/stream/start|stop` → admin, FFmpeg multi-dest command builder
- [x] `/api/tv/destinations` → admin CRUD (YOUTUBE/FACEBOOK/TWITCH/CUSTOM)
- [x] /dashboard/tv — live badge, start/stop, generate, destinations, playlist
- [x] /tv — public watch page (YouTube-TV style)
- [x] docker/tv-station — nginx-rtmp + FFmpeg auto-streamer (docker compose up)

### Products — 2026 feature flags
- [x] `/api/products` → 6 products with featureFlags (verified live)
- [x] `/api/pricing` → 200

### Env consolidation
- [x] lib/env.ts — zod-validated single source of truth
- [x] Single .env.example (documented) + .env.local (gitignored)
- [x] 17 legacy env files archived to legacy-env-archive/ (gitignored)
- [x] scripts/sync-vercel-env.js + sync-vercel-env-critical.js (add-first, safe)
- [x] Removed unauthenticated /api/debug + /api/debug/env (security fix)

## 🔴 ACTION REQUIRED FROM ROMEL (cannot be automated)

### 1. bKash merchant credentials (optional — personal flow works without)
The stored BKASH_APP_KEY/SECRET/USERNAME/PASSWORD are rejected by bKash's live
gateway ("Invalid or unrecognized access credentials"). Personal Send Money flow
works regardless. If you get valid merchant creds later, update the 4 BKASH_* vars.

### 2. TV stream keys (for going live on YouTube/Facebook/Twitch)
Set these in Vercel + .env.local, then add destinations via /api/tv/destinations:
- YOUTUBE_STREAM_KEY   (YouTube Studio → Go Live → Stream key)
- FACEBOOK_STREAM_KEY  (Facebook Live → streaming software → key)
- TWITCH_STREAM_KEY    (Twitch → Settings → Stream)
Then: POST /api/tv/stream/start, and run `docker compose -f docker/tv-station/docker-compose.yml up -d`
on a machine with ffmpeg + always-on internet.

### 3. 30-min TV auto-generate (Vercel Hobby = 1 daily cron only)
Vercel cron runs /api/tv/generate-loop daily at 03:00. For 30-min frequency use a
free external cron (e.g. cron-job.org) hitting:
  POST https://hostamar.com/api/tv/generate-loop
  Header: Authorization: Bearer <CRON_SECRET>

### 4. Android SMS sync app (for auto payment verification)
Install bKash Sync (or Tasker) on the phone holding the personal bKash number.
Point its webhook at: POST https://hostamar.com/api/payments/sms-webhook
Header: x-sms-secret: <SMS_WEBHOOK_SECRET>
Setup guide: docs/personal-payment-android-setup.md

## 📋 SEO / LAUNCH (next session)
- [ ] OG images for /, /products/*, /tv
- [ ] sitemap.xml + robots.txt audit
- [ ] Meta descriptions for all 104 pages (many use defaults)
- [ ] Structured data (Organization, Product, VideoObject)
- [ ] Google Search Console + Bing Webmaster submit
- [ ] Social accounts: link affiliate program in bio

## 🔐 SECURITY NOTES
- /api/debug removed (was leaking env unauthenticated)
- All admin routes use requireAdmin (cookie auth)
- SMS webhook + cron loop secret-protected
- Webhook deliveries HMAC-signed (x-hostamar-signature)
- VERCEL_OIDC_TOKEN junk removed from .env.local (was a leaked runtime token)
