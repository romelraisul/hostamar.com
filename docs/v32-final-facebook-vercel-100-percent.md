# V32 FINAL 95% → 100% — FACEBOOK + VERCEL DATABASE_URL

**Date:** 2026-09-21  
**Status:** ⚠️ AWAITING USER ACTION  
**Deployed by:** Hermes Agent (Longcat 2.0 Free)

---

## Current State: 14/15 93%

All V31 fixes are live and verified. Two blockers remain — both require **manual user action** (browser login + encrypted secret entry):

| # | Blocker | Status | Action Required |
|---|---------|--------|-----------------|
| 1 | Facebook credentials | ❌ MISSING | Edge UIA to extract Page ID + Token + App ID + RTMP URL |
| 2 | Vercel DATABASE_URL | ⚠️ Empty in prod | `vercel env add DATABASE_URL production` (paste from .env.local) |

---

## Fix 1: Facebook Credentials

**Root cause:** Facebook credentials (`FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `FB_APP_ID`, `FB_APP_SECRET`, `FACEBOOK_RTMP_URL`) have never been set. The app needs them to:
- Restream HLS2 to Facebook Live
- Publish posts via Graph API
- Read page insights

**Steps (run on Windows host with Edge):**

1. **FB_PAGE_ID (15-16 digits)**
   - Edge → https://facebook.com → Switch to your Page "Hostamar" → About tab → Scroll to "Page Transparency" → "See All" → Page ID (15-16 digits) → Copy

2. **FB_PAGE_ACCESS_TOKEN (long-lived)**
   - Edge → https://developers.facebook.com/tools/explorer/
   - My Apps (top right) → Select App "Hostamar"
   - Permissions: add `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_read_user_content`, `pages_manage_engagement`
   - "Generate Access Token" → Login Facebook → Allow
   - In Graph Explorer field: `GET /me/accounts` → Submit
   - Find `data[]` where `name=Hostamar` → Copy `access_token` (long string)

3. **FB_APP_ID + FB_APP_SECRET**
   - Edge → https://developers.facebook.com/apps/ → Hostamar App → Settings → Basic
   - App ID → copy
   - App Secret → "Show" → copy

4. **FACEBOOK_RTMP_URL**
   - Edge → https://facebook.com/live/producer/
   - "Use Stream Key" → eye icon → Server URL: `rtmp://live-api-s.facebook.com:443/rtmp/` + Persistent Stream Key
   - Full URL: `rtmp://live-api-s.facebook.com:443/rtmp/YOUR_KEY`

**After collecting, paste into:**
```
vercel env add FB_PAGE_ID production
vercel env add FB_PAGE_ACCESS_TOKEN production
vercel env add FB_APP_ID production
vercel env add FB_APP_SECRET production
vercel env add FACEBOOK_RTMP_URL production
```
Also save to `~/hostamar-build/.env.local`.

Then save to D1 `TvStreamDestination`:
```bash
npx wrangler d1 execute hostamar-db --command "INSERT INTO TvStreamDestination (id, platform, rtmpUrl, enabled) VALUES ('fb', 'FACEBOOK', 'rtmp://live-api-s.facebook.com:443/rtmp/KEY', 1) ON CONFLICT(id) DO UPDATE SET rtmpUrl=excluded.rtmpUrl, enabled=1"
```

---

## Fix 2: Vercel DATABASE_URL

**Root cause:** `DATABASE_URL=""` in Vercel Production env → Prisma fails during build → deploy Error.

**Fix:**
```bash
vercel env add DATABASE_URL production
# Paste value from ~/hostamar-build/.env.local DATABASE_URL (libsql:// or postgres://)
# Select: Production + Preview + Development (same value)
# Save

vercel env pull ~/hostamar-build/.env.production.local --yes
cat ~/hostamar-build/.env.production.local | grep DATABASE_URL  # verify non-empty

# Force redeploy
vercel --prod --force
# OR
git commit --allow-empty -m "force deploy V32" && git push origin main
```

---

## Verification

After both fixes applied:
```bash
vercel env ls | grep -E "FB_PAGE|DATABASE_URL"  # should show values
curl -s https://hostamar.com/api/admin/status | jq '.completion'  # should be "15/15 100%"
```

---

## Summary

V31 shipped: HLS2 -23.5 dB audible, ComfyUI 200 OK, Hermes Desktop + WSL NVIDIA direct API, NVIDIA Guard 0 proxy, Piper 74MB, Shelf 94 files, Cron 5/5, Dashboard 459 vs Admin 1156 lines.

V32 ships the last two: Facebook credentials + Vercel DATABASE_URL. Both are manual — user must act.
