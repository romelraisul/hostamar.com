# Hostamar Secrets & Keys Setup
Generated 2026-07-18 · After full stack recovery

## What was done

### 1. LiteLLM Router — auth fixed

**Problem:** `litellm-play` was `Exited (127)` for 2+ hours. Docker Desktop WSL resolves bind-mount of a single file (`litellm-config.final.yaml`) as a directory → container can't init.

**Fix:** Mount config from `/tmp/litellm-config-mount/` directory copy, not the bare file.

**Current status:** `litellm-play` running on `:4000` with a real `master_key`.
Authentication test: ✅ `GET /v1/models` with `Authorization: Bearer <master_key>` returns 6 models.

### 2. Master Key

Generated file: `/home/romel/hostamar-build/litellm-config.final.yaml` — line 65:
```yaml
general_settings:
  master_key: sk-<generated-hex>
```

This key is also stored in:
- `/tmp/litellm-master-key.txt` (session temp, will be cleaned)
- The config copy at `/tmp/litellm-config-mount/cfg.yaml`

### 3. Video-API Authentication

`video-api/app.py` updated: reads `LITELLM_API_KEY` env var instead of hardcoded placeholder:
```python
headers={"Authorization": f"Bearer {os.getenv('LITELLM_API_KEY', '')}"}
```

Currently `hostamar-video` container runs with `LITELLM_API_KEY` set to the same value as the litellm `master_key` (so it can authenticate to the router). Also has `BUILD_DIR=/app` so output goes to `/app/video-output/` (mounted volume).

Both `docker-compose.video.yml` files (Linux SRC + Windows DEST) updated:
```yaml
environment:
  - BUILD_DIR=/app
  - LITELLM_API_KEY=${LITELLM_API_KEY:-}
```

### 4. Docker Build

`hostamar-build-video-api:latest` image rebuilt with:
- `Dockerfile.v4` variant (lightweight, no torch/worker, just FastAPI + requests)
- Updated `app.py` with env-var auth
- `COPY copyright/ ./copyright` included

## What YOU need to configure (model backends)

`/create` returns 200 with `copyright.id`, but `story` shows `[story-gen unavailable]`.
This is NOT an auth problem — the auth pipeline is fully wired. The story-gen fails
because all model backends are unreachable or unconfigured:

### Required (choose at least one)

| Backend | Where to set | Current state |
|---|---|---|
| **Ollama local models** | Run `ollama pull gema4:4b` on host (port 11434) | ❌ Ollama not running |
| **NVIDIA NIM (glm-5.2, minimax-m3)** | Export `NVIDIA_API_KEY=<your-key>` before `permanent.sh` or in `.env.docker` | ❌ Key not exported |
| **KiloCode Fast (kilocode-fast)** | Export `KILOCODE_API_KEY=<your-key>` before `permanent.sh` or in `.env.docker` | ⏳ Key exists but may need rotation (times out) |

**Quick way to restore story-gen:** Enable ONE of these backends and run:
```bash
docker restart litellm-play   # picks up key changes
curl -X POST http://localhost:3002/create -H "Content-Type: application/json" \
  -d '{"type":"video","prompt":"Eid viral 2026 trending"}'
```

### Fastest path (KiloCode, likely already configured)

From `.env.docker`, `KILOCODE_API_KEY` is set. Export it to the current shell:
```bash
source /home/romel/hostamar-build/.env.docker
docker rm -f litellm-play
# ... (the docker run command from permanent.sh) ...
# Then test:
curl -s --max-time 15 http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $(cat /tmp/litellm-master-key.txt)" \
  -H "Content-Type: application/json" \
  -d '{"model":"kilocode-fast","messages":[{"role":"user","content":"Say hi"}],"max_tokens":10}'
```
If this returns a response but slowly, the key works and just needs more upstream speed.

## What to do after `wsl --shutdown`

The permanent.sh script handles auto-restart of:
- `hostamar-postgres` ✅ (via docker compose)
- `litellm-play` ✅ (with the directory-mount workaround patched in)
- `hostamar-app` (Next.js) ✅ (via docker compose)
- Video stack containers ⚠️ (not fully wired in permanent.sh yet — see below)

### The stack after reboot

1. Run `permanent.sh`:
   ```bash
   bash ~/hostamar-build/permanent.sh
   ```
   This brings up: postgres, redis, hostamar-app, nginx, cloudflared, litellm-play.

2. Start the video API:
   ```bash
   export DOCKER_HOST="unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock"
   cd ~/hostamar-build
   source .env.docker  # exports keys
   export LITELLM_API_KEY=$(cat /tmp/litellm-master-key.txt)  # or whatever the master key is
   docker run -d --name hostamar-video -p 3002:3000 \
     -v "$PWD/video-output":/app/video-output \
     -v "$PWD/trending":/app/trending \
     -v "$PWD/copyright":/app/copyright:ro \
     -v "$PWD/copyright-db":/app/copyright-db \
     -v "$PWD/video-pipeline-lowvram/workflows/lowvram:/app/workflows/lowvram:ro" \
     --restart unless-stopped --network hostamar-network \
     -e BUILD_DIR=/app \
     -e ROUTER_URL=http://host.docker.internal:4000/v1 \
     -e MODEL=hostamar-own-fast \
     -e COMFYUI_URL=http://host.docker.internal:8188 \
     -e LTX_URL=http://host.docker.internal:8189 \
     -e OPENCUT=http://host.docker.internal:8193 \
     -e CHATTERBOX=http://host.docker.internal:8190 \
     -e ACE_STEP=http://host.docker.internal:8191 \
     -e INFINITALK=http://host.docker.internal:8192 \
     -e COPYRIGHT_DB=/app/copyright-db/registry.jsonl \
     -e LITELLM_API_KEY="$LITELLM_API_KEY" \
     --add-host host.docker.internal:host-gateway \
     hostamar-build-video-api:latest
   ```

## Key locations reference

| Item | Path |
|---|---|
| LiteLLM config (with master_key) | `/home/romel/hostamar-build/litellm-config.final.yaml` |
| LiteLLM mount copy (container-ready) | `/tmp/litellm-config-mount/` |
| Guard callback module | `/home/romel/hostamar-build/guard/` |
| Auto-launch script | `/home/romel/hostamar-build/permanent.sh` |
| .env with API keys | `/home/romel/hostamar-build/.env.docker` |
| Video API code | `/home/romel/hostamar-build/video-api/app.py` |
| Video API image | `hostamar-build-video-api:latest` |
| Next.js app image | `hostamar-app:latest` |
| Win-side compose (used by Docker Desktop) | `/mnt/c/Users/User/hostamar-build/docker-compose.video.yml` |

## Verification checklist (run after any change)

```bash
export DOCKER_HOST="unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock"

# 1. All containers up
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'hostamar|litellm'

# 2. Signup works
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# 3. Router auth works
curl -s http://localhost:4000/v1/models \
  -H "Authorization: Bearer $(cat /tmp/litellm-master-key.txt)"

# 4. /create works (expect 200 with copyright.id, story may be unavailable without model backend)
curl -s -X POST http://localhost:3002/create \
  -H "Content-Type: application/json" \
  -d '{"type":"video","prompt":"Eid viral 2026 trending"}'
```
