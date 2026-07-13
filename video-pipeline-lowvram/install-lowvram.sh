#!/usr/bin/env bash
# =============================================================================
# install-lowvram.sh — download the LTX-2.3 / Wan / InfiniteTalk / Chatterbox
# weights into ./models.
#
# NOTE: bake alignment decision (2026-07-14). The container's ComfyUI-LTXVideo
# node pack is LTX v2.3 and expects the 22B `ltx-2.3-22b-dev` model + Gemma-12B
# text encoder + distilled LoRA + spatial/temporal upscalers. The older 2B v0.9.1
# GGUF does NOT load in this node pack (no LTXVModelLoaderGGUF registered).
# User accepted the larger download and dropped the strict 8GB target.
#
# Requires: hf (from huggingface_hub[cli]), git, curl.
# Set HF_TOKEN for gated repos:  export HF_TOKEN=...
# Transfer:  export HF_XET_HIGH_PERFORMANCE=0   (standard; high-perf stalls here)
# =============================================================================
set -euo pipefail

if ! command -v hf >/dev/null 2>&1 && command -v huggingface-cli >/dev/null 2>&1; then
  hf() { huggingface-cli "$@"; }
elif ! command -v hf >/dev/null 2>&1; then
  echo "FAIL: 'hf' (huggingface_hub CLI) not found. Install: uv tool install 'huggingface_hub[cli]'"; exit 1
fi
export HF_XET_HIGH_PERFORMANCE="${HF_XET_HIGH_PERFORMANCE:-0}"   # standard transfer (Xet high-perf stalls on some networks)

HERE="$(cd "$(dirname "$0")" && pwd)"
MODELS="$HERE/models"
mkdir -p "$MODELS"/{unet,loras,vae,text_encoders,clip,diffusion_models,checkpoints,latent_upscale_models}

dl() { # repo  filename  local_rel  min_bytes   (local_rel is path relative to MODELS)
  local repo="$1" fname="$2" local="$MODELS/$3" min="$4"
  if [ -s "$local" ]; then echo "skip (exists): $local"; return; fi
  echo ">> $repo/$fname -> $local"
  mkdir -p "$(dirname "$local")"
  if ! hf download "$repo" "$fname" "--local-dir=$(dirname "$local")"; then
    echo "FAIL: hf download failed for $repo/$fname (gated? set HF_TOKEN. private? check perms)"; exit 1
  fi
  # if hf dropped the file under a nested repo dir, flatten the single target we want
  if [ ! -s "$local" ]; then
    local found; found=$(find "$(dirname "$local")" -maxdepth 4 \( -name "*.gguf" -o -name "*.safetensors" \) 2>/dev/null | head -1)
    [ -n "$found" ] && mv -f "$found" "$local"
  fi
  local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
  if [ "$sz" -lt "$min" ]; then echo "FAIL: $local too small ($sz < $min) — download truncated"; exit 1; fi
  echo "   ok: $(numfmt --to=iec $sz)"
}

dl_dir() { # repo  local_rel   (whole repo into MODELS/local_rel)
  local repo="$1" local="$MODELS/$2"
  if [ -d "$local" ] && [ -n "$(find "$local" -type f 2>/dev/null | head -1)" ]; then
    echo "skip (exists): $local"; return
  fi
  echo ">> $repo (whole repo) -> $local"
  mkdir -p "$local"
  if ! hf download "$repo" "--local-dir=$local"; then
    echo "FAIL: hf download failed for $repo (gated? set HF_TOKEN)"; exit 1
  fi
  echo "   ok: $(find "$local" -type f 2>/dev/null | wc -l) file(s)"
}

# ---------------------------------------------------------------------------
# LTX-2.3 (22B) — from container ComfyUI-LTXVideo README (authoritative)
# CheckpointLoaderSimple reads models/checkpoints/. The 22B dev checkpoint also
# contains the audio VAE (LTXVAudioVAELoader uses the same ckpt_name).
# ---------------------------------------------------------------------------
dl "Lightricks/LTX-2.3" "ltx-2.3-22b-dev.safetensors" "checkpoints/ltx-2.3-22b-dev.safetensors" 40000000000
# Distilled LoRA for the two-stage distilled pipeline (HardcoreTwoStage example)
dl "Lightricks/LTX-2.3" "ltx-2.3-22b-distilled-lora-384-1.1.safetensors" "loras/ltx-2.3-22b-distilled-lora-384-1.1.safetensors" 400000000
# Spatial + temporal upscalers (two-stage pipeline)
dl "Lightricks/LTX-2.3" "ltx-2.3-spatial-upscaler-x2-1.1.safetensors" "latent_upscale_models/ltx-2.3-spatial-upscaler-x2-1.1.safetensors" 1000000000
dl "Lightricks/LTX-2.3" "ltx-2.3-temporal-upscaler-x2-1.0.safetensors" "latent_upscale_models/ltx-2.3-temporal-upscaler-x2-1.0.safetensors" 1000000000
# Gemma-3-12B text encoder (whole repo, many files)
dl_dir "google/gemma-3-12b-it-qat-q4_0-unquantized" "text_encoders/gemma-3-12b-it-qat-q4_0-unquantized"

# ---------------------------------------------------------------------------
# Wan 2.1 I2V 14B Q4_0 GGUF for InfiniteTalk (Test C/D)
# ---------------------------------------------------------------------------
dl "Kijai/Wan2.1_i2v_480p_14B_FusionX-Q4_0-GGUF" "wan2.1_i2v_480p_14B_Q4_0.gguf" "diffusion_models/wan2.1_i2v_480p_14B_Q4_0.gguf" 8000000000

# InfiniteTalk single fp16 patch
dl "xuhongming251/InfiniteTalk" "wan2.1_infiniteTalk_single_fp16.safetensors" "loras/wan2.1_infiniteTalk_single_fp16.safetensors" 1000000000

# Wan VAE + UMT5 text encoder (small, required)
dl "Comfy-Org/Wan_2.1_Repackaged" "vae/wan_2.1_vae.safetensors" "vae/wan_2.1_vae.safetensors" 100000000
dl "Comfy-Org/Wan_2.1_Repackaged" "text_encoders/umt5_xxl_fp16.safetensors" "text_encoders/umt5_xxl_fp16.safetensors" 1000000000

# ---------------------------------------------------------------------------
# Chatterbox TTS (ResembleAI) for Test B
# ---------------------------------------------------------------------------
echo "Downloading Chatterbox TTS..."
mkdir -p "$MODELS/TTS/chatterbox"
if [ -d "$MODELS/TTS/chatterbox" ] && [ -n "$(find "$MODELS/TTS/chatterbox" -type f 2>/dev/null | head -1)" ]; then
  echo "skip (exists): $MODELS/TTS/chatterbox"
else
  hf download ResembleAI/chatterbox --local-dir "$MODELS/TTS/chatterbox" ||
    { echo "FAIL: Chatterbox hf download failed"; exit 1; }
fi
cb_files=$(find "$MODELS/TTS/chatterbox" -type f 2>/dev/null | wc -l)
if [ "$cb_files" -lt 1 ]; then echo "FAIL: Chatterbox download produced no files"; exit 1; fi
echo "   ok: $cb_files file(s) in models/TTS/chatterbox"

echo "=== install done. Run: docker run ... hostamar-comfyui-lowvram:blackwell ==="
