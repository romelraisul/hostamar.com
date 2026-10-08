# WSL_FULL_MODELS_ADDED — video models in hostamar model list · bonsai2/Prism located · "resume aria2" resolved · 6 broken services repaired

Session: 2026-10-09 (WSL, RTX 5060, mirrored networking). All numbers below are measured, not estimated.
Base: commit c640f4cc · CF worker `hostamar-pages` version 56020176-05a9-46bd-a7a9-a15412587166.

---

## 1. All models added to hostamar.com/api/v1/models — 151 → 175

Source of truth is now `lib/hostamar-models.ts` → `HOSTAMAR_LOCAL_CATALOG` (24 entries: type, real size,
on-disk path, service, dim for embeddings). `app/api/v1/models/route.ts` maps it to OpenAI shape
(`id: local/...`, `owned_by: local`, `local: true`, `size_gb`, `location`) and appends it to **both**
branches (KV/free-model branch and the offline `MODELS_95` branch), so the local inventory never
disappears when upstream catalogs are unreachable. Response gains `localAdded: 24`.

Cloud catalog: 151 entries. Declared total: **175**.

Sizes are **GiB** (2^30), each measured with `stat -c%s` / `du -sb` on this box.

| # | id | type | size | on disk |
|---|----|------|------|---------|
| 1 | local/minimax-h3-ref2va-fp8 | video | 19.5G | diffusion_models/minimax_h3_ref2va_pruned_fp8_scaled.safetensors |
| 2 | local/minimax-h3-fl2va-nf4 | video | 16.0G | diffusion_models/minimax-h3-fl2va-nf4.safetensors (packed kernels broken on ComfyUI 0.37.0) |
| 3 | local/hunyuanvideo1.5-720p-i2v | video | 7.76G | hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors |
| 4 | local/hunyuanvideo1.5-720p-sr | video | 7.76G | hunyuanvideo1.5_720p_sr_distilled_fp8_scaled.safetensors |
| 5 | local/hunyuan-video-720-fp8 | video | 12.28G | ComfyUI/models/diffusion_models/split_files/diffusion_models/hunyuan_video_720_fp8_e4m3fn.safetensors |
| 6 | local/minimax-music3 | audio | 18.0G | ComfyUI/models/minimax-music3/ |
| 7 | local/cosyvoice3-bengali | audio | 4.13G | ComfyUI/models/cosyvoice3-bengali/ |
| 8 | local/cosyvoice2 | audio | 4.52G | ComfyUI/models/cosyvoice2/ |
| 9 | local/chatterbox-multilingual | audio | 12.91G | ComfyUI/models/chatterbox/ |
| 10 | local/qwen-image-2.1 | image | 13.3G | diffusion_models/qwen_image_2.1_bf16.safetensors (+int8 6.8G) |
| 11 | local/qwen3vl-8b-int8 | vision | 8.7G | text_encoders/qwen3vl_8b_int8_convrot.safetensors |
| 12 | local/qwen3vl-8b-w4a8 | vision | 5.9G | text_encoders/qwen3vl_8b_w4a8.safetensors |
| 13 | local/qwen3vl-32b-minimax-h3-nvfp4-awq | vision | 14.6G | text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors |
| 14 | local/bonsai-27b-pq2 | llm | 6.8G | bonsai2/27b/27b-pq2.gguf → prism-bonsai.service :18932 |
| 15 | local/qwen3.8-27b-q4-k-xl | llm | 16.4G | models/Qwen3.8-27B/Qwen3.8-27B-UD-Q4_K_XL.gguf → qwen-local.service :8999 |
| 16 | local/sdxl-turbo-1.0-fp16 | image | 6.5G | checkpoints/sd_xl_turbo_1.0_fp16.safetensors → litserve :11445 |
| 17 | local/llava-llama-3-8b-v1.1 | vision | 15.7G | ComfyUI/models/LLM/llava-llama-3-8b-v1_1-transformers/ |
| 18 | local/llava-llama-3-8b-text-encoder | llm | 15.0G | ComfyUI/models/LLM/llava-llama-3-8b-text-encoder-tokenizer/ |
| 19 | local/openjev-verdict-2.0 | llm | 1.41G | ComfyUI/models/openjev-verdict-2.0/ (Bengali verdict scorer) |
| 20 | local/bengali-whisper-medium | stt | 2.9G | models/bengali-whisper-medium/ |
| 21 | local/nomic-embed-text | embedding | 0.26G · 768d | ollama :11434 (long input) |
| 22 | local/bge-m3 | embedding | 1.08G · 1024d | ollama :11434 (বাংলা script) |
| 23 | local/mxbai-embed-large | embedding | 0.62G · 1024d | ollama :11434 (default) |
| 24 | local/all-minilm | embedding | 0.04G · 384d | ollama :11434 (short input) |

Local ids are **not chat-routable** — nothing in the chat path validates or consumes the catalog
(verified by grep), so adding them cannot break `/v1/chat/completions`.

## 2. Bonsai2 "prijom" — found: it is প্রিজম = **Prism**, and it is already serving

Path: `/home/romel/bonsai2/27b/27b-pq2.gguf` — 6.8G, first 4 bytes `GGUF` (valid).
Runner: `/home/romel/.local/bin`-less binary `/home/romel/prism-llama.cpp/llama-prism-b10709-9a9394a/llama-server`,
launched by `~/bonsai2/27b/start.sh` and supervised by **`prism-bonsai.service` — currently active**:

    llama_server: model loaded
    llama_server: listening on http://0.0.0.0:18932
    flags: -c 65536 -ngl 99 -fa on      (64K context matches the Hermes 64K minimum)

No download needed; local use is a plain POST to `http://127.0.0.1:18932` (OpenAI-compatible).

## 3. "Resume aria2 + fix services if download starts" — nothing was missing

The arbitration used the wrong oracle before. Corrected with two independent checks:

| file | bytes | tensors | last tensor offset == EOF | metadata `model_type` |
|------|-------|---------|---------------------------|------------------------|
| hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors | 8,330,399,746 | 1926 | ✅ | hunyuanvideo1.5_720p_i2v_distilled |
| hunyuanvideo1.5_720p_sr_distilled_fp8_scaled.safetensors | 8,335,262,258 | 1932 | ✅ | hunyuanvideo1.5_720p_sr_distilled |

- A safetensors file is complete **iff** the last tensor byte range ends exactly at EOF — both do.
- The sha256-named file `aceeffabe…ec3` is the **genuine 720p SR model**, a Kijai-style `fp8_scaled`
  repack (not the Comfy-Org bytes), which is why its sha256 matched neither its filename nor HF's oid
  `7827c900…`. HF's LFS oid was the wrong test, not the file. It has been restored under
  `hunyuanvideo1.5_720p_sr_distilled_fp8_scaled.safetensors` — the name ComfyUI's flat scan needs.
- So **no aria2 resume was warranted**. A re-download that had been started on the false "corrupt"
  diagnosis was stopped at 7.40G and moved aside.

Moved to `~/hostamar-build/backups/stale-downloads/` (recoverable, nothing deleted):
`partial_hunyuanvideo1.5_720p_sr_distilled_fp8_scaled.safetensors` (7.40G) + its `.aria2` control
(resumable if you ever want the Comfy-Org variant instead), `42bc5837….aria2` (orphan control, no data),
and the two truncated `split_files/diffusion_models/` stubs (18.4MB + 230KB of 8.3G each).

Disk: 547G used / **409G free** (was 546G/411G; +7.4G sits in backups, reclaimable).

## 4. Six broken services — all resolved, 6 failed units → 0

| unit | root cause (measured) | action | now |
|------|----------------------|--------|-----|
| **hostamar-litserve** | Windows-side `hostamar-ai-gateway` (autostart `Start\...\start-hostamar-gateway.bat`, python_embeded, PID 17212) owns `0.0.0.0:11442`; mirrored networking shares the port → **3,121 bind failures**, exit 3 NOTIMPLEMENTED | the Windows gateway is a live repo dependency (`scripts/tv/create_from_free.ts` → `172.17.112.1:11442`), so litserve moved to **:11445**; unit hardened (RestartSec 10→30, +TimeoutStopSec=60, +KillMode=mixed, +StartLimitIntervalSec=0) | **active**, `/health` ok, **real SDXL-Turbo render verified: 867,434-byte valid PNG in 22.6s** |
| **hostamar-vps** | `WorkingDirectory=~/hostamar-build` (compose file lives in `~/hostamar.com`); `Type=simple` let systemd SIGKILL the process group → orphaned containers + dead `rootlessport` port-forwards; a stale container still carried the old `:3002` publish | repointed; `Type=oneshot` + `RemainAfterExit=yes` + `TimeoutStartSec=600`; uptime-kuma remapped `:3002`→**`:3004`** (3002 is the live FreeLLMAPI); `down` + `up -d` | **active**, 5 containers up: openwebui :3003, code-server :8443 (302), uptime-kuma :3004 (302), minio :9000/:9001 (403 = S3 root, correct), hosting-provisioner |
| **hyperspace** | unquoted `Environment=PATH=` containing `/mnt/c/Program Files/...` made the unit invalid (fixed → it then started and exposed the real fault): `✗ Fatal error: loro-crdt engine unavailable (loro_wasm_bg.wasm missing)`; the asset exists nowhere on disk → incomplete binary install | disabled (reversible) | inactive/disabled — needs a re-install of the hyperspace release with its wasm asset |
| **hostamar-provisioner** | podman `.container` unit for an app whose path was gone | `.container` moved to `backups/systemd-disabled/`; the compose stack already runs `hosting-provisioner` | removed (no duplicate) |
| **hostamar-provisioner-native** | `WorkingDirectory`/`EnvironmentFile`/`ExecStart` still pointed at `~/hostamar-build/apps/provisioner` (moved to `~/hostamar.com/apps/provisioner`); also missing `UPTIME_KUMA_API_KEY` | paths repointed (`worker.mjs` syntax OK) | disabled — one human step: create an API key in uptime-kuma `:3004` → Settings → API Keys, write `UPTIME_KUMA_URL=http://127.0.0.1:3004` + `UPTIME_KUMA_API_KEY=…` to `~/hostamar.com/apps/provisioner/.env`, then `systemctl --user enable --now hostamar-provisioner-native` |
| **podman-restart** | referenced a container (`3f297a9f…`) that no longer exists | disabled | inactive/disabled — the live containers carry their own restart policies |

Nothing on the DO-NOT-TOUCH list was disturbed: **Docker stack 12/12 still up** (FreeLLMAPI :3002 = 200,
postgres, infisical :8089, tunnel…), litserve :11445 ok, embeddings stack untouched.

## 5. Method note (why the earlier read was wrong)

Two separate oracles were conflated. HF's LFS `oid` identifies *that repo's* bytes; a valid model can be
a repack (different bytes, identical length). The four checks that actually settle provenance and
completeness of a local safetensors file, in order: (1) `GGUF`/header parse, (2) `__metadata__.model_type`,
(3) tensor count, (4) last `data_offsets` end == file size. sha256-vs-upstream is only meaningful when the
file came from that upstream.

## 5b. Shipping this: the CF upload path is the flaky part, not the code

`wrangler deploy` failed 3× with `✘ [ERROR] fetch failed` **after** all 68 assets uploaded, then
succeeded on attempt 4. Measured cause: from this WSL host, a small GET to `api.cloudflare.com`
answers in 0.8 s, but large POST bodies run at **0.3-0.6 MB/s** (a 12 MB probe took 20-60 s, and
about half never returned at all). Not size, not MTU (`eth0` 1420; 1400-byte packets pass). One
2-minute `wrangler` run also hung 494 s on the version POST — same pathology.

So: build once, then retry **only** the deploy step (`/tmp/ship_retry.sh`, up to 6 attempts,
~25 s apart). Versions shipped this session: `f1d8a00a-5dba-4405-939e-6b69e74d9467` (24 local
models) then `587ec794-1540-4bcc-b99e-1d07f3d7ec5a` (corrected GiB sizes). Live proof:
`curl -s https://hostamar.com/api/v1/models | jq '.data|length'` → **175**, `localAdded: 24`,
`/`, `/store`, `/pricing`, `/bangla-llm`, `/payment`, `/api/health` all 200.

## 6. Open items needing your call

1. `hostamar-vps` is **enabled and active** (5-container stack auto-starts at boot). Reverse with `systemctl --user disable hostamar-vps` if the RAM is wanted back.
2. openwebui (:3003) answered 000 at probe time (slow first boot / model init); re-check or leave.
3. Reclaim ~7.4G in `backups/stale-downloads/` if the Comfy-Org SR variant is not wanted.
4. hyperspace needs a clean re-install if that experiment is still live.
