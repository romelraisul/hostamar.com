# VPS-27B variant — run guide

Goal: route "complex → 27B" to a VPS, since your local RTX 5060 (8GB VRAM)
physically cannot load qwen3.6:27B (17.3GB). Fast/code stay local on GPU.
Cloud is last-resort fallback only.

## Files for THIS box (local WSL)
- `litellm-config.vps.yaml`   — LiteLLM config (valid syntax, VPS+local+cloud)
- `MODEL-ROUTER-RUN.md`        — base run commands (port 4000 etc.)

## Files for the VPS (copy over)
- `docker-compose.vps-27b.yml` — pulls + serves 27B behind the tunnel

## Files for the cloudflared-running box
- `cloudflared-qwen-ingress.yml` — patch to ~/.cloudflared/config.yml

## ORDER OF OPERATIONS

### 1. On the VPS (only run ONE backend)
GPU VPS:
    export MODEL_BACKEND=gpu
    docker compose -f docker-compose.vps-27b.yml --profile gpu up -d --build
    # verify (Docker Model Runner API):
    curl http://localhost:12434/engines/llama.cpp/v1/models

CPU-only VPS (needs >=20GB system RAM free, slower):
    export MODEL_BACKEND=cpu
    docker compose -f docker-compose.vps-27b.yml --profile cpu up -d ollama
    docker exec ollama ollama pull qwen3.6:27B   # if mirrored to Ollama Hub
    # Ollama API: http://localhost:11434/v1

### 2. Patch cloudflared ingress (on the box that runs the tunnel)
Append the qwen.hostamar.com entry from cloudflared-qwen-ingress.yml
into ~/.cloudflared/config.yml ABOVE the `http_status:404` line.
Cloudflare DNS must also route qwen.hostamar.com -> CNAME to the tunnel.
Then: cloudflared tunnel run 19c220ee-37ae-4fad-9c99-495f0e154b12

Verify end-to-end from your WSL box:
    curl https://qwen.hostamar.com/engines/llama.cpp/v1/models   # GPU
    # or /v1/models if Ollama CPU backend

### 3. On your WSL box: run LiteLLM with the VPS-variant config
    export KILOCODE_API_KEY=kk-xxxx   # set once, ~/.bashrc
    docker run -d -p 4000:4000 --name hostamar-router-vps \
      -v /mnt/c/Users/User/hostamar-build/litellm-config.vps.yaml:/app/config.yaml \
      -e KILOCODE_API_KEY=$KILOCODE_API_KEY \
      ghcr.io/berriai/litellm:main-latest \
      --config /app/config.yaml --port 4000

### 4. Test the combined router
    curl http://localhost:4000/v1/models
    POST http://localhost:4000/v1/chat/completions {model:"hostamar-own"}

Routing:
    hostamar-own -> hostamar-reasoning (27B on VPS, default)
       VPS busy/fail -> hostamar-code (12B local) -> hostamar-cloud (429-able)
    hostamar-fast  -> gemma4:E2B (local, ~3.9GB)
    hostamar-code  -> gemma4:12B (local, ~7GB)

## GOTCHAS
- DO NOT recreate the cloudflared tunnel. Reuse 19c220ee. Creds at
  ~/.cloudflared/ are stable.
- `qwen.hostamar.com` DNS must point to the tunnel CNAME (Cloudflare dashboard).
- 27B over a Cloudflare tunnel is slower than local; LiteLLM uses 180s
  request_timeout for that model. Don't shrink it or you'll get false fails.
- hy3-free fallback WILL still hit 429 — there is no way to make the cloud
  endpoint rate-limit-free. Local/VPS-first routing is what avoids 429s
  day-to-day. The fallback is only for when everything else is down.
- The chat snippet's original config keyed `routing_strategy` at YAML root
  with no parent — wrong. It must sit under `router_settings:` (see the
  corrected litellm-config.vps.yaml). I also moved `model_group_alias`
  under `litellm_settings:` per LiteLLM's structure.
