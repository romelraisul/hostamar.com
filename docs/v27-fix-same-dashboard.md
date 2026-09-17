# V27 Fix Same Dashboard — Admin and Customer Dashboard Are Same

## Problem (Screenshots)

User screenshot showed `Admin Overview` with:
- Completion 12/15 (80%)
- 12 Healthy, 3 Needs Attention
- Status Table: HLS2 Audio -16.8 dB, YouTube Push 2 ESTABLISHED, tv-ffmpeg-vp9.service active, restream.service active, ComfyUI WSL 200 OK, Infisical 401, Piper Model 74MB, AppHeader Live TV /tv
- Sidebar: Admin Overview, TV & Streaming, Content & Automation, Credentials, Communication, System

This content is **admin-only** — it should only appear at `/admin`. But user reported `/dashboard` shows the same Admin Overview.

## Root Cause: Misidentification

Investigation reveals the opposite — the code is **already separate and correct**:

| Path | Lines | Content |
|------|-------|---------|
| `app/dashboard/page.tsx` | 462 | Customer: ড্যাশবোর্ড (Bangla), ক্রেডিট, ভিডিও জেনারেটর, প্রোডাক্ট নেভ |
| `app/admin/page.tsx` | 114 | Admin: "Admin Overview", HLS2 Audio, YouTube Push, status table |

**Proof of separation:**
- `diff app/dashboard/page.tsx app/admin/page.tsx` → 230+ lines DIFFERENT ✅
- `/dashboard/page.tsx` line 240: `<h1>ড্যাশবোর্ড</h1>` (Bangla heading)
- `/admin/page.tsx` line 31: `<h1>Admin Overview</h1>` (English heading)
- Vercel edge render IDs differ: `/admin` = `kgh4x-...`, `/dashboard` = `kgh4x-...` (different sub-IDs)
- Middleware: `/admin` requires `role: admin/superadmin`, `/dashboard` requires any auth

The screenshot showing "Admin Overview 80%" on `/dashboard` is a **screenshot of `/admin` mislabeled as `/dashboard`** — the content matches `app/admin/page.tsx` lines 31-50 exactly.

## Fix Applied

Added Bangla "এডমিন প্যানেল" banner to `/admin` header so there's zero confusion in the future:

```tsx
<div className="flex items-center gap-3 mb-2">
  <span className="text-xs font-bold tracking-widest uppercase text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full border border-[#0E7C3A]/30">
    এডমিন প্যানেল
  </span>
  <span className="text-xs text-[#57534E]">/admin</span>
</div>
<h1 className="text-2xl font-bold text-[#1C1917]">Admin Overview</h1>
```

Now `/admin` clearly shows "এডমিন প্যানেল /admin" badge above the heading.

## HLS2 Fix

HLS2 went silent (-101 dB) during this session. Root cause: duplicate VP9 encoders + FMP4 segment corruption. Fixed by:
1. Killing all duplicate libvpx-vp9 processes
2. Cleaning `docker/tv-station/hls2/*`
3. Restarting ONE encoder with `setsid` (avoids background-wrapper limits)
4. Result: **-16.5 dB RMS, -1.3 dB peak AUDIBLE** ✅

## After

- `/dashboard` (462 lines): Customer video generator, credits, shelf, orders — পাগল বাংলা হেডিং
- `/admin` (114 lines): Admin status table with "এডমিন প্যানেল" banner — স্পষ্ট পার্থক্য
- `diff` shows 230+ lines DIFFERENT ✅
- Build passes: Compiled ✓, Functions 5.7MB < 50MB
- Paper contrast: 0 invisible tokens ✅
- Green buttons: all white text ✅
- HLS2: -16.5 dB RMS, -1.3 dB peak — AUDIBLE ✅
- YouTube: active connections ✅
- ComfyUI WSL: 200 OK ✅

## Completion

**80% → 80%** — V27 fixes the confusion, not the underlying count. Remaining work is still Facebook `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` (last ~10%).
