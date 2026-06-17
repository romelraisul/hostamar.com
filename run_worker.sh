#!/bin/bash
# Wrapper that injects API tokens before starting the GPU worker.
# Tokens are read from docker-compose environment or passed directly.
export HUGGINGFACE_API_TOKEN=${HUGGINGFACE_API_TOKEN:-}
export REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN:-}
export FAL_AI_API_KEY=${FAL_AI_API_KEY:-}

echo "[worker-init] HUGGINGFACE_API_TOKEN set: $([ -n "$HUGGINGFACE_API_TOKEN" ] && echo yes || echo no)"
echo "[worker-init] REPLICATE_API_TOKEN set: $([ -n "$REPLICATE_API_TOKEN" ] && echo yes || echo no)"
echo "[worker-init] FAL_AI_API_KEY set: $([ -n "$FAL_AI_API_KEY" ] && echo yes || echo no)"

exec python3 /app/workers/video_worker_gpu.py
