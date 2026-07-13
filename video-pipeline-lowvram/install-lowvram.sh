#!/usr/bin/env bash
# =============================================================================
# install-lowvram.sh — download the 8GB-friendly GGUF weights into ./models.
# Run on the LOCAL 8GB host (not in CI). Verifies file sizes so a truncated
# download fails loudly instead of OOM-ing ComfyUI later.
#
# Requires: huggingface-cli (pip install -U huggingface_hub), git, curl.
# Set HF_TOKEN for gated repos:  export HF_TOKEN=...
# =============================================================================
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MODELS="$HERE/models"
mkdir -p "$MODELS"/{unet,loras,vae,text_encoders,clip,diffusion_models}

dl() { # repo  subdir  local  min_bytes
  local repo="$1" sub="$2" local="$MODELS/$3" min="$4"
  if [ -s "$local" ]; then echo "skip (exists): $local"; return; fi
  echo ">> $repo -> $local"
  huggingface-cli download "$repo" --local-dir "$MODELS/_tmp_$repo" 2>/dev/null || \
  git clone --depth 1 "https://huggingface.co/$repo" "$MODELS/_tmp_$repo"
  find "$MODELS/_tmp_$repo" \( -name "*.gguf" -o -name "*.safetensors" \) -exec mv -t "$(dirname "$local")" {} +
  rm -rf "$MODELS/_tmp_$repo"
  local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
  if [ "$sz" -lt "$min" ]; then echo "FAIL: $local too small ($sz < $min) — download truncated"; exit 1; fi
  echo "   ok: $(numfmt --to=iec $sz)"
}

# --- LTX-Video 2B GGUF Q6 (fits 8GB via GGUF nodes) ---
dl "city96/LTX-Video-2B-gguf" unet "$MODELS/diffusion_models/ltxv-2b-distilled-Q6_K.gguf" 6000000000

# --- Wan 2.1 I2V 14B Q4_0 GGUF for InfiniteTalk (6GB min, fits 8GB w/ offload) ---
dl "Kijai/Wan2.1_i2v_480p_14B_FusionX-Q4_0-GGUF" unet "$MODELS/diffusion_models/wan2.1_i2v_480p_14B_Q4_0.gguf" 8000000000

# --- InfiniteTalk single fp16 patch ---
dl "xuhongming251/InfiniteTalk" . "$MODELS/loras/wan2.1_infiniteTalk_single_fp16.safetensors" 1000000000

# --- LTX VAE + Wan VAE + UMT5 text encoder (small, required) ---
dl "Lightricks/LTX-Video" vae "$MODELS/vae/ltxv_2b_vae.safetensors" 100000000
dl "Comfy-Org/Wan_2.1_Repackaged" vae "$MODELS/vae/wan_2.1_vae.safetensors" 100000000
dl "Comfy-Org/Wan_2.1_Repackaged" text_encoders "$MODELS/text_encoders/umt5_xxl_fp16.safetensors" 1000000000

echo "=== install-lowvram done. Run: docker compose -f docker-compose.lowvram.yml up ==="
