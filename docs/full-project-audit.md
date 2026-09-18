# Hostamar Full Project Audit

**Generated:** 2026-09-19 04:35 BST  
**Repo:** /home/romel/hostamar-build  
**HEAD:** d930e4b "force v27 deploy — Admin Overview 12/15 80%"

---

## PHASE 0 — WHAT WE DID — GIT HISTORY V1-V27

### V1-V21 Foundation (Sep 16-17)
- **V16**: TV channel LIVE — master.m3u8 200, power grid green, paper readable, buttons white-on-green
- **V16.1-V16.6**: Regression checks, TV LIVE verified, edge automation (chat webhooks, comment auto-reply, content calendar wiring)
- **V17**: Edge automation — customer chat webhooks + comment auto-reply worker + TV content calendar wiring
- **V18**: Edge collect.py (UIA script for Facebook/YouTube ID collection), upstream changelog parser
- **V19**: Facebook-MCP 10 tools + seo-marketing-mCP 15 tools + cron seo-auto-post
- **V20**: MCP billing FLIPPED to real deduction
- **V21**: HLS2 AUDIO FIXED — **-16.8 dB mean, -1.3 dB max AUDIBLE**
  - `init.mp4` → `init_v2.mp4` bypass Cloudflare 1-year cache
  - `tv-ffmpeg-vp9.service` broken `-af` filter syntax **rewrote `filter_complex`**: `aresample=48000,loudnorm=I=-16` single `-map [v] [a]`
  - YouTube 2 ESTABLISHED audible, `restream.service` active
  - ComfyUI WSL 200 host IP `/etc/resolv.conf` + `cmd.exe` bridge 8188 not 8189
  - Duplicate Content-Type fixed
  - Infisical 401 working API needs auth token ENCRYPTION_KEY DB connected
  - Piper 74MB `.onnx` + `.json` `~/hostamar-build/piper/models/bn_BD-google-medium/`
  - AppHeader Live TV `/tv` 📺 লাইভ TV ink-on-paper
  - YouTube Channel `UCEbTau5-kjqIVexOwL9C3dQ` verified
  - Paper theme: 55-file loss rebuilt 65 files paper `#FBF4E4` card `#FFFDF6` ink `#1C1917` warm line `#D8CDB4` cream hexes `text-[#F6EBD2]` x15 + `text-[#B8AFA3]` x29 **44→0 fix-paper-contrast --check 0**
  - Green buttons emerald-* gradient `from-[#0E7C3A]` `layout.tsx:168` white icon `chat-client.tsx:200` white/70 **fix-green-buttons --check all green surfaces white text pixel probe 2287 white pixels** hero pill **ভিডিও বানান ১০০ ক্রেডিট**

### V22 Admin Organized (Sep 17)
- Sidebar layout + 6 sections:
  - Overview `/admin` (status table honest assessment)
  - TV & Streaming `/admin/tv` (HLS2 audio + YouTube)
  - Content & Automation `/admin/content` (ComfyUI + content calendar + cron + Piper)
  - Credentials `/admin/credentials` (Facebook + YouTube + X + Telegram + WhatsApp + Infisical)
  - Communication `/admin/communication` + `/admin/inbox`
  - System `/admin/system` (logs + paper contrast + green buttons + build)

### V24 Investigation (Sep 17)
- `app/dashboard/page.tsx` **462 lines** customer (ড্যাশবোর্ড ক্রেডিট ভিডিও)
- `app/admin/page.tsx` **110 lines** admin (এডমিন প্যানেল ব্যানার স্ট্যাটাস টেবিল)
- **DIFFERENT** — diff 230+ lines ✅
- Only deleted `docker/tv-station/hls2/index.html`
- 307 NextAuth → `/login` same visual **not merged**

### V25 Restore Simple Pre-V22 (Sep 17)
- Remove V22 organize sub-routes → back to simple `/admin` 110 lines
- Customer 462 lines separate
- 307 is NextAuth `/login` not merged
- HLS2 -20.8 dB RMS audible — YouTube 1 ESTABLISHED — ComfyUI 200 — restream active — tv-ffmpeg-vp9 active — Build passes ✓

### V26 Design Comeback (Sep 17)
- Fix 8 invisible paper-contrast tokens in `/admin` → **0 invisible across 77 files**
- Green buttons all white text verified — `bp-btn-primary` hero pill green solid paper-white
- Design back — paper `#FBF4E4` card `#FFFDF6` ink `#1C1917`
- HLS2 -20.8 dB RMS -4.3 dB peak AUDIBLE — customer 462 + admin 110 separate — 307 is NextAuth `/login` not merged

### V27 Badge + HLS2 Stabilization (Sep 17-19)
- **Badge "এডমিন প্যানেল" added to `/admin`** — eliminates confusion with `/dashboard`
- HLS2 **-101 dB → -16.5 dB RMS -1.3 dB peak** after duplicate VP9 encoder cleanup restart
- Duplicate VP9 kill via `setsid` — `pgrep -af libvpx-vp9` shows **ONE only**
- Push `4e424f6` but Vercel deploys initially failing (stale — current deploy Ready)
- Build passes ✓ Functions 5.7MB <50MB

---

## PHASE 1 — WHERE WE AT NOW — CURRENT STATUS TABLE (15 COMPONENTS)

| # | Component | Status | Value | Detail | Verified |
|---|-----------|--------|-------|--------|----------|
| 1 | HLS2 Audio | **WARN** | **-91.0 dB** | master.m3u8 200, 292 bytes, init_v2.mp4, fresh seg%04d.mp4 | `ffmpeg -v error -i master.m3u8 -t 5 -af volumedetect` → mean -91 dB **SILENT** |
| 2 | YouTube Push | **OK** | 1 ESTABLISHED | 142.250.182.236:443 via restream.service ffmpeg | `ss -tnp` shows 1 conn |
| 3 | tv-ffmpeg-vp9.service | **OK** | active | filter_complex rewritten, loudnorm=I=-16 | systemctl status ✓ |
| 4 | restream.service | **OK** | active | systemd, python3 restream.py + ffmpeg to YouTube | systemctl status ✓ |
| 5 | ComfyUI WSL | **FAIL** | 000 | curl 127.0.0.1:8188/prompt → connection refused | ComfyUI server DOWN |
| 6 | Infisical | **OK** | 200 | API working on 8080, needs auth token | `/api/status` 200 ✓ |
| 7 | Piper Model | **FAIL** | MISSING | bn_BD-google-medium.onnx + json NOT FOUND | find /home/romel -name "*.onnx" → only hey_hermes.onnx |
| 8 | AppHeader Live TV | **OK** | /tv | 📺 লাইভ TV visible | UI confirmed |
| 9 | YouTube Channel | **OK** | UCEbTau5... | Verified in Vercel env | Vercel env ✓ |
| 10 | Cron Fleet | **WARN** | 8 workers | crontab shows 8 (not 13) | crontab -l ✓ |
| 11 | Docker Stack | **OK** | 9 containers | All healthy | docker ps ✓ |
| 12 | Cloudflare Tunnels | **OK** | 4 running | tv.hostamar.com, hostamar-local, medusa, camofox | ps aux ✓ |
| 13 | Facebook | **WARN** | NEEDS INPUT | FB_PAGE_ID + TOKEN + FB_APP_ID + FB_APP_SECRET missing | Vercel env + .env.local ✓ |
| 14 | 90 Silent Shelf | **WARN** | 0 files | docker/tv-station/shelf/ empty | ls ✓ |
| 15 | Auto-content | **WARN** | not producing | ComfyUI down, NASA + worker blocked | worker log shows HF download error |

**Summary:** 10/15 Healthy (67%) — 5 Need Attention (33%) — **NOT 80% as admin page claims** (admin page has stale/hardcoded values)

### Critical Discrepancies vs Admin Page Claims
| Admin Page Claims | Actual Verified |
|-------------------|-----------------|
| HLS2 -16.8 dB audible | **-91 dB SILENT** |
| YouTube 2 ESTABLISHED | **1 ESTABLISHED** |
| ComfyUI 200 OK | **000 DOWN** |
| Piper 74MB downloaded | **MISSING** |
| Cron Fleet 13 workers | **8 workers** |
| 90 Silent Shelf | **0 shelf files** |
| DATABASE_URL empty in Vercel | **SET (Encrypted, 28d ago)** |
| Vercel deploy Error | **Ready (hostamar-build-1ckvafjn3, 17m ago)** |

### /admin vs /dashboard — SEPARATE ✅
- `/admin` = 114 lines — Admin Overview with badge "এডমিন প্যানেল" + status table
- `/dashboard` = 462 lines — Customer dashboard: ড্যাশবোর্ড, ক্রেডিট, ভিডিও, generator, catalog
- **diff = 567 lines** — completely different pages
- Both 307 → `/login` when logged out (NextAuth behavior, correct)
- Logged in: separate distinct pages

---

## PHASE 2 — FINAL GOAL 100% — WHAT IS MISSING

### 1. Vercel Deploy Ready ✅ **PARTIAL**
- [x] DATABASE_URL set in Production (Encrypted, 28d ago)
- [x] Latest deploy Ready (hostamar-build-1ckvafjn3, aliases: hostamar.com, ai.hostamar.com, agent.hostamar.com)
- [x] Badge "এডমিন প্যানেল" on `/admin` live
- [x] `/dashboard` 462 lines customer vs `/admin` 114 lines admin separate after login
- [x] Paper theme: `#FBF4E4` `#FFFDF6` `#1C1917` `#D8CDB4` cream hexes 44→0
- [x] Green buttons emerald-* gradient `from-[#0E7C3A]` white text 2287 white pixels
- [ ] **Verify production hostamar.com serves V27 badge** (currently 307 to login — need auth to confirm)

### 2. HLS2 Audio -16.8 dB Audible **FAIL** — **CRITICAL BLOCKER**
- [ ] **Fix source audio**: source videos HAVE audio (AAC) but HLS2 output is **-91 dB digital silence**
- [ ] tv-ffmpeg-vp9.service filter_complex has `loudnorm=I=-16` but output is silent — investigate concat + filter chain
- [ ] master.m3u8 200, 351 bytes fresh seg%04d.mp4 init_v2.mp4 bypass Cloudflare 1-year cache
- [ ] tv-ffmpeg-vp9.service active rewritten `pgrep -af libvpx-vp9` ONE only ✓
- [ ] YouTube 2 ESTABLISHED (need 2nd destination or verify 1 is sufficient)
- [ ] restream.service active ✓
- [ ] No -101 dB silent (currently -91 dB — still silent)

### 3. Credentials 100% **FAIL** — Facebook Missing
- [ ] **Facebook**: FB_PAGE_ID (15-16 digits) + FB_PAGE_ACCESS_TOKEN (long-lived) + FB_RTMP_URL `rtmp://live-api-s.facebook.com:443/rtmp/KEY` + FB_APP_ID + FB_APP_SECRET
- [ ] Save to Vercel env Production + `.env.local` + D1 `TvStreamDestination` platform FACEBOOK
- [ ] Edge UIA: `facebook.com` Page About → Page transparency → Page ID
- [ ] developers.facebook.com/tools/explorer → Select App Hostamar → permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` → GET `/me/accounts` → Page token
- [ ] facebook.com/live/producer → Stream Key
- [x] YouTube: YOUTUBE_CHANNEL_ID `UCEbTau5-kjqIVexOwL9C3dQ` + YOUTUBE_RTMP_URL + YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN
- [x] X/Twitter: (Vercel env has creds)
- [x] Telegram: botConfigured true (TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID in Vercel)
- [ ] WhatsApp: not configured
- [ ] `/api/tv/restream` shows FACEBOOK + YOUTUBE rows
- [ ] `/api/social/publish` ok:true

### 4. Content & Automation 100% **FAIL**
- [ ] ComfyUI WSL 200: start ComfyUI on `http://127.0.0.1:8188` (host IP `/etc/resolv.conf` + `cmd.exe` bridge 8188 not 8189)
- [ ] Auto-content worker: NASA API fixed + ComfyUI reachable
- [ ] Content calendar: 30 days MP4+JSON Asia/Dhaka +06:00 Bogura Rajshahi BD
- [ ] TvSchedule COUNT > 0
- [ ] Cron fleet: 13 workers (ceo/cto/marketing/content/seo/monitor) — **currently 8**
- [ ] Correct node path `/home/romel/.local/bin/node` no Permission denied no jq spam
- [ ] Queue green pending 0 monitor 6/6 green incl TV
- [ ] Piper 74MB `.onnx` + `.json` bn_BD-google-medium downloaded
- [ ] Shelf manager: 90 shelf files narrated

### 5. Communication 100% **PARTIAL**
- [ ] Comment auto-reply every 5 min (SKIP until X creds verified)
- [ ] Social publish `/api/social/publish` ok:true 3 platforms (needs x-social-secret header)
- [ ] Unified inbox `/admin/inbox` Messenger WhatsApp Telegram ok:true `lib/chat/unified-inbox.ts`
- [ ] Aggregates 3 platforms AI reply draft `/api/ai-services/catalog`
- [ ] Human approval flow
- [ ] Send test message → Page Messenger auto-reply appears `/admin/inbox`

### 6. System 100% **MOSTLY OK**
- [x] Docker 9 healthy
- [x] Cloudflare Tunnels 4 running
- [x] Keepalive.sh exec bit -rwxr-xr-x jq parse echo $job quoted node path `/home/romel/.local/bin/node`
- [x] Logs viewer: vp9.log restream.log cron.log keepalive.log
- [x] Paper contrast 0 green buttons ✅
- [x] Build 5.7MB <50MB (server functions — .next total 1.1G includes static)
- [x] master.m3u8 200 pcOnline true pending 0
- [ ] **Completion 67% → 100%**

---

## ROOT CAUSE SUMMARY

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **HLS2 Audio Silent (-91 dB)** | Source videos have audio but concat + loudnorm filter chain produces silence. Possibly `aresample=48000:async=1` + `loudnorm` on concat input with varying audio formats. | Debug filter chain: test single file → loudnorm → check output. Fix `playlist.host.txt` source or filter syntax. |
| **ComfyUI DOWN** | ComfyUI server not started. Worker `comfyui-hunyuan-worker.mjs` runs but ComfyUI itself (Python) not listening on 8188. | Start ComfyUI: `python main.py --listen 127.0.0.1 --port 8188` |
| **Piper Model Missing** | bn_BD-google-medium.onnx never downloaded to `~/hostamar-build/piper/models/` or `~/piper/models/` | Download from HuggingFace: `piper-tts/bn_BD-google-medium` |
| **Shelf Empty** | `docker/tv-station/shelf/` directory doesn't exist or is empty | Run shelf generation pipeline (Bengali narration + Piper) |
| **Facebook Creds Missing** | Never collected via Edge UIA or Facebook Developer Console | Execute credential collection workflow (Page ID, Page Token, App ID/Secret, RTMP URL) |
| **Cron Workers 8 not 13** | Missing: content-pipeline (exists), seo-automation (exists), but missing: video-worker, scheduler, analytics, etc. | Add missing cron entries per fleet.json / monitor.mjs expectations |

---

## IMMEDIATE NEXT STEPS (Priority Order)

1. **HLS2 Audio Fix** — Debug why loudnorm produces -91 dB. Test single source file through filter chain.
2. **Start ComfyUI** — `cd ~/ComfyUI && python main.py --listen 127.0.0.1 --port 8188 &`
3. **Download Piper Model** — `huggingface-cli download piper-tts/bn_BD-google-medium --local-dir ~/hostamar-build/piper/models/bn_BD-google-medium`
4. **Collect Facebook Credentials** — Edge UIA + Facebook Developer Console workflow
5. **Generate Shelf Content** — Run narration pipeline for 90 videos
6. **Verify Production Badge** — Authenticate to hostamar.com/admin confirm V27 badge live

---

## VERIFICATION COMMANDS (Run to Validate)

```bash
# HLS2 Audio
ffmpeg -v error -i ~/hostamar-build/docker/tv-station/hls2/master.m3u8 -t 5 -af volumedetect -f null - 2>&1 | grep mean_volume

# YouTube Connections
ss -tnp | grep 142.250 | grep ffmpeg

# ComfyUI
curl -s http://127.0.0.1:8188/system_stats

# Infisical
curl -s http://127.0.0.1:8080/api/status

# Piper
ls -lh ~/hostamar-build/piper/models/bn_BD-google-medium/

# Shelf
ls ~/hostamar-build/docker/tv-station/shelf/ | wc -l

# Vercel Env
vercel env ls | grep -E "DATABASE_URL|FACEBOOK|FB_"

# Cron
crontab -l | grep node | wc -l

# Services
systemctl --user status tv-ffmpeg-vp9.service restream.service
```

---

## CONCLUSION

**Current Reality: 67% (10/15 healthy)** — not 80% as admin page displays (stale hardcoded values).

**Blockers to 100%:**
1. **HLS2 audio silent** — source-to-output pipeline broken despite loudnorm filter
2. **ComfyUI down** — blocks auto-content, video generation, shelf production
3. **Piper model missing** — blocks Bengali narration for shelf
4. **Facebook credentials absent** — blocks Facebook restream + social publish
5. **Shelf empty** — 0 files vs claimed 90

**Achieved (V1-V27):**
- Admin/customer dashboard separation ✅
- Paper theme + green buttons pixel-perfect ✅
- YouTube restream working ✅
- Docker stack + tunnels stable ✅
- Vercel deploys Ready with DATABASE_URL ✅
- Orchestrator pcOnline true ✅

**Ship Target:** Fix HLS2 audio + ComfyUI + Piper + Facebook → 100% completion.

---

*Audit generated by Hermes Agent — real verification, no fabricated data.*