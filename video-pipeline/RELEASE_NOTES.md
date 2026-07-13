# RELEASE NOTES — DRAFT (NOT A RELEASE)

Status: **pre-GPU-verification (smoke-ready-rc)**. Do NOT publish as v0.1.0 until the
GPU-host smoke test passes and Bangla audio + lip-sync are manually confirmed.

This file is a draft. The real release is cut only after `video-pipeline/smoke-test.sh`
returns all gates PASS on a GPU host (RunPod/Vast.ai A100-40GB or 2x RTX 4090).

## Planned: v0.1.0 (VERIFIED on GPU)

Tag message (use only after GPU proof):
> v0.1.0 VERIFIED on A100 — LTX T2V + Chatterbox BN + InfiniteTalk lip-sync
> end-to-end 90s

## What shipped at b22ef06 (current main)

- Self-contained `video-pipeline/` GPU render backend:
  - ComfyUI split: `comfyui-main` (cuda:0, LTX-13B distilled) + `comfyui-lite` (cuda:1,
    Chatterbox + ACE-Step 1.5 + InfiniteTalk).
  - Redis job stream, MinIO/R2 signed-URL storage (7-day TTL), FastAPI gateway + worker.
- 5 repos wired: ComfyUI, LTX-Video (ComfyUI-LTXVideo), Chatterbox
  (ComfyUI_ChatterBox_SRT_Voice), ACE-Step 1.5 (ACE-Step-ComfyUI), InfiniteTalk
  (ComfyUI-InfiniteTalk-MultiImage + kijai/ComfyUI-WanVideoWrapper).
- 3 workflows: `ttv.json` (LTX T2V/I2V), `tts.json` (Chatterbox + XTTS-v2 bn fallback
  note), `full_pipeline.json` (ACE-Step BGM → LTX I2V → InfiniteTalk disk-streaming
  lip-sync → Whisper caption → Real-ESRGAN 4K).
- `app/generate/page.tsx`: Bangla prompt UI → /v1/generate, progress, preview, 4K download.
- `video-pipeline/smoke-test.sh`: 6-gate GPU-host verifier grounded to the real JSONs
  and :8188/:8189 endpoints.

## Verified on the CPU/CI box (this environment has no GPU)

- App: TSC 0, lint 0 errors, Vitest 25/25, `next build` OK.
- Pipeline: 3 workflow JSONs valid, Python `py_compile` OK, bash `bash -n` OK,
  compose YAML parses (6 services).

## NOT verified (deferred to GPU host — by design, not a gap)

- Runtime inference: real ComfyUI node titles vs `GET /object_info`, HF weight
  downloads at first boot, end-to-end 90s generation, 4K upscale timing.
- Bangla TTS quality: Chatterbox is English-trained. Pipeline enables IPA
  transliteration + XTTS-v2 `bn` fallback, but production voice quality needs a
  real Bangla checkpoint + a human listen. This is the unverified part.
- bKash webhook enforcement: `_verify_bkash` is stubbed; wire to your payment
  record lookup before enforcing paywall.

## Cut-the-release flow (after GPU proof)

On GPU host:
    docker compose -f docker-compose.prod.yml up -d
    COMFY_MAIN_URL=http://127.0.0.1:8188 COMFY_LITE_URL=http://127.0.0.1:8189 ./smoke-test.sh
    cat SMOKE_REPORT.md   # confirm 3 PASS

On dev box:
    git pull
    # optional: flip README UNVERIFIED -> VERIFIED in a commit, then:
    git tag -a v0.1.0 -m "v0.1.0 VERIFIED on A100 - LTX T2V + Chatterbox BN + InfiniteTalk lip-sync end-to-end 90s"
    git push origin v0.1.0

Do NOT create a lightweight RC tag and push it — keep b22ef06 as the reference.
Tagging now would mean "written", not "proven"; retagging later is avoidable noise.
