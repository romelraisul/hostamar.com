#!/usr/bin/env bash
# install-resume.sh — robust per-file downloader (resume + retry, no Xet stall).
# Run with your HF token in ~/.huggingface/token (or HF_TOKEN env).
set -uo pipefail

export PATH="$HOME/.local/bin:$PATH"
export HF_XET_HIGH_PERFORMANCE=0          # force plain HTTPS transfer (Xet was stalling)
export HF_HUB_DISABLE_PROGRESS_BARS=1
export HF_TOKEN="${HF_TOKEN:-$(cat ~/.huggingface/token 2>/dev/null)}"
if [ -z "${HF_TOKEN:-}" ]; then echo "FAIL: no HF_TOKEN"; exit 1; fi

HERE="$(cd "$(dirname "$0")" && pwd)"
MODELS="$HERE/models"
mkdir -p "$MODELS"/{unet,loras,vae,text_encoders,clip,diffusion_models,upscale_models,MelBandRoFormer,TTS/chatterbox,wav2vec2}
LOG="$HERE/install-resume.log"
: > "$LOG"

# fetch repo/file -> local_rel  (resumes via hf's own cache; retries up to 4x)
fetch() {
  local repo="$1" file="$2" local="$MODELS/$3" min="$4"
  if [ -s "$local" ]; then
    local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
    if [ "$sz" -ge "$min" ]; then echo "skip (ok): $local" | tee -a "$LOG"; return; fi
    echo "WARN: $local present but too small ($sz<$min) — re-fetching" | tee -a "$LOG"
  fi
  echo ">> $repo/$file -> $local" | tee -a "$LOG"
  mkdir -p "$(dirname "$local")"
  local i rc=1
  for i in 1 2 3 4; do
    if hf download "$repo" "$file" --local-dir "$(dirname "$local")" --local-dir-use-symlinks False >>"$LOG" 2>&1; then
      rc=0; break
    fi
    echo "  attempt $i failed, retry $((i+1))..." | tee -a "$LOG"; sleep 5
  done
  if [ $rc -ne 0 ]; then echo "FAIL: $repo/$file after 4 attempts" | tee -a "$LOG"; return 1; fi
  local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
  if [ "$sz" -lt "$min" ]; then echo "FAIL: $local too small ($sz<$min)" | tee -a "$LOG"; return 1; fi
  echo "  ok: $(numfmt --to=iec $sz)" | tee -a "$LOG"
}

# whole-repo (small) -> local_rel
fetch_dir() {
  local repo="$1" local="$MODELS/$2"
  if [ -d "$local" ] && [ -n "$(find "$local" -maxdepth 2 -type f 2>/dev/null | head -1)" ]; then
    echo "skip (ok): $local" | tee -a "$LOG"; return
  fi
  local i rc=1
  for i in 1 2 3 4; do
    if hf download "$repo" --local-dir "$local" --local-dir-use-symlinks False >>"$LOG" 2>&1; then rc=0; break; fi
    echo "  attempt $i failed, retry $((i+1))..." | tee -a "$LOG"; sleep 5
  done
  [ $rc -eq 0 ] && echo "  ok: $(find "$local" -type f 2>/dev/null | wc -l) files" | tee -a "$LOG" \
                 || echo "FAIL: $repo" | tee -a "$LOG"
}

echo "=== install-resume start $(date -u) ===" | tee -a "$LOG"

# Wan 2.1 I2V 14B Q8 GGUF (8GB, biggest — the one that stalled)
fetch "city96/Wan2.1-I2V-14B-720P-gguf" "wan2.1-i2v-14b-720p-Q8_0.gguf" "unet/wan2.1-i2v-14b-720p-Q8_0.gguf" 8000000000
# InfiniteTalk single fp8
fetch "MeiGen-AI/InfiniteTalk" "quant_models/infinitetalk_single_fp8.safetensors" "diffusion_models/infinitetalk_single_fp8.safetensors" 1000000000
# Wan VAE
fetch "Kijai/WanVideo_comfy" "Wan2_1_VAE_bf16.safetensors" "vae/Wan2_1_VAE_bf16.safetensors" 100000000
# clip_vision_h
fetch "Comfy-Org/Wan_2.1_ComfyUI_repackaged" "split_files/clip_vision/clip_vision_h.safetensors" "clip/clip_vision_h.safetensors" 100000000
# wav2vec2 (whole small repo)
fetch_dir "Kijai/wav2vec2_safetensors" "wav2vec2"
# LTX spatial upscaler
fetch "Lightricks/LTX-Video" "ltxv-spatial-upscaler-0.9.8.safetensors" "upscale_models/ltxv-spatial-upscaler-0.9.8.safetensors" 900000000
# lightx2v I2V distill LoRA
fetch "lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v" "loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" "loras/lightx2v/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" 500000000
# MelBandRoformer (correct repo)
fetch "Kijai/MelBandRoFormer_comfy" "MelBandRoformer_fp16.safetensors" "MelBandRoFormer/MelBandRoformer_fp16.safetensors" 400000000

echo "=== install-resume done $(date -u) ===" | tee -a "$LOG"
