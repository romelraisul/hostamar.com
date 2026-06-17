#!/bin/bash
# Local GPU Worker Startup Script
# Run this on your local machine with NVIDIA GPU

set -e

echo "🚀 Starting Local GPU Worker for Hostamar..."

# Check for NVIDIA GPU
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ NVIDIA GPU not detected. Exiting."
    exit 1
fi

echo "✅ NVIDIA GPU detected:"
nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed. Exiting."
    exit 1
fi

# Check for NVIDIA Container Toolkit
if ! docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi &> /dev/null; then
    echo "❌ NVIDIA Container Toolkit not installed."
    echo "Install: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    exit 1
fi

echo "✅ NVIDIA Container Toolkit working"

# Environment variables (set these in .env.local or export)
export UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-}"
export UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-}"
export REPLICATE_API_TOKEN="${REPLICATE_API_TOKEN:-}"
export FAL_AI_API_KEY="${FAL_AI_API_KEY:-}"

if [ -z "$UPSTASH_REDIS_REST_URL" ] || [ -z "$UPSTASH_REDIS_REST_TOKEN" ]; then
    echo "❌ Upstash Redis credentials not set. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    exit 1
fi

echo "✅ Environment variables set"

# Build the GPU worker image
echo "🔨 Building GPU worker image..."
docker build -f Dockerfile.gpu-worker -t hostamar/gpu-worker:latest .

# Run the worker
echo "🚀 Starting GPU worker container..."
docker run -d \
  --name hostamar-gpu-worker \
  --restart unless-stopped \
  --gpus all \
  -e UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
  -e UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
  -e REPLICATE_API_TOKEN="$REPLICATE_API_TOKEN" \
  -e FAL_AI_API_KEY="$FAL_AI_API_KEY" \
  -e WORKER_NAME="hostamar-gpu-worker-local" \
  -e WORKER_CONCURRENCY=2 \
  -v /tmp:/tmp \
  hostamar/gpu-worker:latest

echo "✅ GPU worker started!"
echo "📊 Monitor logs: docker logs -f hostamar-gpu-worker"
echo "🛑 Stop: docker stop hostamar-gpu-worker"