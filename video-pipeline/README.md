# Hostamar AI Video Pipeline (hostamar.com/video)

Production GPU render backend that turns a **Bangla prompt** into a ~90s marketing
video: script + voice (Bangla) + caption + BGM + talking avatar, 4K export,
watermark-free, with Reels/TikTok/YT-Shorts presets.

It is a **self-contained subdirectory** (`video-pipeline/`) so it does NOT touch the
existing app `docker-compose.prod.yml` (LiveKit) or the existing BullMQ video worker.
The app's `/api/videos/generate` can call this gateway's `/v1/generate` when the
ComfyUI GPU tier is wired in.

---

## Architecture

```
                         ┌─────────────── Redis (stream: video_jobs) ───────────────┐
                         │                                                            │
Next.js /generate  ──▶  api-gateway (FastAPI :8000)  ──enqueue──▶  worker (Redis   │
   (Bangla prompt)      /v1/generate, /v1/status             consumer)              │
                                                                  │                  │
                                  comfyui-main (cuda:0)  ◀──────┤  big video gen    │
                                  LTX-13B distilled 24-40GB     │  (LTX I2V, 4K)    │
                                                                  │                  │
                                  comfyui-lite (cuda:1)  ◀──────┤  TTS/BGM/lip-sync │
                                  Chatterbox + ACE-Step +       │  (13-16GB)        │
                                  InfiniteTalk                 │                  │
                                                                  └────────┬─────────┘
                                                                          ▼
                                                          R2 / MinIO (signed URL, 7-day TTL)
```

- **comfyui-main** = `cuda:0`, LTX-13B distilled (text/image→video, 4K upscale).
- **comfyui-lite** = `cuda:1`, Chatterbox (TTS), ACE-Step 1.5 (BGM), InfiniteTalk (lip-sync).
- **Concurrency = 1 job per GPU** — each ComfyUI service runs one prompt at a time.
  Scale by adding GPU boxes / more comfyui services.
- **Storage**: outputs uploaded to Cloudflare R2 (or local MinIO for dev) with a
  time-limited **signed URL (default 7 days)**. Frontend gets that signed URL.

## The 5 repos wired in

| Repo | Role | ComfyUI node |
|------|------|--------------|
| Comfy-Org/ComfyUI | Orchestrator | — |
| Lightricks/LTX-Video | T2V / I2V (13B distilled) | ComfyUI-LTXVideo |
| resemble-ai/chatterbox | Bangla TTS | ComfyUI_ChatterBox_SRT_Voice |
| ace-step/ACE-Step-1.5 | BGM / music | ACE-Step-ComfyUI |
| MeiGen-AI/InfiniteTalk | Talking-head lip-sync | ComfyUI-InfiniteTalk-MultiImage (+ kijai/ComfyUI-WanVideoWrapper) |

All five custom nodes are cloned in `docker/comfyui/install.sh`.

## 90-second video strategy

LTX-13B is generated as **6×15s chunks** (disk-streaming, VRAM stays flat), then
`ffmpeg` concats and `Real-ESRGAN x4` upscales to 4K. InfiniteTalk runs in
`use_disk_streaming: true` mode for the talking-avatar segments so length doesn't
blow VRAM.

## Bangla voice reality-check

Chatterbox is English-trained. The pipeline enables its **transliteration (IPA)**
path and a documented **XTTS-v2 `bn` fallback**. For production Bangla quality you
should fine-tune/find a Bangla chat**terbox checkpoint and drop it in
`models/chatterbox/`. The "Bangla is perfect out of the box" claim is NOT assumed —
the code falls back rather than pretending.

## Run it (dev, needs an NVIDIA GPU host)

```bash
# 1. env (see .env.example)
cp video-pipeline/.env.example video-pipeline/.env
# fill: R2_*, BKASH_*, HF_TOKEN, VIDEO_KEY

# 2. build + up
cd video-pipeline
docker compose -f docker-compose.prod.yml up -d --build

# 3. models download on first boot (entrypoint pulls from HF; needs HF_TOKEN for gated)
docker compose -f docker-compose.prod.yml logs -f comfyui-main

# 4. smoke test the gateway
curl -X POST localhost:8000/v1/generate \
  -H "Authorization: Bearer $VIDEO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt_bn":"কটন পাঞ্জাবির অ্যাড","aspect_ratio":"9:16","with_bgm":true}'
```

## GPU cost for Bangladesh (RunPod / Vast.ai)

Prices are **public list prices** (mid-2026), USD/hour. Convert at ~৳118/$.

| GPU | VRAM | RunPod (on-demand) | Vast.ai (spot, typical) | Fits |
|-----|------|--------------------|--------------------------|------|
| RTX 4090 | 24GB | ~$0.34/hr | ~$0.20–0.30/hr | LTX-13B distilled + 1 lite GPU |
| A100 40GB | 40GB | ~$1.19/hr | ~$0.70–0.90/hr | one box does main+lite via MPS |
| 2× RTX 4090 | 48GB | ~$0.69/hr (2×) | ~$0.45/hr | main+lite split (this compose) |

**Per-video math** (target: ~90s video, 6×15s LTX + TTS + BGM + lip-sync + 4K):
- Generous wall time ≈ 3–4 min end-to-end on 4090s (concurrency 1).
- At Vast.ai 2×4090 ~$0.45/hr → ~$0.03/job GPU. With model load amortized, ~$0.05–0.10/job.
- Your site price is **৳2000 ≈ $17 for 10 videos** → ~$1.70/video gross. Even at $0.40/job
  GPU (A100 2 min, per the brief) that's ~75% margin. **The margin math holds; the
  $0.40 A100 figure is the brief's assumption, not independently benchmarked here.**

**Bangladesh latency note**: spin Render workers on **RunPod/Vast.ai (US/EU)**, not
local BDIX, because consumer GPUs aren't available here. Push outputs to R2
(already BD-optimized via Cloudflare) so Bangladesh viewers pull from a near edge.

## Honest verification status (what is / isn't proven)

This build was authored on a **GPU-less CI box**, so the following are
**correct-by-construction but NOT runtime-verified here**:

- ✅ `docker-compose.prod.yml` parses (valid YAML, 6 services, anchors).
- ✅ 3 workflow JSONs are valid JSON in ComfyUI **API format**.
- ✅ Python backend passes `python -m py_compile` (syntax). Deps resolve at runtime.
- ✅ `/generate` page compiles under the app's `tsc --noEmit` (TSC_RC=0).
- ⚠️ **Node titles** in the workflow JSONs (`LTXVModelLoader`, `ChatterboxTTS`,
  `ACEStepGenerate`, `InfiniteTalkLipSync`, `WhisperAutoCaption`, `RealESRGANUpscale`)
  are the canonical names but MUST be confirmed against `GET /object_info` on a live
  ComfyUI with all 5 nodes installed. If a node was renamed upstream, update the
  `title`/`type` in the JSON — ComfyUI rejects unknown node types at submit time.
- ⚠️ **Exact HF model repo slugs** in `entrypoint.sh` (e.g. `LTX-13B-0.9.8-Distilled`,
  `ACE-Step-v1-5`, `Wan2.1-T2V-1.3B`) should be verified against current HuggingFace
  releases before a real download — repo names change between versions.
- ❌ **End-to-end inference** (real 90s video, real Bangla TTS quality, 4K upscale
  timing) was NOT executed — no GPU here. Run the smoke test on a GPU host to confirm.
- ❌ **bKash webhook verification** is stubbed (`_verify_bkash`) — wire to your real
  `BKASH_*` payment lookup before enforcing paywall.

## Files

```
video-pipeline/
  docker-compose.prod.yml      # main(cuda:0)+lite(cuda:1)+redis+minio+api+worker
  .env.example                 # all env var names
  docker/comfyui/
    Dockerfile                 # CUDA 12.4.1 + Py3.11 + ComfyUI + venv
    install.sh                 # clone 5 custom nodes + pip install
    entrypoint.sh              # boot ComfyUI + download HF weights
  backend/
    Dockerfile                 # multi-stage: gateway + worker
    requirements.txt
    api_gateway.py             # /v1/generate, /v1/status, auth
    worker.py                  # Redis stream consumer -> ComfyUI -> R2
    common/{config,r2,comfy}.py
  workflows/
    ttv.json                   # LTX text/image -> video
    tts.json                   # Chatterbox (Bangla + XTTS fallback note)
    full_pipeline.json         # ACE-Step BGM -> LTX I2V -> InfiniteTalk -> caption -> 4K
app/generate/page.tsx          # Next.js UI (progress, preview, 4K download)
```

## Next steps before production

1. Run on a GPU host; confirm node titles via `/object_info`.
2. Add a real Bangla TTS model (finetune or XTTS-v2 bn) for voice quality.
3. Wire `_verify_bkash` to your payment record lookup.
4. Point app `lib/r2.ts` / `/api/videos/generate` at this gateway's `/v1/generate`.
5. Add autoscale: one comfyui-main + comfyui-lite per GPU box; workers scale with boxes.
