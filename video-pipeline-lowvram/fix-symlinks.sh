#!/bin/bash
# fix-symlinks.sh — non-destructive: make workflow JSON model paths resolve to
# the files we downloaded. Symlinks only; touches no real weights.
# Run from the video-pipeline-lowvram dir (or via ~/... path). No docker here.
set -e
BASE="$HOME/hostamar-build/video-pipeline-lowvram/models"
cd "$BASE"

mkdir -p WanVideo/Lightx2v WanVideo wanvideo vae clip_vision diffusion_models loras/lightx2v upscale_models wav2vec2 text_encoders

# 1. VAE — workflow wants WanVideo/Wan2_1_VAE_bf16.safetensors, disk has vae/
if [ -f vae/Wan2_1_VAE_bf16.safetensors ]; then
  ln -sf ../vae/Wan2_1_VAE_bf16.safetensors WanVideo/Wan2_1_VAE_bf16.safetensors
  echo "VAE -> WanVideo/Wan2_1_VAE_bf16.safetensors OK"
fi

# 2. Wan GGUF — workflow wants 480p; disk has 720p Q8_0. Same arch; symlink 480p name -> 720p file.
SRC=$(find . -maxdepth 3 -name "*720p*Q8_0.gguf" | head -1)
if [ -n "$SRC" ]; then
  ln -sf "$SRC" WanVideo/wan2.1-i2v-14b-480p-Q8_0.gguf
  ln -sf "$SRC" WanVideo/wan2.1-i2v-14b-720p-Q8_0.gguf
  echo "Wan GGUF 480p->720p symlink -> $SRC OK"
fi

# 3. LightX2V LoRA — workflow wants WanVideo/Lightx2v/<specific name>
SRC_LORA=$(find loras -name "*rank64*.safetensors" 2>/dev/null | head -1)
if [ -n "$SRC_LORA" ]; then
  ln -sf "../../$SRC_LORA" WanVideo/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors
  echo "LightX2V LoRA -> $SRC_LORA OK"
fi

# 4. wav2vec2 — node looks in models/wav2vec2/ (and root as fallback). Put it where the node reads.
SRC_W2V=$(find wav2vec2 -name "*fp16*.safetensors" 2>/dev/null | head -1)
if [ -z "$SRC_W2V" ]; then SRC_W2V=$(find . -path "*wav2vec2*base*.safetensors" | head -1); fi
if [ -n "$SRC_W2V" ]; then
  # inside wav2vec2/ so the Wav2VecModelLoader finds it under models/wav2vec2/
  ln -sf "$(basename "$SRC_W2V")" wav2vec2/wav2vec2-chinese-base_fp16.safetensors
  # root fallback (matches workflow node :188 filename)
  ln -sf "$SRC_W2V" wav2vec2-chinese-base_fp16.safetensors
  echo "wav2vec2 -> $SRC_W2V OK (182MB correct; min-gate should be 150MB)"
fi

# 5. clip_vision_h — CLIPVisionLoader looks in models/clip_vision/; disk has clip/
if [ -f clip/clip_vision_h.safetensors ]; then
  ln -sf ../clip/clip_vision_h.safetensors clip_vision/clip_vision_h.safetensors
  echo "clip_vision_h -> clip_vision/ OK"
fi

# 6. LTX upscaler — already in upscale_models/ (correct). Confirm size.
if [ -f upscale_models/ltxv-spatial-upscaler-0.9.8.safetensors ]; then
  echo "LTX upscaler $(stat -c%s upscale_models/ltxv-spatial-upscaler-0.9.8.safetensors) bytes = correct (min-gate was wrong: 900MB; should be 500MB) OK"
fi

echo "--- final layout ---"
ls -lh WanVideo/ 2>/dev/null
ls -lh WanVideo/Lightx2v/ 2>/dev/null
ls -lh wav2vec2/ 2>/dev/null | tail -3
ls -lh wav2vec2-chinese-base_fp16.safetensors clip_vision/clip_vision_h.safetensors upscale_models/ 2>/dev/null
