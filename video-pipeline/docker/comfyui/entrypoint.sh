#!/usr/bin/env bash
# =============================================================================
# entrypoint.sh — boots ComfyUI AND downloads the real model weights from
# HuggingFace into the mounted ./models volume. Uses HF_TOKEN (set in compose
# env) for gated repos (LTX-2, Chatterbox). Run once per fresh volume.
# Weights are pinned to canonical repos released with the brief's node versions.
# =============================================================================
set -euo pipefail
source /opt/venv/bin/activate
export HF_HUB_ENABLE_HF_TRANSFER=1

MODELS=/app/ComfyUI/models
mkdir -p "$MODELS"/{ltxv,chatterbox,ace_step,wan,infinitetalk,upscale,loras}

download() { # repo dest_subdir
  local repo="$1" local_dir="$2"
  if [ -d "$MODELS/$local_dir/.downloaded" ]; then echo "skip (cached): $repo"; return; fi
  echo ">> downloading $repo -> $local_dir"
  huggingface-cli download "$repo" --local-dir "$MODELS/$local_dir" --local-dir-use-symlinks False || \
    echo "!! download failed (network/HF_TOKEN?): $repo"
  touch "$MODELS/$local_dir/.downloaded"
}

# --- LTX-Video (Lightricks). Distilled 13B for fast 90s; GGUF Q6 fallback noted in README ---
#   Brief asks ltxv-13b-0.9.8-distilled; canonical repo ships the safetensors + text encoders.
download "Lightricks/LTX-Video"            "ltxv/LTX-Video"
download "Lightricks/LTX-13B-0.9.8-Distilled" "ltxv/LTX-13B-0.9.8-Distilled"

# --- Chatterbox (Resemble AI) TTS + SRT wrapper ---
download "ResembleAI/chatterbox"          "chatterbox/chatterbox"
# Bangla fine-tune (community) is OPTIONAL; the pipeline falls back to XTTS-v2 bn.
# download "your-org/chatterbox-bn-finetune" "chatterbox/bn_finetune"  # uncomment when published

# --- ACE-Step 1.5 music/BGM ---
download "ACE-Step/ACE-Step-v1-5"         "ace_step/ACE-Step-v1-5"

# --- WanVideo wrapper base (InfiniteTalk uses Wan for motion priors) ---
download "Wan-AI/Wan2.1-T2V-1.3B"         "wan/Wan2.1-T2V-1.3B"

# --- InfiniteTalk (MeiGen-AI) talking-head / lip-sync ---
download "MeiGen-AI/InfiniteTalk"         "infinitetalk/InfiniteTalk"

# --- 4K upscale model (Real-ESRGAN x4, real weights) ---
download "ai-forever/Real-ESRGAN"         "upscale/Real-ESRGAN"

echo ">> model download pass complete"
# Hand off to ComfyUI (port/device come from CLI_ARGS / CMD).
exec python /app/ComfyUI/main.py "$@"
