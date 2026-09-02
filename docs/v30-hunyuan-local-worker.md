# V30 — HunyuanVideo 1.5 8B Local Worker (re-install after AI disk cleanup)

## What happened
The 2026-09-02 AI hard-disk cleanup deleted the entire ComfyUI install
(`C:\ComfyUI_Download\ComfyUI_windows_portable\`), all model weights
(hunyuan fp8 13.2GB, LLaVA text encoder, VAE), AND the local repo clone
(`C:\Users\User\hostamar\` — only `tailscale-ssh/` survived). V29 was safe on
GitHub (`235b281` + bot self-heal `12736d6`).

## What was re-installed (verified 2026-09-02)
- ComfyUI base → `C:\ComfyUI_Download\ComfyUI\` (git clone, embedded python
  `C:\Users\User\qwen\python_embeded\python.exe` already had torch 2.13+cu130).
- Custom nodes: `ComfyUI-HunyuanVideoWrapper` + `ComfyUI-VideoHelperSuite`
  (VHS_VideoCombine). **NO GGUF node** — the wrapper is safetensors-only.
- Transformers 5.x patch: `hyvideo/text_encoder/__init__.py` clipL branch now
  guards `text_model` with hasattr (5.x removed the attribute).
- Models (all verified on disk, not 0 bytes):
  - `models/diffusion_models/split_files/diffusion_models/hunyuan_video_720_fp8_e4m3fn.safetensors`
    (13,185,035,336 bytes; header check: 857 tensors, `img_in.proj.weight` +
    `txt_in.t_embedder.mlp.0.weight` present, no legacy `model.model.` prefix —
    the exact format the wrapper expects, from pinned commit `6e02d99d`).
  - `models/vae/hunyuan_video_vae_bf16.safetensors` (493MB genuine causal-3D VAE).
  - `models/LLM/llava-llama-3-8b-text-encoder-tokenizer/` (4 shards ~16GB + configs).
- Workflow: `comfyui/workflows/hunyuanvideo1.5-8b-api.json` — the proven
  surviving graph (fp8 fast quant, block-swap 20/20 + txt/img offload,
  force_offload, VAE tiling), **384×216 landscape** render.

## Why 384×216 and NOT 720×1280 (spec correction)
A direct 720×1280 portrait render HANGS the 8GB RTX 5060 (verified twice —
`ba9867ef`, `d7d89d85`: flat VRAM, 100% util, wedged). The proven path is
render landscape 384×216, then `transpose=1` in the ffmpeg post-process →
216×384 9:16 portrait. The V30 spec's "720×1280 frames 121" config was
wrong for this GPU; 720p-class bf16 (24GB) also deadlocks it.

## Architecture (queue-first, honest fallback)
1. Dashboard POST `/api/dashboard/videos/create` → `Video{processing}` +
   `VideoQueue{pending}`. If `COMFYUI_WORKER_SECRET` is set in the deployment:
   create RETURNS immediately (no inline render) — the row waits for the worker.
   If unset: the V28 serverless inline pipeline runs (gradient manifest — row
   never strands; V28 lesson).
2. Local worker `scripts/comfyui-hunyuan-worker.mjs` (this PC) polls
   `GET /api/videos/queue/next` (x-worker-secret) every 10s, claims the oldest
   pending row (atomic `updateMany` claim + 20-min stale-claim reclaim).
3. Worker renders 5 scene clips (~6s each, Hunyuan 1.5 8B fp8):
   Bogra bus → Cox's Bazar drone beach → hotel+breakfast+couple →
   Inani/Himchari → offer+CTA. Concat, rotate to 9:16, Bengali edge-tts
   voiceover (bn-IN-TanishaaNeural), synth music, burned Bangla captions.
4. `POST /api/videos/upload/complete` (multipart, secret) → server pushes the
   MP4 to B2 (`videos/{id}/final.mp4`), flips `Video.completed` +
   `VideoQueue.completed`. B2 creds never leave the server.
5. Failure → `POST /api/videos/queue/fail` (honest transition; retry re-queues).
6. Dashboard plays it via the V29 private B2 proxy `/api/videos/file/...`
   (Range support, IDOR-safe, .mp4 gate → native `<video>` player).

MANUAL-ONLY marketing stands (V29 rule): nothing auto-publishes anywhere.

## Running the worker
```
# Windows (PowerShell) — ComfyUI first:
cd C:\ComfyUI_Download\ComfyUI
C:\Users\User\qwen\python_embeded\python.exe main.py --listen 127.0.0.1 --port 8188

# then the worker (Node 18+, from the repo):
node scripts/comfyui-hunyuan-worker.mjs            # loop, 10s poll
node scripts/comfyui-hunyuan-worker.mjs --once     # one job then exit
```
`.env.local` needs: `COMFYUI_WORKER_SECRET=<same as Vercel env>`,
`WORKER_APP_URL=https://hostamar.com`, `COMFYUI_URL=http://127.0.0.1:8188`.

Render cost: ~15-25 min per 6s clip at 384×216/10 steps → a 5-clip 30s video
is ~1.5-2.5h of GPU. The queue + stale-claim reclaim make this safe against
the PC being off mid-render.

## Endpoints added
- `GET  /api/videos/queue/next` — worker pull (x-worker-secret; fail-closed)
- `POST /api/videos/queue/fail` — worker failure callback
- `POST /api/videos/upload/complete` — worker success callback (multipart file
  or b2Key JSON)
All three in `middleware.ts` selfGuardedPaths (no cookie possible; guarded at
the route by COMFYUI_WORKER_SECRET — no literal fallbacks, V18 rule).
