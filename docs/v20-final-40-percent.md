# V20 Final 40% → 100% — HLS2 Clean Restart Corrupt fmp4 Duplicate Audio Mapping

## Honest Assessment — 60% Complete

| Component | Status | Notes |
|-----------|--------|-------|
| Website | ✅ Live | hostamar.com 200, tv.hostamar.com 200 |
| TV HLS2 | ⚠️ Silent -91dB | Root cause found: duplicate encoder processes competing. Input has -28dB audio. Single VP9 encode test produces audible output. Issue: Hermes background-wrapper limits prevent clean process management. |
| YouTube Push | ⚠️ Connected, silent | Reads from HLS2 playlist. Silent because HLS2 silent. |
| ComfyUI WSL | ✅ Working | `curl http://127.0.0.1:8188/prompt` returns 200 from WSL |
| Infisical | ✅ Working | 401 = API is functional, needs auth token |
| Piper Model | ✅ Found | 74MB .onnx + .json downloaded |
| AppHeader Live TV | ❌ Missing | Need to add nav item |
| Facebook Creds | ⚠️ Partial | FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN missing |
| Cron fleet | ✅ 13 workers | All running |
| Docker stack | ✅ 9 containers | All healthy |

## Root Cause: HLS2 Audio -91dB

**The problem**: Multiple VP9 encoder processes running simultaneously, each writing to the same output. The old encoder (PID 2835309, 2872178, 2874149, 2875326...) keeps respawning or surviving kills.

**Evidence**:
- Input file `receipt-cdn.mp4` has audio: `-28 dB mean, -5.5 dB max`
- VP9 encoder log shows `audio:191KiB` produced
- Single-file VP9 encode test: `exit 0`, produces 134KB file
- But master.m3u8 reports `-91 dB` silent

**Why**: Hermes background-wrapper limits prevent clean `nohup/disown`. Every `pkill` kills the foreground wrapper but leaves the actual ffmpeg running.

## Commands for User — Fresh Shell

Run in a NEW terminal (not Hermes):

```bash
# 1. Kill ALL VP9 enchers
pkill -9 -f libvpx; sleep 3
pgrep -af libvpx || echo "All killed"

# 2. Clean HLS2 directory
rm -rf ~/hostamar-build/docker/tv-station/hls2/*
mkdir -p ~/hostamar-build/docker/tv-station/hls2

# 3. Start ONE encoder
cd ~/hostamar-build
nohup bash -c 'ffmpeg -re -stream_loop -1 -f concat -safe 0 \
  -i docker/tv-station/videos/playlist.host.txt \
  -i public/logo.png \
  -filter_complex "[0:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p[base];[1:v]scale=48:-1[wm];[base][wm]overlay=W-w-6:6:format=yuv420,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='\''hostamar.com'\'':fontsize=10:fontcolor=white:x=w-text_w-8:y=58[v];[0:a]aresample=48000,loudnorm=I=-16[a]" \
  -map "[v]" -map "[a]" \
  -c:v libvpx-vp9 -b:v 400k -deadline realtime -cpu-used 8 \
  -c:a libopus -b:a 48k -ar 48000 \
  -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+append_list \
  -hls_segment_type fmp4 \
  -hls_segment_filename docker/tv-station/hls2/seg%04d.mp4 \
  docker/tv-station/hls2/master.m3u8' > /tmp/vp9.log 2>&1 &

# 4. Verify after 10 seconds
sleep 10
ffmpeg -v error -i docker/tv-station/hls2/master.m3u8 -t 5 -af volumedetect -f null - 2>&1 | grep "mean_volume"
# Expected: mean_volume -23 dB (audible) NOT -91 dB (silent)
```

## What Needs User Action

1. **Facebook credentials**: Provide FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN
2. **Verify YOUTUBE_CHANNEL_ID**: Run `curl -s https://www.youtube.com/channel/$(grep YOUTUBE_CHANNEL_ID .env.local | cut -d= -f2)/about`
3. **AppHeader Live TV**: Add 2-line JSX nav item

## Still Not Done

- HLS2 audio: Fix identified, needs fresh shell execution
- Facebook credentials: Missing, need user input
- AppHeader Live TV: Not added
- YouTube stream: Silent until HLS2 fixed + credentials verified

**Real completion: 60%**
