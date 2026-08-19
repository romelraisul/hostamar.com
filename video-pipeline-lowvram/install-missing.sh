#!/usr/bin/env bash
# install-missing.sh — fetch only the weights that didn't land (resume-safe).
set -uo pipefail
export PATH="$HOME/.local/bin:$PATH"
HF_TOKEN="${HF_TOKEN:-$(cat ~/.huggingface/token 2>/dev/null)}"
[ -z "${HF_TOKEN:-}" ] && { echo "FAIL: no HF_TOKEN"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"; MODELS="$HERE/models"
mkdir -p "$MODELS"/{vae,clip,upscale_models,loras/lightx2v,wav2vec2}
LOG="$HERE/install-missing.log"; : > "$LOG"

fetch() {
  local repo="$1" file="$2" local="$MODELS/$3" min="$4"
  if [ -s "$local" ]; then
    local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
    if [ "$sz" -ge "$min" ]; then echo "skip (ok): $local" | tee -a "$LOG"; return; fi
  fi
  mkdir -p "$(dirname "$local")"
  local url="https://huggingface.co/$repo/resolve/main/$file" i
  echo ">> $repo/$file -> $local" | tee -a "$LOG"
  for i in 1 2 3 4 5; do
    if curl -sL -C - --retry 4 --retry-delay 5 --connect-timeout 30 --max-time 5400 \
         -H "Authorization: Bearer $HF_TOKEN" -o "$local" "$url" 2>>"$LOG"; then
      local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
      if [ "$sz" -ge "$min" ]; then echo "  ok: $(numfmt --to=iec $sz)" | tee -a "$LOG"; return; fi
      echo "  attempt $i: $sz < $min, retry" | tee -a "$LOG"
    else echo "  attempt $i: curl fail, retry" | tee -a "$LOG"; fi
    sleep 4
  done
  echo "FAIL: $repo/$file" | tee -a "$LOG"
}

echo "=== install-missing start $(date -u) ===" | tee -a "$LOG"
fetch "Kijai/WanVideo_comfy" "Wan2_1_VAE_bf16.safetensors" "vae/Wan2_1_VAE_bf16.safetensors" 100000000
fetch "Comfy-Org/Wan_2.1_ComfyUI_repackaged" "split_files/clip_vision/clip_vision_h.safetensors" "clip/clip_vision_h.safetensors" 100000000
fetch "Lightricks/LTX-Video" "ltxv-spatial-upscaler-0.9.8.safetensors" "upscale_models/ltxv-spatial-upscaler-0.9.8.safetensors" 900000000
fetch "lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v" "loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" "loras/lightx2v/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" 500000000
fetch "Kijai/wav2vec2_safetensors" "wav2vec2-chinese-base_fp16.safetensors" "wav2vec2/wav2vec2-chinese-base_fp16.safetensors" 150000000
echo "=== install-missing done $(date -u) ===" | tee -a "$LOG"
