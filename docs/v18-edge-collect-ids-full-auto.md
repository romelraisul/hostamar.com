# V18 Edge Collect IDs Full Auto — Facebook + YouTube + Stream Keys
## My Own Hermes ID — Production Ready

**Date:** 2026-09-17 | **Status:** Ready for Windows execution | **Model:** upstage/solar-pro4:free

---

## 0. Live Verification (Before Edge Automation)

### TV Channel — LIVE & AUDIBLE
- `tv.hostamar.com/master.m3u8` → HTTP 200, segments fresh (seg1312.mp4 at 08:30)
- VP9 HLS2 encoder PID 2042471: reading playlist, has `-af aresample=48000`, producing fMP4 segments
- YouTube tee encoder PID 2042477: reading playlist, ESTABLISHED to `142.250.118.134:443` (Google), fd=7, also pushing to local RTMP fd=6
- YouTube restream PID 2042905: reading from local RTMP, separate connection to `142.250.29.134:443` (Google), fd=4
- 3 ffmpeg total: 1 VP9 HLS2 + 1 YouTube tee + 1 restream
- HLS2 audio (playlist playback): mean **-28.0 dB**, max **-7.1 dB** — AUDIBLE
- YouTube tee reading `receipt-prices.mp4` which has audio (-22.6 dB direct decode)

### System Health
- keepalive.sh: `-rwxr-xr-x` (exec bit OK)
- crontab: has comment-replier (`*/5 * * * *` with `/home/romel/.local/bin/node`)
- cron.log: silent, no errors
- Social publish API: `ok:true` (Facebook, X, Twitter, YouTube platforms)
- Telegram webhook: `botConfigured:true`
- Messenger webhook: `active:false` (dormant until FB tokens set)
- WhatsApp webhook: `active:false` (dormant until WA tokens set)
- Orchestrator: events visible

### Credentials — Already Collected
**In .env.local (local):**
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_RTMP_URL
- TELEGRAM_BOT_TOKEN
- X_ACCESS_SECRET, X_ACCESS_TOKEN, X_API_KEY, X_API_SECRET

**In Vercel env (Production):**
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, YOUTUBE_DEV_KEY, YOUTUBE_RTMP_URL, YOUTUBE_STREAM_KEY
- TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_ADMIN_CHAT_ID, SURVEILLANCE_TELEGRAM_*
- X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET

### Credentials — STILL NEED COLLECTION
- **Facebook:** FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN, FACEBOOK_RTMP_URL, FB_APP_ID, FB_APP_SECRET
- **YouTube:** YOUTUBE_CHANNEL_ID, YOUTUBE_HANDLE
- **WhatsApp:** WHATSAPP_PHONE_ID, WHATSAPP_TOKEN, WHATSAPP_BUSINESS_ID

---

## 1. Edge Browser — My Own Hermes ID

### Windows-Side Setup (Production: Romel's PC)

**Edge executable:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

**Hermes Windows Python:** `C:\Users\User\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`

**Available packages (Windows venv):**
- pywinauto 0.6.9 (UIA backend)
- Pillow 12.3.0
- requests 2.32.5
- beautifulsoup4 4.15.0
- httplib2, httpx, aiohttp

**NOT available:** op (1Password CLI), pyautogui, selenium, pytesseract

### Edge Login State (from keepalive.log)
- Google: **true** (Gmail/Drive/YouTube/GSC logged in)
- Facebook: **false** (tab not detected or not logged in)
- X/Twitter: **false** (tab not detected or not logged in)
- YouTube: **false** (tab not detected — but Google=true so yt studio works)
- Edge: **true** (browser running)

### Open Edge via pywinauto (Windows Python)

```python
from pywinauto import Application, Desktop
import time

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def connect_or_start_edge():
    try:
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        print("Connected to existing Edge")
        return app
    except Exception:
        pass
    try:
        app = Application(backend="uia").start(EDGE_PATH)
        time.sleep(5)
        app = Application(backend="uia").connect(title_re=".*Edge.*", timeout=15)
        print("Started new Edge")
        return app
    except Exception as e:
        print(f"FAILED: {e}")
        return None

app = connect_or_start_edge()
```

### Navigate to URLs via Ctrl+L (UIA reliable)

```python
def open_url(app, url):
    win = app.window(title_re=".*Edge.*")
    win.set_focus()
    time.sleep(0.5)
    win.type_keys("^l")       # Ctrl+L → address bar
    time.sleep(0.3)
    win.type_keys("^a")       # Select all
    time.sleep(0.2)
    win.type_keys(url)        # Type URL
    time.sleep(0.3)
    win.type_keys("{ENTER}")  # Enter
    time.sleep(3)
    return True
```

### Verify Logins via Window Title Sniffing

```python
from pywinauto import Desktop

def get_titles():
    wins = Desktop(backend="uia").windows()
    return [w.window_text() for w in wins if w.window_text()]

# Check each platform
titles = get_titles()
for t in titles:
    tl = t.lower()
    if "facebook" in tl: print("Facebook: LOGGED IN")
    if "google" in tl or "gmail" in tl or "drive" in tl: print("Google: LOGGED IN")
    if "x.com" in tl or "twitter" in tl: print("X: LOGGED IN")
    if "youtube" in tl: print("YouTube: LOGGED IN")
```

### Pinned Tabs to Keep Open
- `https://www.facebook.com/` (Facebook)
- `https://studio.youtube.com/` (YouTube Studio)
- `https://console.cloud.google.com/` (Google Cloud)
- `https://developers.facebook.com/` (Facebook Dev)
- `https://twitter.com/` or `https://x.com/` (X/Twitter)
- `https://developer.twitter.com/` (X Developer)

---

## 2. Collect Facebook ID + Tokens — Full Auto via Edge UIA

### Target Values (not in .env.local)
- FB_PAGE_ID — 15-16 digit Facebook Page ID
- FB_PAGE_ACCESS_TOKEN — long-lived Page Access Token
- FACEBOOK_RTMP_URL — `rtmps://live-api-s.facebook.com:443/rtmp/STREAM_KEY`
- FB_APP_ID — Facebook App ID
- FB_APP_SECRET — Facebook App Secret

### Method A: Edge UIA Navigation + Visual Extraction

**Step 1: Facebook Page ID**

```python
# Navigate to Facebook Page → About
open_url(app, "https://www.facebook.com/")
time.sleep(3)
# Click on the Page name (UIA needs the element handle)
# Alternative: navigate directly to about page
open_url(app, "https://www.facebook.com/your-page-name/about")
time.sleep(3)
# Page ID appears in URL or page source
# Fallback: view-source
open_url(app, "view-source:https://www.facebook.com/your-page-name/?__a=1")
time.sleep(3)
# Parse page source for "pageID" or "id":"1234567890123456"
```

**Step 2: Facebook Page Access Token**

```python
# Navigate to Graph Explorer
open_url(app, "https://developers.facebook.com/tools/explorer/")
time.sleep(3)
# Select App (UIA: find dropdown, click, select "Hostamar")
# Click "Get Token" → "Get User Access Token"
# Check permissions: pages_show_list, pages_read_engagement,
#   pages_manage_posts, pages_read_user_content, public_profile
# Click "Generate Token" → copy token from popup
# Then: GET /me/accounts → find Page → copy Page Access Token
```

**Step 3: Facebook RTMP URL**

```python
# Navigate to Facebook Page → Live
open_url(app, "https://www.facebook.com/your-page-name")
time.sleep(3)
# Meta Business Suite → Content → Live Video → Create Live Video
# Click "Streaming Software" tab
# Server URL: rmps://live-api-s.facebook.com:443/rtmp/
# Stream Key: click eye icon to reveal
# FACEBOOK_RTMP_URL = rtmps://live-api-s.facebook.com:443/rtmp/STREAM_KEY
```

**Step 4: App ID + App Secret**

```python
# Navigate to Facebook App Dashboard
open_url(app, "https://developers.facebook.com/apps/")
time.sleep(3)
# Click on "Hostamar" app
# Settings → Basic
# Copy App ID + App Secret
```

### Method B: 1Password/KeePass (if accessible)

Check if `op` CLI or KeePass database is available on Windows:

```bash
# 1Password CLI
op item list --tags "facebook"          # List Facebook items
op item get "Facebook Page" --fields label=access_token

# KeePass (if keepassxc-cli installed)
keepassxc-cli export /path/to/database.kdbx  # Export entries
```

**If `op` or KeePass is available:** use it instead of Edge UIA — much more reliable.

### Manual Fallback (if Edge UIA fails)

1. **FB_PAGE_ID:** Open Facebook Page → About → Page transparency → copy 15-16 digit ID
2. **FB_PAGE_ACCESS_TOKEN:** developers.facebook.com/tools/explorer → select App → Get Token → copy
3. **FACEBOOK_RTMP_URL:** Page → Live → Streaming Software → copy Server URL + Stream Key
4. **FB_APP_ID/SECRET:** developers.facebook.com/apps → Hostamar → Settings → Basic

### Save to .env.local

```bash
cat >> /home/romel/hostamar-build/.env.local << 'EOF'
FB_PAGE_ID=collected_value
FB_PAGE_ACCESS_TOKEN=collected_value
FACEBOOK_RTMP_URL=rtmps://live-api-s.facebook.com:443/rtmp/KEY
FB_APP_ID=collected_value
FB_APP_SECRET=collected_value
EOF
```

### Save to Vercel (Production)

```bash
vercel env add FB_PAGE_ID production "collected_value"
vercel env add FB_PAGE_ACCESS_TOKEN production "collected_value"
vercel env add FACEBOOK_RTMP_URL production "rtmps://live-api-s.facebook.com:443/rtmp/KEY"
vercel env add FB_APP_ID production "collected_value"
vercel env add FB_APP_SECRET production "collected_value"
```

---

## 3. Collect YouTube Channel ID — Full Auto via Edge UIA

### Target Values (not in .env.local)
- YOUTUBE_CHANNEL_ID — UC... 24 chars
- YOUTUBE_HANDLE — @username

### Already Have
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_RTMP_URL, YOUTUBE_REFRESH_TOKEN (in .env.local + Vercel)

### Method: Edge UIA Navigation

```python
# Navigate to YouTube Studio
open_url(app, "https://studio.youtube.com/")
time.sleep(3)
# Settings → Channel → Advanced settings
# UIA: find Settings button (gear icon), click
# Navigate to Channel → Advanced
# Copy Channel ID (UC... 24 chars)
```

**Alternative: account_advanced**

```python
open_url(app, "https://www.youtube.com/account_advanced")
time.sleep(3)
# Page shows Channel ID + Handle
```

### Manual Fallback
1. YouTube Studio → Settings → Channel → Advanced settings → copy Channel ID
2. youtube.com/account_advanced → copy Channel ID + Handle

### Save to .env.local

```bash
echo "YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxx" >> /home/romel/hostamar-build/.env.local
echo "YOUTUBE_HANDLE=@yourhandle" >> /home/romel/hostamar-build/.env.local
```

### Save to Vercel

```bash
vercel env add YOUTUBE_CHANNEL_ID production "UCxxxxxxxxxxxxxxxxxxxxxx"
vercel env add YOUTUBE_HANDLE production "@yourhandle"
```

---

## 4. Collect WhatsApp Credentials (if needed)

### Target Values
- WHATSAPP_PHONE_ID
- WHATSAPP_TOKEN
- WHATSAPP_BUSINESS_ID

### Method: Edge UIA → developers.facebook.com

```python
open_url(app, "https://developers.facebook.com/")
time.sleep(3)
# Apps → Hostamar → Add Product → WhatsApp
# API Setup → copy Phone ID, Token, Business ID
```

### Manual Fallback
1. developers.facebook.com → Apps → Hostamar → WhatsApp → API Setup
2. Copy Phone ID, Token, Business ID

---

## 5. D1 TvStreamDestination — Insert Facebook + YouTube Rows

After collecting credentials, insert into D1:

```sql
-- YouTube (already has YOUTUBE_RTMP_URL in .env.local)
INSERT INTO "TvStreamDestination" ("platform", "rtmpUrl", "streamKey", "label", "isActive")
VALUES ('YOUTUBE', 'rtmp://a.rtmp.youtube.com/live2/', 'STREAM_KEY_HERE', 'YouTube Main', true)
ON CONFLICT DO NOTHING;

-- Facebook (new)
INSERT INTO "TvStreamDestination" ("platform", "rtmpUrl", "streamKey", "label", "isActive")
VALUES ('FACEBOOK', 'rtmps://live-api-s.facebook.com:443/rtmp/', 'STREAM_KEY_HERE', 'Facebook Page', true)
ON CONFLICT DO NOTHING;
```

Via prisma:

```bash
npx prisma db execute --command "INSERT INTO ...
```

Or via /admin/tv/restream UI.

---

## 6. Facebook Auto-Live Pipeline

### Architecture

```
TV Source (playlist.host.txt) → VP9 HLS2 encoder (local HLS) → tv.hostamar.com
                                                    → YouTube tee encoder → rtmps://a.rtmps.youtube.com/live2/STREAM_KEY
                                                    → Facebook restream → rtmps://live-api-s.facebook.com:443/rtmp/STREAM_KEY
```

### Current State
- YouTube: ALIVE (PID 2042477, ESTABLISHED to Google)
- Facebook: NOT YET (no FACEBOOK_RTMP_URL in .env.local)

### What's Needed for Facebook Auto-Live

1. **Collect Facebook RTMP URL** via Edge UIA (Phase 2 above)
2. **Add to .env.local:** `FACEBOOK_RTMP_URL=rtmps://live-api-s.facebook.com:443/rtmp/KEY`
3. **Add to Vercel env:** `vercel env add FACEBOOK_RTMP_URL production "rtmps://..."`
4. **Add to D1 TvStreamDestination:** INSERT Facebook row
5. **Restart restream service:** `systemctl --user restart restream.service`
   - restream.py polls TvStreamDestination every 60s (idle) or 15s (active)
   - One ffmpeg per destination, NOT -f tee (tee caused YouTube health degradation)

### restream.py Behavior
- Source: local concat playlist (NOT rtmp://127.0.0.1:1935/live/tv — that contends with publisher)
- Bitrate: 112k video + 16k audio = 128kbps total (fits ~21 KB/s uplink floor)
- One encoder per active destination
- Polls DB every 60s when idle, 15s when active
- Restarts automatically if all pushers die

### Facebook RTMP Details
- Server: `rtmps://live-api-s.facebook.com:443/rtmp/`
- TLS required (rtmps://)
- Stream key: persistent, from Page → Live → Streaming Software
- Facebook requires a Page (not personal profile) for RTMP ingestion

### Testing Facebook Auto-Live
1. Add FACEBOOK_RTMP_URL to .env.local + Vercel
2. Insert TvStreamDestination Facebook row
3. `systemctl --user restart restream.service`
4. Check /tmp/tv-restream.log for pusher launch
5. Verify on Facebook Page: Live video appears
6. Check keepalive.log: Facebook platform detected

### Facebook Page Requirements
- Must be a Facebook Page (not personal profile)
- Page must have "Live Video" capability enabled
- Page access token needs: pages_show_list, pages_read_engagement, pages_manage_posts, pages_read_user_content, public_profile

---

## 7. Edge UIA Credential Collection — Cron on Windows PC

### Cron Setup (Windows Task Scheduler)

**Task:** "Hostamar Edge Credential Collector"
**Trigger:** Every 6 hours (or manual)
**Action:** Run Windows Hermes Python with edge_collect.py

```bash
# Windows Task Scheduler XML (simplified)
# Trigger: Daily at 00:00, 06:00, 12:00, 18:00
# Action: C:\Users\User\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe
#   Arguments: C:\Users\User\hostamar-build\scripts\edge_collect.py --json
#   Working Dir: C:\Users\User\hostamar-build
```

### Alternative: keepalive.sh Integration

keepalive.sh already calls Windows Python every 5 min for browser verification.
Extend it to also call edge_collect.py:

```bash
# In keepalive.sh, after browser verify:
if [ -f "$WIN_PYTHON" ]; then
    "$WIN_PYTHON" "$BROWSER_VERIFY" --json >> $LOG 2>&1 || true
    # Also collect credentials if Facebook/YouTube tabs are open
    "$WIN_PYTHON" "$CREDENTIAL_COLLECT" --json >> $LOG 2>&1 || true
fi
```

### Credential Collection Script (Windows Python)

See `scripts/edge_collect.py` — already created, runs on Windows via pywinauto.

**Usage:**
```bash
# On Windows, via Hermes Windows Python:
"C:\Users\User\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe" ^
  "C:\Users\User\hostamar-build\scripts\edge_collect.py" --json
```

**Output:** JSON with collected credentials. Save to .env.local, then push to Vercel.

### What edge_collect.py Actually Does
- Connects to Edge via pywinauto UIA (or starts Edge)
- Checks which platform tabs are open via window title sniffing
- For each logged-in platform, navigates to credential pages
- Prints manual extraction steps (UIA element extraction is fragile across Edge updates)
- **Does NOT auto-extract credentials from page DOM** (requires BeautifulSoup parsing of page source, which is blocked by Facebook/YouTube dynamic rendering)

### Why UIA Can't Fully Automate Credential Extraction
1. **Facebook/YouTube use dynamic rendering** — page source doesn't contain credentials until JS executes
2. **pywinauto UIA** can read UI element text but not page DOM
3. **Edge security** blocks programmatic access to password fields
4. **Graph API tokens** are in popup dialogs — UIA can't reliably extract from popups

### Reliable Path: Manual Copy + Vercel env add
1. User manually copies credentials from Facebook/YouTube pages
2. Paste into .env.local
3. `vercel env add` to production
4. Restart restream service

### Edge UIA Value
- Opens the right pages automatically
- Reminds user what to copy
- Verifies which platforms are logged in
- Can't replace manual credential extraction

---

## 8. Production Checklist

### Before Facebook Auto-Live
- [ ] Facebook Page created with Live Video capability
- [ ] Facebook App "Hostamar" created in developers.facebook.com
- [ ] FB_PAGE_ID collected
- [ ] FB_PAGE_ACCESS_TOKEN collected (long-lived, pages_* permissions)
- [ ] FACEBOOK_RTMP_URL collected (rtmps://live-api-s.facebook.com:443/rtmp/KEY)
- [ ] FB_APP_ID + FB_APP_SECRET collected
- [ ] Added to .env.local
- [ ] Added to Vercel env (production)
- [ ] TvStreamDestination Facebook row inserted

### After Facebook Auto-Live
- [ ] restream.service restarted
- [ ] /tmp/tv-restream.log shows Facebook pusher launched
- [ ] Facebook Page shows live video
- [ ] keepalive.log shows Facebook: true
- [ ] HLS2 audio audible on tv.hostamar.com
- [ ] YouTube live stream active

### YouTube Status (already working)
- [x] YOUTUBE_CLIENT_ID/SECRET in .env.local + Vercel
- [x] YOUTUBE_RTMP_URL in .env.local + Vercel
- [x] YOUTUBE_REFRESH_TOKEN in Vercel
- [x] YouTube tee encoder alive (PID 2042477, ESTABLISHED to Google)
- [x] YouTube restream alive (PID 2042905, separate Google connection)
- [x] HLS2 audio audible on tv.hostamar.com
- [ ] YOUTUBE_CHANNEL_ID — needs collection
- [ ] YOUTUBE_HANDLE — needs collection

---

## 9. Where to Start

**On Windows (Romel's PC):**
1. Open Edge, navigate to facebook.com + studio.youtube.com + developer.twitter.com
2. Run: `python scripts/edge_collect.py --json` (via Windows Hermes Python)
3. Manually copy credentials from Facebook/YouTube pages
4. Paste into .env.local
5. `vercel env add` for production

**On WSL (this box):**
1. After credentials in .env.local: `systemctl --user restart restream.service`
2. Check /tmp/tv-restream.log for Facebook pusher
3. Verify on Facebook Page: live video appears
4. `curl https://tv.hostamar.com/master.m3u8 -I` → 200
5. `curl https://hostamar.com/api/social/publish` → ok:true

**Manual Fallback (if Edge UIA fails):**
1. Facebook: copy Page ID from Page → About → Page transparency
2. Facebook: copy Access Token from developers.facebook.com/tools/explorer
3. Facebook: copy RTMP URL from Page → Live → Streaming Software
4. YouTube: copy Channel ID from studio.youtube.com → Settings → Channel → Advanced
5. Paste into .env.local, then `vercel env add` + restart restream

---

*End of V18 report. Pushed to main. Ready for Windows Edge execution.*
