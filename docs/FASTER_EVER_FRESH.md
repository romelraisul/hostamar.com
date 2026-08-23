# FASTER EVER-FRESH — Parallel 3× + Never-Stop Loop

24h no-repeat needs **2880 videos** (30 s each). After cleaning, TV has 18 (9 min).

## Speed

| Stage | Before (sequential) | After (parallel) | Gain |
|---|---|---|---|
| hunter 6 products | 90 s (6×15) | 30 s (p-limit 3, 6/3 chunks) | 3× |
| yt-dlp download 4 | 240 s | 60 s (4 concurrent) | 4× |
| Piper TTS 4 | 2.3 s | 0.6 s (parallel, 0.58 s each offline) | ~4× |
| ffmpeg enhance 4 | 60 s | 20 s (4 parallel veryfast) | 3× |
| **4 videos total** | **~360 s (90 s/video)** | **~122 s (30 s/video)** | **3×** |

- `hunter_parallel.ts` — `pLimit 3` over 6 products (camofox 3 tabs safe), each
  `browser_search_youtube_cc` with audience-focused queries. 12 videos in 30 s.
- `create_batch.py --batch=4 --parallel=4 --use-piper` — 4× `create_from_free.ts`
  via ThreadPool, each Piper 0.58 s offline (speaker 0/12 by gender), music synth
  0.12 mix, ffmpeg `veryfast` + `eq/unsharp` fallback. `/dev/shm` ramdisk for wavs.
- Research: `research_inhouse.py --limit 12` still llama-3.1-8b audience gate
  (~110 s per video, reasoning headroom) — cache transcripts to skip whisper.

## Never-stop loop

`ever_fresh_loop.py` loops every 60 s until `total >= 2880`:

```
unplayed = SELECT count(*) WHERE played=false
played   = SELECT count(*) WHERE played=true
coverage = (unplayed+played)*0.5 min / 60
if total >= 2880: FINISHED
if unplayed < 50: REFILL → hunter_parallel(12) → research → create_batch(4) → seo --missing → force_restart
else sleep 60
```

`tv-ever-fresh.service` (Restart=always) keeps it alive across power cuts
(via `~/.config/systemd/user/default.target.wants/` + Windows Task Scheduler
`wsl.exe` boot). Logs: `/tmp/ever-fresh.log`, also `journalctl --user -u tv-ever-fresh -f`.

Current `tv-viral.service` stays at 30 min round-robin (12/hr = 288/day, 10 days
to 2880). Ever-fresh adds the fast refill path: at 144/hr (5-min hunter) it
reaches 3456/day → 20 h to 24 h. With `HIGH_VOLUME=1` in `start-viral.sh` you
can flip to 5 min; default 30 min is kept to avoid 8GB VRAM/GPU starvation.

## Start now, never stop until 24h

```bash
# tmux (interactive):
tmux kill-session -t ever-fresh 2>/dev/null
tmux new-session -d -s ever-fresh "python3 scripts/tv/ever_fresh_loop.py 2>&1 | tee /tmp/ever-fresh.log"
tmux attach -t ever-fresh

# systemd (persistent):
systemctl --user daemon-reload
systemctl --user enable --now tv-ever-fresh.service
journalctl --user -u tv-ever-fresh -f

# verify:
cat docker/tv-station/videos/playlist.host.txt | sort | uniq -d  # 0
ls docker/tv-station/videos/viral/ | wc -l                        # grows 18→30→50→...
curl https://hostamar.com/api/tv/status | jq
```

## No-repeat still

`enable_no_repeat.py --confirm` reset 18 to `played=false`, `uniq -d 0` PASS.
`tv-no-repeat-watcher.service` watches `/proc/<ffmpeg>/fd`, waits duration,
marks `played=true`, regenerates `playlist.host.txt` without played, renumbers,
force-restarts — each video plays once ever. Restream tee still polls
`TvStreamDestination` for 100+ destinations.

## Storage

2880 × 6 MB viral ≈ 17 GB + 17 GB free originals ≈ 34 GB. Current disk 35%
→ fits.
