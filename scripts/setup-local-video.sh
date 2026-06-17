#!/usr/bin/env bash
# setup-local-video.sh — install AnimateDiff Lightning locally so the GPU
# worker can generate videos on your RTX 5060 without paying APIs.
#
# Run from WSL (must have the gpu-worker container running; this script
# installs into the container, NOT the host).
#
# Usage:
#   bash scripts/setup-local-video.sh
#
# Idempotent — re-run skips already-installed steps.

set -euo pipefail

CONTAINER="hostamar-gpu-worker"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: $CONTAINER not running. Start it with:" >&2
  echo "  cd /mnt/c/Users/romel/hostamar-local/flociops-assistant && \\" >&2
  echo "  docker compose -f docker-compose.local.yml up -d gpu-worker" >&2
  exit 1
fi

echo ">>> Step 1/4: upgrade torch to >= 2.7 (sm_120 / RTX 5060 wheel)"
docker exec "$CONTAINER" python3 -m pip install --no-cache-dir --upgrade \
  "torch>=2.7.0" "torchvision>=0.22.0" "torchaudio>=2.7.0" \
  --index-url https://download.pytorch.org/whl/cu128 \
  --extra-index-url https://pypi.org/simple/

echo ""
echo ">>> Step 2/4: install diffusers + transformers + accelerate (HF stack)"
docker exec "$CONTAINER" python3 -m pip install --no-cache-dir --upgrade \
  "diffusers>=0.30.0" \
  "transformers>=4.44.0" \
  "accelerate>=0.34.0" \
  "safetensors>=0.4.5"

echo ""
echo ">>> Step 3/4: smoke-test torch + CUDA on RTX 5060 sm_120"
docker exec "$CONTAINER" python3 - <<'PY'
import torch, time
print(f"torch={torch.__version__} cuda={torch.version.cuda} sm={torch.cuda.get_device_capability(0)}")
t0 = time.time()
x = torch.randn(2048, 2048, device="cuda", dtype=torch.float16)
x = x @ x
torch.cuda.synchronize()
print(f"2k fp16 matmul: {time.time()-t0:.2f}s, peak {torch.cuda.max_memory_allocated()/1024**2:.0f} MB")
print("CUDA compute OK on this GPU")
PY

echo ""
echo ">>> Step 4/4: download AnimateDiff Lightning checkpoint (~3GB)"
mkdir -p /tmp/animatediff
docker exec "$CONTAINER" python3 - <<'PY'
import os
os.environ["HF_HOME"] = "/root/.cache/huggingface"
from huggingface_hub import snapshot_download
local = snapshot_download(
    repo_id="ByteDance/AnimateDiff-Lightning",
    cache_dir="/root/.cache/huggingface",
    allow_patterns=[
        "animatediff_lightning_*_256_*_unet.safetensors",
        "scheduler/*",
        "vae/*",
        "tokenizer/*",
        "text_encoder/*",
    ],
)
print("downloaded to:", local)
import os
for f in sorted(os.listdir(local)):
    if os.path.isfile(os.path.join(local, f)):
        print(" -", f)
PY

echo ""
echo "✅ AnimateDiff Lightning is ready."
echo ""
echo "Next: enable the local provider in the worker:"
echo "  1. Edit workers/video_worker_gpu.py — uncomment 'local' in PROVIDER_PRIORITY"
echo "  2. Or set: VIDEO_PROVIDER_PRIMARY=local in .env.local"
echo "  3. Rebuild: docker compose -f docker-compose.local.yml up -d --no-deps --build gpu-worker"
echo "  4. Smoke-test:"
echo "     HUGGINGFACE_API_TOKEN=<same> python3 scripts/smoke-test-video.py"
