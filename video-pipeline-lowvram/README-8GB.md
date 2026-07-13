# Hostamar AI Video Pipeline — LOW VRAM local mode (8GB VRAM + 64GB RAM, WSL2)

Runs the same Hostamar pipeline (Bangla prompt → 90s video: script + voice +
caption + BGM + talking avatar) on a **single 8GB GPU**, using GGUF quantization
and CPU offload into your 64GB system RAM. This is a sibling of `video-pipeline/`
(the A100-40GB stack) — both are valid; pick by hardware.

> **STATUS: UNVERIFIED.** Built on a GPU-less box. JSON/compose/bash are
> syntax-validated, but real inference, node titles, HF slugs, and timings must
> be confirmed on your 8GB host. See "Verification" at the bottom.

## Hardware assumption
- 1× NVIDIA GPU with **8GB VRAM** (RTX 4060 / 3060 class)
- **64GB system RAM** (WSL2 gets 48GB via `.wslconfig`)
- WSL2 on Windows

## 1. WSL memory (do this FIRST, on Windows)
Create `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=48GB
processors=12
swap=32GB
```

Then in PowerShell: `wsl --shutdown`, reopen the terminal. Confirm with
`free -h` inside WSL (should show ~48G). Without this, `--lowvram` offload has
nowhere to go and you'll OOM.

## 2. Build + start
```bash
cd video-pipeline-lowvram
docker compose -f docker-compose.lowvram.yml build
docker compose -f docker-compose.lowvram.yml up -d
# wait for http://localhost:8188/system_stats to return
```

`CLI_ARGS` already set to:
`--lowvram --disable-smart-memory --use-split-cross-attention --cpu-vae --listen 0.0.0.0`

## 3. Download models (8GB-friendly GGUF, not full 13B/FP16)
```bash
# bash (Linux/WSL):
./install-lowvram.sh
# or PowerShell (Windows):
./install-lowvram.ps1
```
Pulls:
- `city96/LTX-Video-2B-gguf` → `ltxv-2b-distilled-Q6_K.gguf` (LTX 2B, fits 8GB via GGUF)
- `QuantStack/Wan2.1_I2V_14B_FusionX-GGUF` → `Wan2.1_I2V_14B_FusionX-Q4_0.gguf` (InfiniteTalk, 8GB)
- `MeiGen-AI/InfiniteTalk` → `single/infinitetalk.safetensors` (dest `loras/wan2.1_infiniteTalk_single_fp16.safetensors`)
- LTX/Wan VAEs + `umt5_xxl_fp16` text encoder

## 4. Smoke test (sequential)
```bash
COMFY_URL=http://127.0.0.1:8188 ./smoke-test-8gb.sh
cat SMOKE_REPORT_8GB.md
```
Stages run one-at-a-time with `POST /free` between them to reclaim VRAM.

## 5. Workflows (in `workflows/lowvram/`)
| file | what | settings |
|------|------|----------|
| `ltx-2b-gguf-8gb.json` | LTX 2B GGUF T2V | 512×768, 49 frames, 20 steps, cfg 3.0, chunk_size 16 |
| `infinitetalk-q4-8gb.json` | Wan Q4_0 I2V lip-sync | streaming, motion_frame 9, num_persistent 0 |
| `full-10s-8gb.json` | full sequential 10s | LTX→TTS→InfiniteTalk→caption→opt CPU 4K |

## 6. Expected timings (RTX 4060 8GB, UNVERIFIED — your mileage varies)
- LTX 2B 5s clip @480p: ~6–10 min
- Chatterbox TTS: ~30 s
- InfiniteTalk 10s lip-sync: ~20–30 min
- 90s full video: run as 6×15s chunks + ffmpeg concat (see `video-pipeline/backend/worker.py`)

## 7. 4K
8GB **cannot** render 4K directly. Output 480p, then `RealESRGAN_x2` on **CPU**
(separate pass, node 17–19 in `full-10s-8gb.json`) for a 960p-ish upscale. True
4K needs the A100 stack in `video-pipeline/`.

## Differences from A100 stack (`video-pipeline/`)
- Single `comfyui-lowvram` service (no cuda:0/cuda:1 split) → **sequential only**
- 13B → 2B GGUF Q6; 14B FP16 → 14B Q4_0 GGUF
- `--lowvram` + `--cpu-vae`; 48GB mem limit for offload
- Adds `ComfyUI-GGUF` + `ComfyUI_LTX-2_VRAM_Memory_Management` nodes
- 480p default; 4K optional via CPU upscale

## Verification (honest)
- ✅ JSON valid (`python -m json.tool`), bash `bash -n` OK, compose `yaml.safe_load` OK
- ❌ NOT run: real 8GB inference, node-title correctness vs `/object_info`,
  HF slug existence, download sizes, actual VRAM peaks, Bangla TTS quality.
- The smoke test asserts every node type against `/object_info` at runtime, so a
  wrong title fails loudly rather than OOM-ing silently.
- Run on your 8GB host; only then flip this file's STATUS to VERIFIED.
