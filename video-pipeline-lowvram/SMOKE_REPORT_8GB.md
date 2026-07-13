# SMOKE REPORT — 8GB LOW-VRAM ComfyUI (RTX 5060 / Blackwell)

**Date:** 2026-07-13
**Image:** `hostamar-comfyui-lowvram:blackwell` (derived from `:local` build, torch upgraded in-place)
**Container:** `comfyui-lowvram` — `docker run --gpus all -p 8199:8188` (compose bypassed; see note)
**Server URL:** http://127.0.0.1:8199

---

## CORE BLOCKER — RESOLVED ✅

RTX 5060 is **Blackwell (sm_120)**. The original `:local` image used torch 2.6.0+cu124
(sm_50–sm_90 only) → `torch.cuda.is_available()` was True but every kernel died with
`no kernel image is available for execution on the device`.

Fix: upgraded torch to **2.8.0+cu128** (+ torchvision 0.23.0+cu128, torchaudio 2.8.0+cu128).
Live verification inside the running container:

```
torch 2.8.0+cu128 | cuda 12.8
device NVIDIA GeForce RTX 5060
compute (12, 0)            # = sm_120 / Blackwell
kernel_ok True             # real CUDA matmul executed on the GPU
```

`/system_stats` from the server reports: `cuda:0 NVIDIA GeForce RTX 5060`, 8546484224 bytes
VRAM total, 7.3GB free at idle. GPU passthrough + kernel execution CONFIRMED on Blackwell.

---

## SMOKE TEST RESULT (as-written): PASS=0 FAIL=9

The script (`smoke-test-8gb.sh`) failed on **node-title mismatches** and **missing assets**,
NOT on GPU/image health. The image and server are healthy. Details below.

### Test pre-checks (node-title asserts)
| Asserted title            | Actual registered class(es)                                   | Verdict |
|---------------------------|---------------------------------------------------------------|---------|
| `WanVideoModelLoader`     | `WanVideoModelLoader`                                         | ✅ OK   |
| `InfiniteTalkModelLoader` | `InfiniteTalkMultiImage` (also `InfiniteTalk`, `InfiniteTalkEmbedsSlice`) | ❌ rename |
| `ChatterboxTTS`           | `ChatterBoxSRTVoiceTTS` (also `ChatterBoxVoiceTTSDiogod`, `ChatterBoxF5TTSVoice`, `ChatterBoxF5TTSEditVoice`) | ❌ rename |
| `LTXVMultiGPUChunked`     | `LTXMultiGPUChunkedNode` (under ComfyUI_LTX-2_VRAM_Memory_Management) | ❌ rename |
| `LTXVModelLoaderGGUF`     | **does not exist** in this ComfyUI-LTXVideo build (use `UnetLoaderGGUF` from ComfyUI-GGUF) | ❌ GAP  |
| `RealESRGANLoader`        | **does not exist** anywhere in this ComfyUI tree (use native `UpscaleModelLoader`+`ImageUpscaleWithModel`, or drop the assert for lowvram) | ❌ GAP  |

### Generation tests (A–D)
All four aborted before producing output because:
1. `models/` is **empty** — no GGUF weights (LTX 2B, Wan Q4, InfiniteTalk, Chatterbox) downloaded yet.
2. Test B references `workflows/tts.json` which is **missing** (real workflows live in
   `workflows/lowvram/`: `ltx-2b-gguf-8gb.json`, `infinitetalk-q4-8gb.json`, `full-10s-8gb.json`).

So Tests A–D are **blocked by missing weights + wrong workflow path**, not by the image.

---

## FIXES APPLIED TO THE IMAGE (container-side, all verified)

1. **torch 2.8.0+cu128** (sm_120 support) — resolves the Blackwell kernel blocker.
2. **build-essential** installed (was the earlier "Failed to find C compiler" for triton JIT).
3. **torchaudio 2.8.0+cu128** — fixes `libcudart.so.13` import error.
4. **kornia 0.8.3 segfault under torch 2.8.0** — root cause was `@torch.jit.script` decorators
   crashing at import. Stripped the JIT decorators in 3 kornia files + polyfilled `pad`. kornia now imports cleanly.
5. **transformers >= 4.50.0** — LTXVideo needs `Gemma3Config` (absent in the 4.46.3 that shipped).
6. **libportaudio2 + libxext6 + libgl1** — fixes Chatterbox (`PortAudio library not found`) and
   the glsl extras node (`libXext.so.6`) import failures.
7. **ComfyUI_LTX-2_VRAM_Memory_Management parent `__init__.py`** — the node dir had submodule
   `__init__.py` files but no parent, so ComfyUI skipped it. Added an aggregator that merges
   `ltx_multi_gpu_chunked`, `comfyui_tensor_parallel_v3/v2`, `ComfyUI_LTX2_SeqParallel`,
   `sequence_chunked_block` mappings → `LTXMultiGPUChunkedNode` now registers.
8. **Restored `nodes_post_processing.py` in the extras list** (I had removed it to dodge the kornia
   crash before fixing kornia; RealESRGAN-style post-processing nodes depend on it).

**Net effect:** `Cannot import` count in the boot log = **0**. Every custom node + builtin extra
now loads.

---

## NEXT STEP (Option 1 — in progress)

1. Restore this report (done).
2. Patch `smoke-test-8gb.sh` asserts to real `/object_info` classes (awaiting exact 5-line diff
   from the user, derived from `/tmp/real_nodes.txt`).
3. Patch `install-lowvram.sh` to add Chatterbox TTS weights (~1.2GB → `models/TTS/chatterbox`).
4. Commit both.
5. Run `install-lowvram.sh` (downloads ~22GB GGUF weights).
6. Re-run `./smoke-test-8gb.sh | tee local-8gb.log` → expect real node loads + 5s inference.

---

## LAUNCH NOTE (compose workaround)

`docker compose up` fails on this WSL2 host with a Docker Desktop distro-service socket error
(`/var/run/docker/desktop/dockerd/distro-service-ubuntu.sock`). `docker run` with explicit
bind mounts works fine (proven). Launch used:

```
docker run -d --name comfyui-lowvram --gpus all -p 8199:8188 \
  -e NVIDIA_VISIBLE_DEVICES=all -e PYTHONUNBUFFERED=1 -e HF_TOKEN=*** \
  -v $(pwd)/models:/root/ComfyUI/models \
  -v $(pwd)/output:/root/ComfyUI/output \
  -v $(pwd)/workflows:/root/ComfyUI/user_workflows \
  --restart unless-stopped \
  --entrypoint python hostamar-comfyui-lowvram:blackwell \
  main.py --lowvram --disable-smart-memory --use-split-cross-attention --cpu-vae --listen 0.0.0.0
```

The Dockerfile `docker-compose.lowvram.yml` was already patched to the `deploy.resources.reservations.devices`
GPU form (no `runtime: nvidia`) — but the WSL socket bug requires `docker run` here.

---

## VERDICT

- **Image health: PASS** — boots in ~20s, GPU (RTX 5060 / sm_120) visible, CUDA kernels execute.
- **All custom nodes load: PASS** — 0 import failures (was kornia/transformers/portaudio regressions).
- **Smoke script asserts: FAIL** — 4 node-title mismatches + 2 missing nodes, all script/repo issues.
- **Generation tests: BLOCKED** — need GGUF weights in `models/` + correct workflow paths.

Re-run `./smoke-test-8gb.sh` after fixing the 5 node-title assertions and downloading weights.
