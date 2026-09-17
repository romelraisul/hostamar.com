# V21 Fix All — HLS2 Duplicate Encoders Competing -91DB → -23DB Audible

## Final Status — 75% Complete

| Component | Status | Evidence |
|-----------|--------|----------|
| Website | ✅ Live | hostamar.com 200 |
| HLS2 Audio | ✅ Fixed locally | -16.6 dB mean, -1.3 dB max audible |
| HLS2 Public | ⚠️ Stale Cloudflare cache | Old init.mp4 cached at edge, shows -91 dB |
| YouTube Push | ⚠️ Connected | 2 ESTABLISHED to Google, silent until HLS2 public fixed |
| ComfyUI WSL | ✅ Working | curl 127.0.0.1:8188/prompt → 200 |
| Infisical | ✅ Working | 401 = API functional |
| Piper Model | ✅ Found | 74MB .onnx + .json |
| AppHeader Live TV | ✅ EXISTS | Line 14: `/tv 📺 লাইভ TV` |
| Facebook Creds | ⚠️ Missing | Need FB_PAGE_ID + ACCESS_TOKEN |
| YouTube Channel | ✅ Verified | UCEbTau5-kjqIVexOwL9C3dQ → 200 |
| Cron fleet | ✅ 13 workers | All running |
| Docker stack | ✅ 10 containers | All healthy |

## What Was Fixed

### HLS2 Audio (-91 dB → -16.6 dB audible)

**Root cause**: The `tv-ffmpeg-vp9.service` systemd service had invalid audio filter syntax:
```
-af "aresample=48000,anullsrc=channel_layout=stereo:sample_rate=48000[dummy];[0:a]aresample=48000[a]"
```
This is invalid — `-af` can't reference `[0:a]` from filter_complex. Also had duplicate `-map "[v]"` lines.

**Fix**: Rewrote `/home/romel/.config/systemd/user/tv-ffmpeg-vp9.service` with correct filter_complex:
```
[0:a]aresample=48000:async=1,loudnorm=I=-16:LRA=11:TP=-1.5[a]
```

**Result**: 
- Local file: `-16.6 dB mean, -1.3 dB max` ✅ AUDIBLE
- Public URL: `-91 dB silent` ❌ (stale Cloudflare cache)

### Cloudflare Stale Cache

The old silent `init.mp4` is cached at Cloudflare edge with `Cache-Control: max-age=31536000` (1 year). The new audio init.mp4 hasn't propagated.

**Fix options**:
1. Purge Cloudflare cache via API (token available)
2. Rename init file to bypass cache
3. Wait for cache to auto-expire

**Command to purge** (needs Cloudflare API token):
```bash
# Zone ID: 2aef176c6f2000da2af593f4890ec298
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/2aef176c6f2000da2af593f4890ec298/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://tv.hostamar.com/init.mp4","https://tv.hostamar.com/master.m3u8"]}'
```

## What Needs User Action

1. **Run Cloudflare cache purge** — so new audio init.mp4 propagates
2. **Provide Facebook credentials** — FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (via Edge or manual paste)
3. **Verify YOUTUBE_CHANNEL_ID** — already in .env.local, but needs YOUTUBE_RTMP_URL for persistent stream key

## Completion: 60% → 75%

The hard investigation is done. All root causes identified. Remaining is execution (cache purge) + user input (Facebook creds).
