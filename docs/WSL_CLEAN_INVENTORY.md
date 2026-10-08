# WSL CLEAN + SOFTWARE LIST + MODEL LOCATE — verified
Run: 2026-10-09 01:5x (+06) · live worker hostamar-pages `56020176-05a9-46bd-a7a9-a15412587166` (commit `89b44867`)
Disk before → after: **576G used / 381G free → 546G used / 411G free = 30G reclaimed** (`df -h /`)
Sockets 51 → **50** (stray :3055 killed) · Ollama still 4 models · VRAM 6844/8151 MiB used, 1052 free
Everything below is command output from this session. Nothing estimated; one claim of yours turned out false and is marked as such.

## 1. Cleanup result — 5 pairs symlinked after FULL-file md5 (not just first 8 MB)
| # | File | Size freed | Kept real file | Replaced with symlink |
|---|---|---|---|---|
| 1 | qwen_image_2.1_bf16.safetensors | 13.3G | `models/diffusion_models/…` | `models/diffusion_models/diffusion_models/…` |
| 2 | qwen3vl_8b_int8_convrot.safetensors | 8.7G | `models/text_encoders/…` | `models/text_encoders/text_encoders/…` |
| 3 | qwen3vl_8b_w4a8.safetensors | 5.9G | `models/text_encoders/…` | `models/text_encoders/text_encoders/…` |
| 4 | qwen_image_2.1_vae_bf16.safetensors | 0.6G | `models/vae/…` | `models/vae/vae/…` |
| 5 | CosyVoice-BlankEN/model.safetensors | 0.9G | `models/cosyvoice2/CosyVoice-BlankEN/…` | `models/cosyvoice3-bengali/CosyVoice-BlankEN/…` (now a symlink) |
| **Total** | | **29.4 GB** | | |
Method: size equal **and** full-file md5 equal → `rm` copy, `ln -s` absolute path, then post-check (symlink resolves, size matches, first 1 MiB byte-identical to source) with `assert`. Script: `~/.hermes/cache/scratch/dedup.py` (idempotent, digest cache). `~/ComfyUI` 268G → **239G**.

**Refused to touch (verification failed — this is the point of the check):**
- `models/diffusion_models/aceeffabe…8485ec3` (7.76G) looked like a duplicate of `hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors` but **sizes differ** (8335262258 vs 8330399746). It has a sibling `.aria2` control file and its safetensors header says `model_type: hunyuanvideo1.5_720p_sr_distilled` → it is an **unfinished aria2 download of the SR-distilled model**, not the i2v file. Left in place.
- chatterbox in `models-archive`: those snapshot paths are **already symlinks into that archive's own `blobs/`** (standard HF cache). Deduping them would make the live ComfyUI model depend on a backup dir — wrong direction, so left alone. ~3G stays duplicated; the real fix is deleting the archive copy once you don't need the backup.
- `models-archive/…/node_modules/@next/swc-*.node` (0.1G): duplicate inside a backup tree, not worth a symlink.

## 2. Still-garbage, NOT deleted (flagged, ~17.2G) — say the word and I remove
| Size | Path | What it is |
|---|---|---|
| 6.5G | `ComfyUI/models/.cache/huggingface/download/text_encoders/…incomplete` | abandoned HF partial (text encoder) |
| 2.3G | `ComfyUI/models/minimax-music3/.cache/…/minimax_music3_dit_int8_convrot.…incomplete` | abandoned HF partial |
| 7.8G + .aria2 | `ComfyUI/models/diffusion_models/aceeffabe…ec3` | aria2 partial of hunyuanvideo1.5 **sr_distilled** |
| 0.6G | `ComfyUI/models/.cache/huggingface/download/vae/…incomplete` | abandoned HF partial (vae) |
| 18.7M + 236K | `diffusion_models/split_files/diffusion_models/hunyuanvideo1.5_720p_{i2v_cfg,sr}_distilled_fp8_scaled.safetensors` | **truncated stubs** from an interrupted download — not real models |
They are `.incomplete`/`.aria2`/stub files, so no hash check applies; deletion only loses resumable download progress.

## 3. Minimax H3 + HunyuanVideo 1.5 — WHERE THEY ARE (both found)
### MiniMax H3 / Music 3 — present, 18G music + H3 video stack
| What | Path | Size |
|---|---|---|
| MiniMax-Music-3 (music gen) | `ComfyUI/models/minimax-music3/` (dit fp16 4.6G, dit int8 2.3G, text_encoder int8 8.6G, vae dav) | 18G |
| MiniMax H3 video (ref2va) | `ComfyUI/models/diffusion_models/minimax_h3_ref2va_pruned_fp8_scaled.safetensors` | 19.5G |
| MiniMax H3 video (fl2va, NF4) | `ComfyUI/models/diffusion_models/minimax-h3-fl2va-nf4.safetensors` | 16.0G |
| H3 text encoder (NVFP4 AWQ) | `ComfyUI/models/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | 14.6G |
| H3 VAEs | `ComfyUI/models/vae/minimax_h3_video_vae_int8_convrot.safetensors` 2.6G, `minimax_h3_audio_vae_fp32.safetensors` 0.6G | 3.2G |
| ComfyUI graph | `ComfyUI/blueprints/Image to Video (MiniMax H3).json` | — |
| HF cache | `~/.cache/huggingface/hub/models--DiffSynth-Studio--MiniMax-H3-NF4`, `models--Comfy-Org--MiniMax-Music-3` | metadata |
### HunyuanVideo 1.5 — i2v present; sr-distilled only as a partial
| What | Path | Size |
|---|---|---|
| HunyuanVideo 1.5 i2v cfg distilled fp8 | `ComfyUI/models/diffusion_models/hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors` | **7.76G — real, usable** |
| HunyuanVideo 1.5 sr-distilled | aria2 partial `…/aceeffabe…ec3` (+`.aria2`) — **not complete** | 7.76G (partial) |
| HunyuanVideo 720p fp8 (older, SDXL-era wrapper stack) | `ComfyUI/models/diffusion_models/split_files/diffusion_models/hunyuan_video_720_fp8_e4m3fn.safetensors` | 12.3G |
| VAEs / node / docs | `vae/hunyuan_video_vae_bf16.safetensors` 0.5G · `custom_nodes/ComfyUI-HunyuanVideoWrapper` · `hostamar-platform/docs/hunyuanvideo-local-setup.md`, `kaggle-hunyuanvideo-1.5-gpu-recipe.md`, `~/kaggle-huny15/hunyuanvideo15-batch.ipynb` | — |
**Where ComfyUI looks:** drop diffusion models in `ComfyUI/models/diffusion_models/` (**flat**, not `split_files/diffusion_models/` — the two stubs there are invisible to the loader), text encoders in `ComfyUI/models/text_encoders/`, VAEs in `ComfyUI/models/vae/`, audio in `ComfyUI/models/audio_encoders/`. To finish Hunyuan 1.5 SR you only need to resume the aria2 download (or re-run Comfy's HF downloader) — the 7.8G partial is already there.

## 4. Your size claims vs verified reality
| Path | You claimed | Actual | Verdict |
|---|---|---|---|
| /home/romel/ComfyUI | 280GB | **268G before clean → 239G now** (models/ alone was 268G; output 177M, custom_nodes 5.8M, code ~80M) | close — the 280 was models/ rounded up |
| /home/romel/models | **143GB** | **20G** | **FALSE.** Only 2 files: `Qwen3.8-27B-UD-Q4_K_XL.gguf` 16.35G + `bengali-whisper-medium/model.safetensors` 2.85G |
| /home/romel/OpenMontage | 24GB | 24G | ✓ |
| /home/romel/ACE-Step-1.5 | 8.6GB | 8.6G (no weights — code + venv; acestep/ is 12M) | ✓ size, but repo only |
| /home/romel/open-webui-venv | 7.9GB | 8.3G | ✓ |
| /home/romel/bonsai2 | 6.8GB | 6.8G = `27b/27b-pq2.gguf` (the prism-bonsai.service model) | ✓ |
| /home/romel/chatterbox | 6.2GB | 5.9G (TTS repo + models) | ~✓ |
| /home/romel/InfiniteTalk | 5.7GB | 5.7G (repo + venv; assets 13M) | ✓ |
| /home/romel/colibri | 4.8GB | 4.8G (colibri LLM engine repo) | ✓ |
| /home/romel/OmniRoute | 4.7GB | 4.7G (node_modules 4.4G + src/docs) — this is the OmniRoute router source on :20128 | ✓ |
| /opt/nvidia | 2.3GB | 2.3G (CUDA runtime libs) | ✓ |
| `models/Qwen3.8-Flash…safetensors` | 1–10GB each | **not found anywhere** (`find ~ -maxdepth 3 -iname '*flash*'` for safetensors/gguf → empty) | **does not exist** |
| `27b-pq2.gguf` | 1–10GB | 6.8G at `~/bonsai2/27b/27b-pq2.gguf` | ✓ |
| `OpenMontage/takeout-*.zip` | 1–10GB each | none matching; OpenMontage is 24G of tools/tests/skills | not found |

## 5. Software list — all 60 running instances (+ binaries), by type
### systemd USER units — 30 running (+ 8 not running, called out)
| # | Unit | What | Port |
|---|---|---|---|
| 1 | hostamar-ollama.service | Ollama 0.24.0 local embedding models | 11434 |
| 2 | hostamar-embedding-router.service | python3 stdlib auto-router (bangla/small/long/default) | 8081 |
| 3 | hostamar-next.service | Next.js standalone :3011 — WSL ONLY | 3011 |
| 4 | comfyui.service | ComfyUI in-house image/video generation | 8188 |
| 5 | cloudflared.service | CF tunnel hostamar-local (PC-as-VPS) | — |
| 6 | hostamar-tunnel.service | CF tunnel (hostamar-local, second proc) | — |
| 7 | camofox-tunnel.service | CF tunnel 19c220ee camofox.hostamar.com | — |
| 8 | medusa-ingress-tunnel.service | Medusa store ingress tunnel | — |
| 9 | nvidia-guard.service | NVIDIA liveness guard + key rotator | 12436 |
| 10 | omniroute.service | OmniRoute v16.3.1 model router | 20128 |
| 11 | longcat-browser.service | LongCat browser automation | 8082 |
| 12 | camofox.service | Camofox anti-detection browser | 9377 |
| 13 | second-brain.service | second-brain query layer (/ask) | 3010 |
| 14 | tv-agent.service | Hostamar TV agent (polls hostamar.com) | — |
| 15 | tv-hls2.service | TV HLS2 static server (CORS) | 8090 |
| 16 | tv-rtmp.service | TV RTMP+HLS nginx (podman) | 1935 |
| 17 | tv-tunnel / tv-ffmpeg / tv-ffmpeg-vp9 / tv-viral | TV pipeline helpers | — |
| 18 | restream.service | TV restream to YouTube destinations | — |
| 19 | puppy-linux.service | Puppy Linux VM (noVNC) | 8006 |
| 20 | prism-bonsai.service | llama.cpp server, 27b-pq2 | 18932 |
| 21 | qwen-local.service | Qwen3.8-27B llama.cpp (Flash-Attn + MTP) | 8999 |
| 22 | qwen-forward.service | forwards 0.0.0.0:18999 → qwen | 18999 |
| 23 | glm-proxy.service | AutoClaw GLM proxy (OpenAI-compatible) | 18791 |
| 24 | opencode-proxy.service | OpenCode run proxy v10 | 8181 |
| 25 | hermes-gateway.service | Hermes Agent gateway | 8642 |
| 26 | hostamar-interop-bridge.service | WSL interop bridge | 3000 |
| 27 | hostamar-comfy-worker.service | local HunyuanVideo worker (polls for jobs) | — |
| 28 | infisical-boot-guard.service | heals infisical-wsl on reboot (exited cleanly) | — |
| 29 | podman-user-wait-network-online.service | podman netns wait (oneshot, exited) | — |
| 30 | dbus.service | D-Bus user bus | — |
**Not running / broken (found, untouched):** `hostamar-provisioner.service` **failed** · `hostamar-vps.service` **failed** · `hyperspace.service` **failed** · `podman-restart.service` **failed** · `hostamar-litserve.service` **activating (auto-restart loop)** · `hostamar-provisioner-native.service` **activating (auto-restart loop)** · `hostamar-guard.service` inactive · docker/podman system-user units not-found.
### systemd SYSTEM units — 18 running
chrony, containerd, cron, dbus, **docker**, getty@tty1, networkd-dispatcher, oom-watch, polkit, rsyslog, systemd-journald, systemd-logind, systemd-resolved, systemd-udevd, tailscaled, unattended-upgrades, user@1000, wsl-pro.
### Docker — 12 running of 13 defined, 16 images
infisical-wsl (8089) · freellmapi (3002, healthy) · litellm-play (4000) · medusa-wsl (9002) · teldrive (8091) · teldrive-db (5433) · coolify-wsl (8000, healthy) · openobserve-wsl (5080) · hostamar-postgres (5432, healthy) · redis-foundation (6379 internal) · host-hls2 (no port) · hostamar-cloudflare-tunnel (no port) · `host-proxy` = **Created, not running**.
Images (16): alpine · cloudflare/cloudflared · berriai/litellm (1.64G) · coollabsio/coolify · tashfeenahmed/freellmapi · tgdrive/teldrive · groonga/pgroonga-16 · infisical (2.91G) · medusa-wsl-official · nginx:alpine · postgres:16-alpine · prom/prometheus · zinclabs/openobserve · python:3-alpine · python:3.14-slim · redis:7-alpine.
### Binaries
ollama 0.24.0 · python3 (system) · node/npm (`~/.hermes/node`) · docker · podman · cloudflared · nvidia-smi (driver 610.47) · **no `comfyui` on PATH** (runs via comfyui.service) · **no `nvcc`** (runtime only).

## 6. Verification after the clean (all green)
| Check | Result |
|---|---|
| `df -h /` | 546G used / **411G free** (was 576G / 381G) |
| `du -sh ~/ComfyUI` | 239G (was 268G) |
| symlinks | resolve; sizes intact; 1 MiB reads byte-identical |
| `ollama list` | **4** models (mxbai-embed-large, bge-m3, all-minilm, nomic-embed-text) |
| embeddings tunnel POST | bangla → **bge-m3 1024d** ✓ · long → **nomic-embed-text 768d** ✓ · "short text" → **all-minilm 384d** ✓ · "default english sentence" (33 chars) → all-minilm 384d ✓ (the ≤100-char rule wins — correct, my label was just sloppy) |
| `embeddings.hostamar.com/health` | 200 `{"status":"ok", …4 models…}` |
| :3055 stray | **killed** (pid 411141, `next-server v14.2.35`, no systemd unit, ran 4h42m) → port gone |
| :3011 + hostamar.com | still 200 / 200 (killing the stray changed nothing live) |
| sockets | 51 → **50** |
| VRAM | 6844 MiB used / 1052 free (ComfyUI holds it) — dedup cannot change VRAM |

## 7. Recommendations
1. **~17.2G more is reclaimable** (§2): 3 abandoned `.incomplete` partials, the 7.8G aria2 partial, 2 truncated stubs. Not model data — but I did not delete without your go-ahead.
2. **Two units loop forever** (`hostamar-litserve`, `hostamar-provisioner-native` = `activating (auto-restart)`) and three are `failed` (`hostamar-provisioner`, `hostamar-vps`, `hyperspace`). They burn a restart every few seconds each; `systemctl --user disable --now` them unless you're actively debugging.
3. **models-archive is a real backup holding ~3G of chatterbox that also exists live** — delete the archive copy (or accept the duplicate); don't symlink live→backup.
4. **Hunyuan 1.5 SR**: resume that aria2 download instead of re-downloading 7.8G; **Hunyuan 1.5 i2v is ready to use now**. MiniMax H3 + Music 3 are fully installed and wired to blueprints.
5. **`~/models` is 20G, not 143G** — nothing to clean there; if you expected 143G of weights, they were never on this disk (check `/mnt/c` or the HF cache under `~/.cache/huggingface`).
6. **VRAM, not disk, is the wall**: 6.8G/8.1G is held by ComfyUI + llama.cpp servers. Stopping `prism-bonsai` (18932) and `qwen-local`/`qwen-forward` (8999/18999) frees ~1–2G when you want embeddings or a render to run faster — they restart on demand.
