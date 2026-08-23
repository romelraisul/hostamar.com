# Bangla Auto-TV Pipeline (2026-08-22)

Fully automatic: open-source video -> English transcription -> Bangla translation -> Bangla neural voice -> TV playlist.

## Stack (all free, no API keys, no GPU)
- Sources: NASA images API (public domain), Prelinger/archive.org (public domain), Blender open movies (CC-BY)
- faster-whisper small/int8 (CPU) - English transcription
- deep-translator (Google) - English -> Bangla
- edge-tts - Microsoft neural Bangla voices: bn-BD-PradeepNeural (male) / bn-BD-NabanitaNeural (female)
  (override with BANGLA_VOICE env)
- ffmpeg - mux Bangla audio over original video (video stream copied, so fast)

Every dubbed video starts with a Bangla intro: greeting + Bangla title + source + license
(keeps CC-BY attribution audible, compliance-friendly).

## Files
- scripts/bangla-dub/ingest.py  - source fetchers + downloader
- scripts/bangla-dub/dub.py     - whisper -> translate -> edge-tts -> ffmpeg mux
- scripts/bangla-dub/auto.py    - orchestrator (lock-protected), updates playlist + reloads ffmpeg
- scripts/bangla-dub/state.json - processed history
- docker/tv-station/videos/opensource/  - Bangla output (_bn.mp4)

## Scheduler
tmux session `bangla-sched` runs ~/start-bangla-scheduler.sh: every 6h, auto.py 2 (two new Bangla videos).
Manual run: cd scripts/bangla-dub && python3 auto.py 3

## After each run
- ffmpeg loop auto-restarts with the new playlist (brief HLS gap ~5s)
- verify: https://hostamar.com/api/tv/status (isLive:true), https://tv.hostamar.com/hls/tv/index.m3u8 (200)

## Restart after reboot
    podman start hostamar-tv-rtmp
    bash ~/hostamar-build/scripts/start-tv-live.sh
    tmux new-session -d -s tv-agent "bash /home/romel/start-agent.sh 2>&1 | tee /tmp/agent.log"
    tmux new-session -d -s bangla-sched "bash /home/romel/start-bangla-scheduler.sh"
    nohup cloudflared tunnel --config /home/romel/tv-tunnel.yml run > /tmp/tv-tunnel.log 2>&1 &

## Future upgrades (hooks exist)
- Avatar presenter intro (HunyuanVideo/SadTalker) - GPU too small for now (RTX 5060 8GB shared with llama-server)
- Wav2Lip for talking-head videos - skip; most open-source content has no presenter
- Burned-in Bangla subtitles (Noto Sans Bengali) - add ffmpeg subtitles filter if wanted
