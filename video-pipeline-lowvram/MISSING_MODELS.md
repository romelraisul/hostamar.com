# MISSING_MODELS.md — Hostamar LowVRAM ComfyUI weights

Smoke test currently `PASS=0 FAIL=4`. Root cause is **missing model weights**,
NOT a code bug. The container, bind mount, 5 custom nodes, and ComfyUI API 0.27.0
are all GREEN. You must download the weights with YOUR HuggingFace token — the
agent does NOT run these (would need your HF creds).

## Present on the WSL bind (verified 2026-07-14)
- checkpoints/ltx-2.3-22b-dev.safetensors (43G)
- text_encoders/umt5-xxl-enc-bf16.safetensors (11G)  [partial]
- vae/ (3 files), diffusion_models/ (1), loras/ (4), latent_upscale_models/ (2)

## MISSING (10 weights) — empty dirs confirmed
- text_encoders/gemma-3-12b-it-qat-q4_0-unquantized  (incomplete: only .lock stubs)
- vae/wan2.1_vae.safetensors
- clip_vision/clip_vision_h.safetensors
- wav2vec2  (audio encoder for InfiniteTalk/ChatterBox)
- MelBandRoformer  (vocal separator)
- unet/Wan2.1-i2v-14B-Q8_0.gguf
- unet/InfiniteTalk_Q8.gguf
- loras/lightx2v
- upscale/ltx-2.3-spatial-upscaler
- text_encoders/umt5-xxl-enc-bf16  (complete the bf16 download)

## Download (run from WSL, targeting the bind — ComfyUI reads these paths)
```bash
cd /home/romel/hostamar-build/video-pipeline-lowvram
# Authenticate once (YOUR token — paste it yourself, agent never sees it):
huggingface-cli login
# or: export HF_TOKEN=hf_xxx

# LTX-2.3 text encoder (gemma) — the one the smoke test is currently failing on:
huggingface-cli download casperkat/gemma-3-12b-it-qat-q4_0-unquantized \
  --local-dir models/text_encoders/gemma-3-12b-it-qat-q4_0-unquantized

# Wan2.1 VAE + I2V unet
huggingface-cli download Wan-AI/Wan2.1-VACE-14B \
  --include "vae/wan2.1_vae.safetensors" --local-dir models
huggingface-cli download Wan-AI/Wan2.1-I2V-14B-720P \
  --include "unet/Wan2.1-i2v-14B-Q8_0.gguf" --local-dir models

# InfiniteTalk
huggingface-cli download <infinitetalk-repo> \
  --include "unet/InfiniteTalk_Q8.gguf" "clip_vision/clip_vision_h.safetensors" \
  --local-dir models

# ChatterBox / wav2vec2 / MelBandRoformer (audio)
huggingface-cli download ResembleAI/chatterbox \
  --include "wav2vec2/*" "MelBandRoformer/*" --local-dir models

# LTX spatial upscaler + lightx2v lora
huggingface-cli download <ltx-upscaler-repo> \
  --include "upscale/ltx-2.3-spatial-upscaler/*" --local-dir models
huggingface-cli download <lightx2v-repo> \
  --include "loras/lightx2v/*" --local-dir models

# Complete umt5 bf16
huggingface-cli download casperkat/umt5-xxl-enc-bf16 \
  --local-dir models/text_encoders/umt5-xxl-enc-bf16
```

## After download: restart container + re-run smoke
```bash
docker restart hostamar-comfyui-lowvram
./video-pipeline-lowvram/smoke-test-8gb.sh   # target PASS=4
```
Do NOT report PASS=4 until the smoke script actually prints it — partial
downloads make the gemma validation error persist.
