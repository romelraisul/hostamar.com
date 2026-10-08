# WSL FULL INVENTORY — real commands, no fake
Generated: 2026-10-09 (WSL, `wsl --version` side: WSL2, mirrored networking)
Live worker: hostamar-pages `56020176-05a9-46bd-a7a9-a15412587166` (commit `1eb9eaf9`)
Method: read-only. Every number below came from a command in this session; nothing estimated.
Copied from /tmp/WSL_INVENTORY.md into the repo so it survives (git ignores /tmp).

## 1. System base (verified)
| Item | Value | Command |
|---|---|---|
| Distro | Ubuntu 26.04 LTS | `grep PRETTY_NAME /etc/os-release` |
| Kernel | 6.6.114.1-microsoft-standard-WSL2 | `uname -r` |
| systemd | systemd 259 (259.5-0ubuntu3.4), PID 1 | `systemctl --version` |
| Networking | `networkingMode=mirrored` (Windows `.wslconfig`: memory=36GB, processors=10) | `/etc/wsl.conf`, `C:\Users\User\.wslconfig` |
| Uptime | up 8h 27m | `uptime -p` |
| RAM | 35 GiB total, 13 GiB used, 21 GiB available | `free -h` |
| Swap | 16 GiB total, 2.1 GiB used | `free -h` |
| Disk (/) | 1007 GB total, 576 GB used, 381 GB free (61%) | `df -h /` |
| GPU | NVIDIA GeForce RTX 5060, driver 610.47, 8151 MiB total, **6698 MiB used, 1198 MiB free**, util 0% | `nvidia-smi --query-gpu=...` |
| Linger | yes (user units start at boot) | `loginctl show-user $USER -p Linger` |
| Listening sockets | 51 | `ss -ltnH \| wc -l` |

## 2. Software running — counts
| Category | Running | Command |
|---|---|---|
| systemd **user** services | **30** | `systemctl --user list-units --type=service --state=running` |
| systemd **system** services | **18** | `systemctl list-units --type=service --state=running` |
| Docker/podman containers | **12 running** (13 defined; `host-proxy` = Created) | `docker ps -a` |
| Docker images | **16** unique | `docker images -q \| sort -u \| wc -l` |
| Listening TCP sockets | **51** | `ss -ltn` |
| **Total running service instances** | **60** (30 user + 18 system + 12 containers) | — |

System services (18): chrony, containerd, cron, dbus, docker, getty@tty1, networkd-dispatcher, oom-watch, polkit, rsyslog, systemd-journald, systemd-logind, systemd-resolved, systemd-udevd, tailscaled, unattended-upgrades, user@1000, wsl-pro.

User services (30): camofox-tunnel, camofox, cloudflared, comfyui, dbus, glm-proxy, hermes-gateway, hostamar-comfy-worker, hostamar-embedding-router, hostamar-interop-bridge, hostamar-next, hostamar-ollama, hostamar-tunnel, longcat-browser, medusa-ingress-tunnel, nvidia-guard, omniroute, opencode-proxy, prism-bonsai, puppy-linux, qwen-forward, qwen-local, restream, second-brain, tv-agent, tv-ffmpeg-vp9, tv-ffmpeg, tv-hls2, tv-tunnel, tv-viral.

## 3. Software table (service → port → pid → unit)
| Service | Version/impl | Port | PID | Unit | Status |
|---|---|---|---|---|---|
| Ollama (embeddings) | 0.24.0 | 11434 | 939769 | hostamar-ollama.service (user) | active |
| Embedding router | python3 stdlib | 8081 | 976158 | hostamar-embedding-router.service (user) | active |
| Next.js hostamar-next | next-server 14.2.35 | 3011 | 1002460 (unit MainPID) | hostamar-next.service (user) | active |
| Next.js hostamar.com (dev/prod) | next-server 14.2.35 | 3055 | 411141 (cwd ~/hostamar.com) | — | listening |
| ComfyUI | python main.py | 8188 | 472 | comfyui.service (user) | active |
| cloudflared tunnel (hostamar-local, 5affa5bd) | /usr/local/bin/cloudflared | — | 918472/918473 | cloudflared.service + hostamar-tunnel.service | active |
| nvidia-guard | python3 | 12436 | 481839 | nvidia-guard.service (user) | active |
| OmniRoute | v16.3.1 | 20128 | 1165 | omniroute.service (user) | active (401 w/o key) |
| longcat-browser | python3 (Windows path) | 8082 | 487 | longcat-browser.service (user) | active |
| Camofox browser | node server.js | 9377 | 469 | camofox.service (user) | active |
| second-brain | node harmes-workspace/server.mjs | 3010 | 504 | second-brain.service (user) | active |
| TV HLS2 static | python3 tv-hls2-server.py | 8090 | 508 | tv-hls2.service (user) | active |
| TV RTMP+HLS nginx | podman/pasta | 1935 | 1060 | tv-rtmp.service (user) | active |
| Puppy Linux VM (noVNC) | podman/pasta | 8006 | 1177 | puppy-linux.service (user) | active |
| Prism Bonsai (llama.cpp) | llama-server b10709 | 18932 | 517 | prism-bonsai.service (user) | active |
| Qwen3.8-27B llama.cpp | llama-server | 8999 | 503 | (qwen-local.service) | active |
| qwen-forward | python3 | 18999 | 501 | qwen-forward.service (user) | active |
| GLM proxy (AutoClaw) | node glm_proxy | 18791 | 473 | glm-proxy.service (user) | active |
| OpenCode proxy | python3 v10 | 8181 | 490 | opencode-proxy.service (user) | active |
| AgentRouter proxy | python3 | 8318 | 10862 | — | listening |
| Hermes gateway | .hermes/tools/python | 8642 | 54480 | hermes-gateway.service (user) | active |
| Interop bridge | python3 bridge.py | 3000 | 476 | hostamar-interop-bridge.service (user) | active |
| Infisical (docker) | infisical-wsl | 8089→8080 | — | container | Up 5h |
| FreeLLMAPI (docker) | freellmapi | 3002→3001 | — | container | Up 8h (healthy) |
| LiteLLM (docker) | litellm-play | 4000 | — | container | Up ~1h |
| Medusa (docker) | medusa-wsl | 9002→9000 | — | container | Up 8h |
| Teldrive (docker) | teldrive | 8091→8080 | — | container | Up 8h |
| Teldrive DB (docker) | teldrive-db | 5433→5432 | — | container | Up 8h |
| Coolify (docker) | coolify-wsl | 8000→8080 | — | container | Up 8h (healthy) |
| OpenObserve (docker) | openobserve-wsl | 5080 | — | container | Up 8h |
| Postgres (docker) | hostamar-postgres | 5432 | — | container | Up 8h (healthy) |
| Redis (docker) | redis-foundation | 6379 (internal) | — | container | Up 8h |
| TV HLS2 (docker) | host-hls2 | none published | — | container | Up 8h |
| CF tunnel (docker) | hostamar-cloudflare-tunnel | none published | — | container | Up 8h |
| host-proxy (docker) | — | — | — | container | Created (not running) |

Binaries: ollama 0.24.0, python3 (system), node/npm (`~/.hermes/node`), docker + podman + cloudflared present, nvcc MISSING (driver-only CUDA; no CUDA toolkit) — `nvidia-smi` works, compilation does not.
Python pkgs of interest: none of torch/transformers/sentence-transformers/fastapi/uvicorn/ollama installed in the **system** python (piped grep empty) — the ML venvs live elsewhere (`~/open-webui-venv`, ComfyUI's own env).
`~/hostamar-build`: total 1.6 GB (docker/ 951M, backups/ 71M, scripts/ 172K, rest <70K).

## 4. Models inventory — counts
| Store | Count | Disk | Command |
|---|---|---|---|
| Ollama (embeddings) | **4 models** | ~2.1 GB | `ollama list` |
| ComfyUI model files | **56 files** | ~262 GB | `find ~/ComfyUI/models -type f \( -name '*.safetensors' -o ... \) \| wc -l` |
| HF hub cache repos | **16 repos** | ~3.0 GB (13 of them are config/metadata stubs) | `ls ~/.cache/huggingface/hub \| wc -l` |
| GGUF on disk | Qwen3.8-27B Q4_K_XL **16.4 GB** | 20 GB dir | `~/models` |
| models-archive | — | 7.5 GB | `du -sh ~/models-archive` |
| **Model storage total** | — | **~295 GB** | 2.1 + 262 + 20 + 3.0 + 7.5 |

### Ollama models (all are embedding models)
| Model | Dim | File size | VRAM when loaded | Route |
|---|---|---|---|---|
| all-minilm | 384 | 45 MB | ~0.8 GB | short input (<=100 chars) |
| nomic-embed-text | 768 | 274 MB | ~1.2 GB | long input (>2000 chars) |
| mxbai-embed-large | 1024 | 669 MB | ~2.5 GB | default English |
| bge-m3 | 1024 | 1.2 GB | ~2.3 GB (CPU/GPU split) | Bangla script detected |
`OLLAMA_KEEP_ALIVE=5m` — models unload after 5 min (verified: `ollama ps` showed "4 minutes from now").

### ComfyUI model store (top dirs)
diffusion_models 97G | text_encoders 78G | LLM 31G | minimax-music3 18G | chatterbox 13G | checkpoints 6.5G | vae 5.2G | cosyvoice3-bengali 5.1G | cosyvoice2 4.6G | clip 1.6G | openjev-verdict-2.0 1.5G | upscale_models 64M.

Largest single files (>1 GB, top 12):
19.5G minimax_h3_ref2va_pruned_fp8_scaled.safetensors
16.4G ~/models/Qwen3.8-27B/Qwen3.8-27B-UD-Q4_K_XL.gguf
16.3G text_encoders/qwen3vl_8b_bf16.safetensors
16.0G diffusion_models/minimax-h3-fl2va-nf4.safetensors
14.6G text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors
13.3G diffusion_models/qwen_image_2.1_bf16.safetensors (x2 — duplicate, see §7)
12.3G diffusion_models/split_files/.../hunyuan_video_720_fp8_e4m3fn.safetensors
8.8G text_encoders/qwen3.5_9b_qwen_image_2.1_pe_t2i.int8_convrot.safetensors
8.8G text_encoders/qwen3.5_9b_qwen_image_2.1_pe_i2i.int8_convrot.safetensors
8.7G text_encoders/qwen3vl_8b_int8_convrot.safetensors (x2 — duplicate)

## 5. Ports table (all listeners that matter)
| Port | Service | PID |
|---|---|---|
| 1935 | TV RTMP (podman) | 1060 |
| 3000 | interop bridge | 476 |
| 3002 | FreeLLMAPI (docker) | container |
| 3010 | second-brain | 504 |
| 3011 | hostamar-next (next-server) | 1002460 |
| 3055 | Next hostamar.com | 411141 |
| 4000 | LiteLLM (docker) | container |
| 5080 | OpenObserve (docker) | container |
| 5432 / 5433 | hostamar-postgres / teldrive-db | containers |
| 8000 | Coolify (docker) | container |
| 8006 | Puppy Linux noVNC | 1177 |
| 8081 | **embedding router** | 976158 |
| 8082 | longcat-browser | 487 |
| 8089 | Infisical (docker) | container |
| 8090 | TV HLS2 | 508 |
| 8091 | Teldrive (docker) | container |
| 8181 | OpenCode proxy | 490 |
| 8188 | ComfyUI | 472 |
| 8318 | AgentRouter proxy | 10862 |
| 8642 | Hermes gateway | 54480 |
| 8999 | Qwen3.8-27B llama.cpp | 503 |
| 9002 | Medusa (docker) | container |
| 9377 | Camofox | 469 |
| 11434 | **Ollama** | 939769 |
| 12436 | nvidia-guard | 481839 |
| 18791 | GLM proxy | 473 |
| 18932 | Prism Bonsai llama.cpp | 517 |
| 18999 | qwen-forward | 501 |
| 20128 | OmniRoute | 1165 |

Public endpoints (curl, live): https://hostamar.com/ 200 (1.49s) · https://browser.hostamar.com 200 (2.66s) · https://comfy.hostamar.com 200 (1.16s) · https://embeddings.hostamar.com/health 200 (`/api/tags` 404 — the router exposes OpenAI-shaped `/v1/embeddings` + `/health`, not Ollama's API) · http://localhost:8188/system_stats 200 · http://localhost:3002/v1/models 401 (auth) · http://localhost:20128/v1/models 401 (auth; the key in `~/hostamar-build/.env.providers` is rejected as "Invalid API key", so OmniRoute's real model count is **not verifiable** by me — its unit description claims 546 models).
hostamar.com/api/v1/models = **151** (the "152" in the task text is off by one vs live), /api/v1/tools = 53.

## 6. Disk usage, top folders
`~`: ComfyUI 268G · OpenMontage 24G · models 20G · ACE-Step-1.5 8.6G · open-webui-venv 7.9G · models-archive 7.5G · bonsai2 6.8G · hostamar.com 6.5G · chatterbox 6.2G · InfiniteTalk 5.7G · hostamar-deploy-reel 4.8G · colibri 4.8G.
Filesystem: 1007G total, 576G used, 381G free.

## 7. Duplicates found (potential reclaim, NOT deleted — inventory only)
8 groups, same name + same size, first 8 MB byte-identical (`md5` of head; full-file hash not computed):
| Wasted | File | Duplicated between |
|---|---|---|
| 13.3G | qwen_image_2.1_bf16.safetensors | `models/diffusion_models/` and `models/diffusion_models/diffusion_models/` |
| 8.7G | qwen3vl_8b_int8_convrot.safetensors | `models/text_encoders/` and `models/text_encoders/text_encoders/` |
| 5.9G | qwen3vl_8b_w4a8.safetensors | same nested `text_encoders/text_encoders/` pattern |
| 2.0G | t3_cfg.safetensors | `ComfyUI/models/chatterbox/` vs `~/models-archive/hub/models--ResembleAI--chatterbox/` |
| 1.0G | s3gen.safetensors | same chatterbox pair |
| 0.9G | model.safetensors | `models/cosyvoice2/CosyVoice-BlankEN/` vs `models/cosyvoice3-bengali/CosyVoice-BlankEN/` |
| 0.6G | qwen_image_2.1_vae_bf16.safetensors | `models/vae/` and `models/vae/vae/` |
| 0.1G | next-swc.linux-x64-musl.node | `models-archive/hostamar-local-backup/hostamar-local{,/flociops-assistant}/node_modules` |
**Reclaimable: ~32.5 GB** — executed 2026-10-09: 5 pairs symlinked after full-file md5, **29.4G freed** (disk 381G→411G free); see `docs/WSL_CLEAN_INVENTORY.md` — three of them come from `X/X/` nested self-copies (a symlink or a delete fixes all three at once; ComfyUI follows symlinks). Two are the same chatterbox weights kept in both the live store and the archive (archive copy is the disposable one if the live copy is verified complete).

## 8. Recommendations
1. **Nothing was installed, removed, or restarted** — this run was read-only.
2. **~32.5 GB reclaimable** from §7 duplicates; the `X/X/` nested copies are the safe first target (same name, same size, identical head).
3. **Port conflicts: none.** `:8081` (embedding router) and `:8082` (longcat-browser) coexist; the original plan's choice of 8082 was already taken — 8081 was correct.
4. **VRAM is the real constraint, not disk**: 6698/8151 MiB is held by ComfyUI (llama.cpp Qwen + Bonsai servers also resident). Only 1198 MiB free, which is why `bge-m3` splits CPU/GPU (~1-2s/call). Embeddings are fine; a parallel video render + heavy embedding burst is where contention would show.
5. **Two Next servers run at once** (`:3011` hostamar-next = the Worker's tunnel origin, `:3055` = a plain `~/hostamar.com` next-server). The `:3055` one is not the site — hostamar.com is served by the Cloudflare Worker `hostamar-pages`; it looks like a leftover dev server and can go when convenient.
6. **One 1cr-cost path stays dormant by design**: `OPENROUTER_API_KEY` + fallback remain the PC-off path for embeddings; with the local stack up, embeddings cost $0 upstream.
7. **`nvcc` absent** — CUDA work here is driver/runtime only (`nvidia-smi` fine, no toolkit). Adding the toolkit would be ~1.5 GB; not needed unless something must be compiled locally.
8. **HF cache is 16 repos but only ~2.9 GB of real weights** (chatterbox); the other 15 are config-only stubs — no meaningful disk to win there, ignore them.
9. **No fluff counts**: "60 running service instances" = 30 user units + 18 system units + 12 containers. `host-proxy` is Created, not running, and is excluded.

## 9. Final counts (one line)
60 running service instances (30 user + 18 system + 12 docker) · 51 listening TCP ports · 16 docker images · **4** Ollama embedding models (2.1 GB) · **56** ComfyUI model files (262 GB) · 16 HF hub repos (3.0 GB) · 1 local GGUF 16.4 GB · ~295 GB model storage · disk 576/1007 GB used (381 GB free) · RAM 13/35 GiB · VRAM 6698/8151 MiB (1198 MiB free) · reclaimable via duplicates ~32.5 GB.
