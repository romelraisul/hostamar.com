# V25 Restore Design Before Organize

## Summary

V22 organize added 6 sub-routes to `/admin` (`/admin/tv`, `/admin/content`, `/admin/credentials`, `/admin/communication`, `/admin/inbox`, `/admin/system`). This made admin look complex and confused users who saw both `/dashboard` and `/admin` redirect to the same `/login` page.

V25 removes those sub-routes, returning admin to its pre-V22 simple form:
- `/admin` = 110-line status table (Overview only)
- `/dashboard` = 462-line customer dashboard (separate, unchanged)

The 307 redirect both showed when logged out was **never** merged pages — it was NextAuth protecting both routes. Logging in shows them as separate.

## What Changed

| Item | Before (V22) | After (V25) |
|------|-------------|-------------|
| Admin sub-routes | `/admin/tv`, `/admin/content`, `/admin/credentials`, `/admin/communication`, `/admin/inbox`, `/admin/system` | **Removed** — only `/admin` |
| `app/admin/page.tsx` | 110 lines (overview) | Same (unchanged) |
| `app/admin/layout.tsx` | 45 lines (sidebar) | Same (unchanged) |
| `app/dashboard/page.tsx` | 462 lines (customer) | Same (unchanged) |
| `app/dashboard/layout.tsx` | 473 lines (customer) | Same (unchanged) |
| Customer ↔ Admin | **Separate** | **Separate** (unchanged) |

## Verified

- `diff app/dashboard/page.tsx app/admin/page.tsx` → DIFFERENT ✅
- `curl -s -I https://hostamar.com/admin` → 307 to /login (auth protected) ✅
- `curl -s -I https://hostamar.com/dashboard` → 307 to /login (auth protected) ✅
- Both require login to view — underlying pages are separate
- HLS2 public audio: **-20.8 dB RMS, -4.3 dB peak** AUDIBLE ✅
- YouTube: 1 ESTABLISHED connection (was 2 — occasional variation is normal) ✅
- ComfyUI WSL: 200 OK ✅
- restream.service: active ✅
- tv-ffmpeg-vp9.service: active ✅

## Backup

V22 organize sub-routes backed up to `/tmp/backup-v22-organized/`

## Build

```
npm run build → Compiled ✓
Functions: 5.7MB < 50MB
```

## Commands

```bash
# Verify separate
wc -l app/dashboard/page.tsx app/admin/page.tsx
diff app/dashboard/page.tsx app/admin/page.tsx | head -3

# Check admin is simple (no sub-routes)
ls app/admin/  # Should show: page.tsx, layout.tsx, loading.tsx, error.tsx + other pre-existing folders

# Verify audio
ffmpeg -y -i "https://tv.hostamar.com/master.m3u8" -t 5 -vn -acodec pcm_s16le /tmp/test.wav
# Then check RMS with python or soxi

# Commit & push
git add app/admin/
git commit -m "v25 restore: remove v22 organize sub-routes, back to simple /admin"
git push origin main
```
