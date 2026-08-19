#!/usr/bin/env bash
# install-curl.sh — bulletproof downloader via HF CDN (curl -C - resume + retry).
# Avoids hf/Xet stalls + .lock fragility. Token from env or ~/.huggingface/token.
set -uo pipefail

export PATH="$HOME/.local/bin:$PATH"
HF_TOKEN="${HF_TOKEN:-$(cat ~/.huggingface/token 2>/dev/null)}"
[ -z "${HF_TOKEN:-}" ] && { echo "FAIL: no HF_TOKEN"; exit 1; }

HERE="$(cd "$(dirname "$0")" && pwd)"
MODELS="$HERE/models"
mkdir -p "$MODELS"/{unet,loras,vae,text_encoders,clip,diffusion_models,upscale_models,MelBandRoFormer,TTS/chatterbox,wav2vec2}
LOG="$HERE/install-curl.log"
: > "$LOG"

# fetch repo/file -> local_rel  min_bytes  (uses CDN resolve URL + curl resume)
fetch() {
  local repo="$1" file="$2" local="$MODELS/$3" min="$4"
  if [ -s "$local" ]; then
    local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
    if [ "$sz" -ge "$min" ]; then echo "skip (ok): $local" | tee -a "$LOG"; return; fi
  fi
  mkdir -p "$(dirname "$local")"
  local url="https://huggingface.co/$repo/resolve/main/$file"
  echo ">> $repo/$file -> $local" | tee -a "$LOG"
  local i
  for i in 1 2 3 4 5; do
    if curl -sL -C - --retry 3 --retry-delay 5 --connect-timeout 30 --max-time 3600 \
         -H "Authorization: Bearer $HF_TOKEN" -o "$local" "$url" 2>>"$LOG"; then
      local sz; sz=$(stat -c%s "$local" 2>/dev/null || echo 0)
      if [ "$sz" -ge "$min" ]; then echo "  ok: $(numfmt --to=iec $sz)" | tee -a "$LOG"; return; fi
      echo "  attempt $i: got $sz bytes (< $min), retrying" | tee -a "$LOG"
    else
      echo "  attempt $i: curl failed, retrying" | tee -a "$LOG"
    fi
    sleep 4
  done
  echo "FAIL: $repo/$file after retries (see $LOG)" | tee -a "$LOG"
}

# whole-repo small dir -> local_rel
fetch_dir() {
  local repo="$1" local="$MODELS/$2"
  if [ -d "$local" ] && [ -n "$(find "$local" -maxdepth 2 -type f 2>/dev/null | head -1)" ]; then
    echo "skip (ok): $local" | tee -a "$LOG"; return
  fi
  mkdir -p "$local"
  echo ">> $repo (whole repo) -> $local" | tee -a "$LOG"
  local i
  for i in 1 2 3 4; do
    if GIT_LFS_SKIP_SMUDGE=0 git clone --depth 1 "https://$HF_TOKEN:@huggingface.co/$repo" "$local.tmp" >>"$LOG" 2>&1; then
      mv -f "$local.tmp"/* "$local"/ 2>/dev/null; rmdir "$local.tmp" 2>/dev/null
      echo "  ok: $(find "$local" -type f 2>/dev/null | wc -l) files" | tee -a "$LOG"; return
    fi
    echo "  attempt $i: git clone failed, retrying" | tee -a "$LOG"; rm -rf "$local.tmp"; sleep 4
  done
  echo "FAIL: $repo clone" | tee -a "$LOG"
}

echo "=== install-curl start $(date -u) ===" | tee -a "$LOG"
fetch "city96/Wan2.1-I2V-14B-720P-gguf" "wan2.1-i2v-14b-720p-Q8_0.gguf" "unet/wan2.1-i2v-14b-720p-Q8_0.gguf" 8000000000
fetch "MeiGen-AI/InfiniteTalk" "quant_models/infinitetalk_single_fp8.safetensors" "diffusion_models/infinitetalk_single_fp8.safetensors" 1000000000
fetch "Kijai/WanVideo_comfy" "Wan2_1_VAE_bf16.safetensors" "vae/Wan2_1_VAE_bf16.safetensors" 100000000
fetch "Comfy-Org/Wan_2.1_ComfyUI_repackaged" "split_files/clip_vision/clip_vision_h.safetensors" "clip/clip_vision_h.safetensors" 100000000
fetch_dir "Kijai/wav2vec2_safetensors" "wav2vec2"
fetch "Lightricks/LTX-Video" "ltxv-spatial-upscaler-0.9.8.safetensors" "upscale_models/ltxv-spatial-upscaler-0.9.8.safetensors" 500000000
fetch "lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v" "loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" "loras/lightx2v/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors" 500000000
fetch "Kijai/MelBandRoFormer_comfy" "MelBandRoformer_fp16.safetensors" "MelBandRoFormer/MelBandRoformer_fp16.safetensors" 400000000
echo "=== install-curl done $(date -u) ===" | tee -a "$LOG"
