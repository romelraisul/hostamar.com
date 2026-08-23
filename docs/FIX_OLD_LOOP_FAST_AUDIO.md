# FIX: Old Video 10h Loop + Fast In-House Audio (Piper)

## The bug: new video claimed "published pos1, playlist 21" but old video kept playing

`tv-ffmpeg` runs:

```
ffmpeg -re -stream_loop -1 -f concat -safe 0 -i playlist.host.txt -c:v libx264 ... -f flv rtmp://127.0.0.1:1935/live/tv
```

The `concat` demuxer reads the playlist **once at start**. Regenerating
`playlist.host.txt` does nothing until ffmpeg is restarted. The previous
publish path did only `systemctl --user restart tv-ffmpeg`, which can
silently no-op when a dying ffmpeg still holds the old file FD — the result
is a zombie looping one source for hours. Diagnosis:

```bash
PID=$(pgrep -f "rtmp://127.0.0.1:1935/live/tv")
ls -l /proc/$PID/fd | grep videos   # still the old file
head -1 playlist.host.txt            # already the new file
```

Live evidence (2026-08-23): playlist head was the newly published Video
`cmt5f58...` but `fd 4` still pointed at the previous IDE `cmt55vkyp...`
until a forced restart.

## Fix: force_restart.py

Commit: force_restart.py + force_restart_tv.sh + create_from_free.ts wiring.

`force_restart.py` does the reliable sequence:

1. `pkill -f rtmp://127.0.0.1:1935/live/tv` (kills ALL ffmpeg streaming to RTMP)
2. `systemctl --user restart tv-ffmpeg` (recreate with fresh concat)
3. Poll `pgrep -f rtmp://...` and check `ls -l /proc/<pid>/fd` — the open
   video must be the playlist's *first* file. Retries 25s. Logs VERIFIED ✓.

`create_from_free.ts` now calls `force_restart.py` (60s timeout) with a
`systemctl restart` fallback. Verified live:

```
[force-restart] PID=196356 etime=00:02 open=cmt5f58..._free_bn.mp4
VERIFIED ✓
```

Operational note: never run the `pkill`/`systemctl`/`pgrep` diagnostics from
*PowerShell* — they are Linux/WSL commands. Run inside WSL at
`/home/romel/hostamar-build`.

## Fast in-house Bangla TTS: Piper

### Reality check

Brief claimed "bn_BD-pradeep-medium / nabanita" voices — those do not exist.
The real Bangla Piper model is `bn/bn_BD/google/medium` at
`rhasspy/piper-voices` — **one** multi-speaker model (16 speakers, 22050 Hz,
OpenSLR 37 + CMU Indic). Proved by enumerating the HF tree.

### What was installed

- Model: `docker/tts/models/bn_BD-google-medium/bn_BD-google-medium.onnx`
  (76.7 MB) + `.onnx.json` — `*.onnx` gitignored, keep on disk.
- Runtime: `pip install piper-tts` (`python3 -m piper` CLI).
- Speaker mapping by pitch-scan (autocorrelation F0, same code as
  `gender_detect.py` threshold 165 Hz):

  Speaker 0 → median 130 Hz (male), Speaker 12 → 258 Hz (female).
  All 16 scanned: 0/6/9 are deep male, 12/15 are high female.

  Selected: **male=0, female=12**. `gender_detect.py` (pitch 165 Hz) chooses
  automatically; create_from_free maps that to the Piper speaker.

### Speed + quality

```
echo "এই ঈদে সবাই তাকিয়ে থাকবে..." | piper --model ... --speaker 0 --output_file /tmp/piper_test.wav
real 0.58s for 2.7s audio  ( Pi ≈ 4.6× real-time )

edge-tts same text: 3–5s + network. Piper is offline, deterministic,
quality is near edge-tts for Bangla (medium OpenSLR model).
```

### Wiring

`create_from_free.ts`: tries Piper first (file exists + `USE_PIPER≠0`), shell-
escapes Bangla text, pipes to `piper`, then `ffmpeg -y -i piper.wav -ar 48000`
to MP3 for the TV pipeline. On any failure, falls back to `edge-tts`
(Pradeep/Nabanita). Result log:

```
TTS Piper speaker 0 SUCCESS   (or 12 for female)
```

Also added `VIDEO_ENHANCE` color+unsharp and ffmpeg-synth music bed
(per-product chord triad, mixed ~0.12) when comfy is down; both augmentations
are already in the same commit history.

### Arg-parsing fix (bonus)

`create_from_free.ts` previously only accepted `--product=Video` (equals).
Automation and manual calls use `--product Video` (space). Now handles both.

## Verification (2026-08-23)

- Publish with Piper: `cmt5f58...` Video — `TTS Piper speaker 12 SUCCESS`,
  `music bed synthesized`, `comfy down → ffmpeg enhance`, published pos1,
  playlist 33.
- After force_restart: new PID 196356, fd matches new file, VERIFIED ✓.
- HLS `http://127.0.0.1:8080/hls/tv/index.m3u8` healthy, public
  `https://tv.hostamar.com/hls/tv/index.m3u8` 200, `isLive:true` playlist 23,
  `ffprobe` new file 1280x720 yuv420p AAC 44.1k, watermark/hostamar drawtext
  intact.
- SEO: new Video produced suffixed slug `-jib1` (collision handling), page 200
  cold 33s → warm 1.39s, canonical correct, VideoObject present.

## Remaining notes

- `*.onnx` / large model files are **not committed** — download once per host.
- To switch back to cloud TTS: `USE_PIPER=0 npx tsx scripts/tv/create_from_free.ts --product=Video`.
- To disable music: `USE_MUSIC=0`.
- Comfy/Hunyuan path is still probed (`COMFY_URL`) and auto-upgrades when GPU
  is available; ffmpeg enhance is not a regression, just a fast fallback.
