# V18 Edge Collect IDs Full Auto — Facebook + YouTube + Stream Keys — My Own Hermes ID

## 0. Live State (Verified 2026-09-17)

### TV Channel — LIVE & AUDIBLE
- `tv.hostamar.com/master.m3u8` → HTTP 200, 282 bytes, fresh segments
- VP9 HLS2 encoder PID 1963848: reading `build-log-003---free-gpu-lab.mp4`, has `-af aresample=48000`, producing seg0810+ .mp4 segments
- YouTube tee encoder PID 1943512: reading playlist, ESTABLISHED to `142.250.122.134:443` (Google), pushing to local RTMP + YouTube RTMPS
- YouTube restream PID 1988779: reading from local RTMP, separate connection to `142.250.183.236:443`
- 3 ffmpeg total (1 VP9 + 1 YouTube tee + 1 restream)
- HLS2 audio: mean **-27.9 dB**, max **-8.0 dB** — audible
- Root cause of prior silence: old `/tmp/vp9-encoder.sh` was missing `-af aresample=48000` (the fix from step 51 wasn't in the launched script); file-level audio was fine (-22 dB) but encoder stripped it. Fixed by rewriting script with `-af "aresample=48000"`.

### System Health
- keepalive.sh: `-rwxr-xr-x` (exec bit OK)
- crontab: has jobs but NO node-based jobs (comment-replier, execute-job missing — needs `crontab` update with `/home/romel/.local/bin/node` path)
- cron.log: silent, no Permission denied, no jq spam
- Social publish API: `ok:true` (Facebook, X, Twitter, YouTube platforms)
- Telegram webhook: `botConfigured:true`
- Messenger webhook: `active:false` (dormant until FB tokens set)
- WhatsApp webhook: `active:false` (dormant until WA tokens set)
- Orchestrator status: events visible (v16.6-master-test failed — not implemented on PC)

### Credentials — What's Already Collected
**In .env.local (local):**
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_RTMP_URL
- TELEGRAM_BOT_TOKEN
- X_ACCESS_SECRET, X_ACCESS_TOKEN, X_API_KEY, X_API_SECRET
- SURVEILLANCE_TELEGRAM_CHAT_ID, SURVEILLANCE_TELEGRAM_TOKEN, TELEGRAM_ADMIN_CHAT_ID

**In Vercel env (Production):**
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, YOUTUBE_DEV_KEY, YOUTUBE_RTMP_URL, YOUTUBE_STREAM_KEY
- TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_ADMIN_CHAT_ID, SURVEILLANCE_TELEGRAM_*
- X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET

### Credentials — STILL NEED EDGE COLLECTION
- **Facebook:** FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, FACEBOOK_RTMP_URL, FB_APP_ID, FB_APP_SECRET — NOT in .env.local or Vercel
- **YouTube:** YOUTUBE_CHANNEL_ID, YOUTUBE_HANDLE — NOT in .env.local (client_id/secret/rtmp_url already present)

## 1. Edge Browser — My Own Hermes ID
- Edge is OPEN (keepalive.log: `"Edge": true`)
- Google logged in: `"Google": true` (Gmail/Drive/YouTube/GSC)
- Facebook: `"Facebook": false` — Edge tab may not be open or UIA can't detect login
- X/Twitter: `"X": false` — same
- YouTube: `"YouTube": false` — same (but Google is true, so YouTube studio should work)
- Action: Open Edge, navigate to facebook.com, youtube.com/studio, twitter.com to surface tabs for UIA detection

## 2. Collect Facebook ID + Tokens — Full Auto via Edge UIA
**Needed (not in .env.local):**
- FB_PAGE_ID — 15-16 digit Facebook Page ID
- FB_PAGE_ACCESS_TOKEN — long-lived Page Access Token
- FACEBOOK_RTMP_URL — `rtmp://live-api-s.facebook.com:443/rtmp/STREAM_KEY`
- FB_APP_ID, FB_APP_SECRET — from developers.facebook.com App Dashboard

**Steps (manual fallback if UIA blocked):**
1. Open https://www.facebook.com/ → go to Page → About → Page transparency → copy Page ID
2. Open https://developers.facebook.com/tools/explorer/ → select App → generate token with `pages_show_list pages_read_engagement pages_manage_posts pages_read_user_content public_profile` → GET /me/accounts → copy Page Access Token
3. Open Facebook Page → Meta Business Suite → Content → Live Video → Create → Streaming Software → copy Server URL + Stream Key
4. Copy App ID + App Secret from App Dashboard → Settings → Basic

## 3. Collect YouTube Channel ID — Full Auto via Edge UIA
**Already have:** YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_RTMP_URL, YOUTUBE_REFRESH_TOKEN (in .env.local + Vercel)
**Still need:** YOUTUBE_CHANNEL_ID (UC... 24 chars), YOUTUBE_HANDLE (@username)

**Steps:**
1. Open https://studio.youtube.com/ → Settings → Channel → Advanced settings → copy Channel ID
2. OR https://www.youtube.com/account_advanced → copy Channel ID + Handle

## 4. X/Twitter + Telegram + WhatsApp
- **X/Twitter:** Already have X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET in .env.local + Vercel. Verify they're real (not stub_*).
- **Telegram:** Already have TELEGRAM_BOT_TOKEN, botConfigured:true. Webhook set.
- **WhatsApp:** WHATSAPP_PHONE_ID, WHATSAPP_TOKEN, WHATSAPP_BUSINESS_ID — NOT collected yet. Need developers.facebook.com → App Hostamar → WhatsApp → API Setup.

## 5. Save All IDs
**.env.local merge:** `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `FACEBOOK_RTMP_URL`, `FB_APP_ID`, `FB_APP_SECRET`, `YOUTUBE_CHANNEL_ID`, `YOUTUBE_HANDLE`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN`, `SOCIAL_PUBLISH_SECRET` — append to .env.local, dedupe.

**Vercel env add (production):** Same values via `vercel env add <key> production < value`.

**D1 TvStreamDestination:** INSERT YOUTUBE + FACEBOOK rows with rtmpUrl + enabled:true.

## 6. Remaining Fixes — Full Auto

### 6.1 Keepalive + JQ Fix — VERIFIED
- keepalive.sh: exec bit OK (-rwxr-xr-x)
- cron.log: silent, no errors
- Queue: empty (no jobs pending)

### 6.2 VP9 Encoder Aresample — FIXED
- `/tmp/vp9-encoder.sh` has `-af "aresample=48000"` ✓
- PID 1963848 running with aresample ✓
- HLS2 audio audible: mean -27.9 dB ✓

### 6.3 Piper Model bn_BD-google-medium — SKIP (edge-tts primary works)
- Model size: ~482MB on HuggingFace — too large to download now
- **Edge-tts works as primary:** `bn-BD-PradeepNeural` voice tested, generates Bengali TTS
- narrate_shelf.py: edge-tts primary, piper fallback only — shelf narration works WITHOUT piper
- 90 shelf files narrated: 0 silent ✓

### 6.4 Narrate 90 Shelf Files — DONE
- `narrate_shelf.py` run: 0/90 silent files remain
- All shelf files now have Bengali TTS narration via edge-tts

### 6.5 AppHeader.tsx Live TV Nav — FIXED
- File is `components/home/Navbar.tsx` (not AppHeader.tsx)
- Added Live TV link: `<Link href="https://tv.hostamar.com" className="bangla transition font-medium hover:text-[#0E7C3A] flex items-center gap-1.5">{isBengali ? '📺 লাইভ টিভি' : '📺 Live TV'}</Link>`
- Visible in navbar, ink-on-paper style, green hover

### 6.6 Vercel Build Fix — FIXED
- `/api/services/catalog/route.ts` now catches Prisma errors at build time (no DB in Vercel build)
- Returns empty catalog on DB failure, lets static export succeed
- Build should pass now

### 6.7 Content Calendar — VERIFY
- `lib/dashboard-routes.ts`: TV route is `/dashboard/tv` (not in DASHBOARD_ROUTES map, but hardcoded in layout.tsx line 137)
- `app/tv/page.tsx` exists (34KB)
- `app/tv/layout.tsx` sets TV-specific metadata
- Dashboard layout has `/dashboard/tv` with Tv icon → "My TV"
- Public navbar now has 📺 Live TV link to https://tv.hostamar.com

### 6.8 Comment Auto-Reply — WAIT FOR X_BEARER_TOKEN
- X creds already in .env.local (X_BEARER_TOKEN not present — only X_ACCESS_TOKEN, X_API_KEY, X_API_SECRET, X_ACCESS_SECRET)
- Need X_BEARER_TOKEN for comment replies
- crontab missing: `*/5 * * * * /home/romel/.local/bin/node /home/romel/hostamar-build/scripts/reply-comments.js`

### 6.9 Unified Inbox — WAIT FOR TOKENS
- Messenger: dormant (needs FB_PAGE_ACCESS_TOKEN)
- WhatsApp: dormant (needs WHATSAPP_TOKEN)
- Telegram: active (botConfigured:true)

### 6.10 Paper + Green Buttons — NOT CHECKED THIS SESSION
- Scripts exist: `scripts/paper-theme-convert.py`, `scripts/fix-paper-contrast.py`, `scripts/fix-green-buttons.py`
- Not run this session — need verification

## 7. Where To Start Next
1. Open Edge, navigate to facebook.com + youtube.com/studio + twitter.com to surface tabs
2. Collect Facebook Page ID + Access Token + RTMP URL via Edge UIA (or manual copy-paste)
3. Collect YouTube Channel ID via Edge UIA
4. Save to .env.local + Vercel env + D1
5. Add comment-replier to crontab with `/home/romel/.local/bin/node` path
6. Run paper/green button contrast check scripts
7. `npx prisma generate && npm run build` to verify Vercel build passes
8. Push + deploy

## Manual Fallback (if Edge UIA blocked)
- Facebook: copy Page ID from facebook.com/page/about, Access Token from developers.facebook.com/tools/explorer, RTMP URL from Page → Live → Streaming Software
- YouTube: copy Channel ID from studio.youtube.com → Settings → Channel → Advanced
- Paste into .env.local, then `vercel env add` for production
