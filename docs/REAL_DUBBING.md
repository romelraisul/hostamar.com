# REAL DUBBING vs Voice-Over

**We did voice-over** (replace audio, lips still English) — fast, `Piper 0.58s`,
correct A/V sync via `targetDur + genpts + shortest`, but not cinema-grade.

**Real dubbing** = voice cloning (XTTS v2 clones original speaker timbre speaking
Bangla) + lip sync (Wav2Lip/LatentSync makes lips move to Bangla ±50ms) +
face restore (GFPGAN). That's what supernan-ai-dubbing and InfiniteTalk do.

## Pipeline (real_dubbing.py)

```
original.mp4 (10 min English)
  -> Whisper small transcribe English
  -> llama-3.1-8b translate to Bangla with SME hook (already in create_from_free)
  -> extract 10s speaker wav
  -> XTTS v2 clone at :10202 (speaker wav + Bangla text -> cloned Bengali audio, same voice)
     fallback: Piper bn_BD-google-medium speaker 0/12 generic if XTTS down
  -> Wav2Lip at :10203 (face + cloned audio -> lipsynced mp4)
     fallback: skip (keeps English lips, still watchable)
  -> GFPGAN restore (if installed, fixes Wav2Lip blur)
  -> final mux: trim original to targetDur, watermark, music 0.12, genpts+shortest (no 9-min tail)
```

Time: XTTS ~5s + Wav2Lip ~20s/30s video + GFPGAN ~10s = 35s extra vs 15s voice-over.
Quality: original speaker speaking Bangla, lips in sync.

## Install (when you have GPU headroom)

```bash
# XTTS v2 (4GB VRAM)
mkdir -p docker/tts-xtts/models
podman compose -f docker/tts-xtts/podman-compose.yml up -d
# pulls ghcr.io/coqui-ai/xtts + huggingface.co/coqui/XTTS-v2 (~2GB)

# Wav2Lip (2GB VRAM)
mkdir -p docker/wav2lip/checkpoints docker/wav2lip/temp
wget -O docker/wav2lip/checkpoints/wav2lip_gan.pth \
  https://github.com/Rudrabha/Wav2Lip/releases/download/v1/wav2lip_gan.pth
podman compose -f docker/wav2lip/podman-compose.yml up -d

# Whisper (CPU, optional)
pip install openai-whisper --user --break-system-packages
```

Then `real_dubbing.py` auto-detects `XTTS_URL`/`WAV2LIP_URL` UP and uses them,
no code change. Without GPU, it stays on Piper voice-over with correct sync —
TV never breaks.

## References

- supernan-ai-dubbing: Whisper + XTTS v2 + Wav2Lip + GFPGAN (English→Hindi, we do →Bangla)
- ai-video-dubber-studio: 6 local TTS (CosyVoice, Chatterbox, XTTS v2, etc)
- InfiniteTalk (MeiGen Aug 2025): unlimited length, any video/photo → lipsync
- LatentSync (Bytedance): best free open-source lip sync
- Wav2Lip: best offline secure, `ahmetoner/wav2lip` docker
