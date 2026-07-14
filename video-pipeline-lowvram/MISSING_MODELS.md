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
# Repo IDs + filenames VERIFIED against the live HF API on 2026-07-15 (HTTP 200
# unless noted "gated" = needs licence accept on the model page first).
```bash
cd /home/romel/hostamar-build/video-pipeline-lowvram
# Authenticate once (YOUR token — paste it yourself, agent never sees it):
huggingface-cli login          # or: export HF_TOKEN=hf_xxx

# 1) gemma text encoder — the weight the smoke test currently fails on.
#    GATED: open https://huggingface.co/google/gemma-3-12b-it-qat-q4_0-unquantized
#    and click "Agree" once, else you get 401.
huggingface-cli download google/gemma-3-12b-it-qat-q4_0-unquantized \
  --local-dir models/text_encoders/gemma-3-12b-it-qat-q4_0-unquantized

# 2) Wan2.1 VAE (Kijai comfy repo has the ComfyUI-ready file)
huggingface-cli download Kijai/WanVideo_comfy Wan2_1_VAE_bf16.safetensors \
  --local-dir models/vae

# 3) Wan2.1 I2V 14B Q8 GGUF (city96 quantized)
huggingface-cli download city96/Wan2.1-I2V-14B-720P-gguf wan2.1-i2v-14b-720p-Q8_0.gguf \
  --local-dir models/unet

# 4) clip_vision_h (Comfy-Org repackaged — exact path split_files/...)
huggingface-cli download Comfy-Org/Wan_2.1_ComfyUI_repackaged \
  split_files/clip_vision/clip_vision_h.safetensors --local-dir models/clip_vision_tmp
mv models/clip_vision_tmp/split_files/clip_vision/clip_vision_h.safetensors models/clip_vision/
rm -rf models/clip_vision_tmp

# 5) InfiniteTalk (fp8 quant = low-VRAM friendly; "single" for one-speaker avatar)
huggingface-cli download MeiGen-AI/InfiniteTalk \
  quant_models/infinitetalk_single_fp8.safetensors quant_models/infinitetalk_single_fp8.json \
  --local-dir models/diffusion_models

# 6) wav2vec2 audio encoder for InfiniteTalk (Kijai safetensors build)
huggingface-cli download Kijai/wav2vec2_safetensors --local-dir models/wav2vec2

# 7) ChatterBox TTS (audio driver)
huggingface-cli download ResembleAI/chatterbox --local-dir models/chatterbox

# 8) MelBandRoformer vocal separator
#    GATED: accept licence at https://huggingface.co/KimberleyJensen/melband-roformer-vocal-fullness
huggingface-cli download KimberleyJensen/melband-roformer-vocal-fullness \
  --local-dir models/melband_roformer

# 9) LTX spatial upscaler (0.9.8 = latest in Lightricks/LTX-Video)
huggingface-cli download Lightricks/LTX-Video ltxv-spatial-upscaler-0.9.8.safetensors \
  --local-dir models/upscale_models

# 10) lightx2v I2V distill LoRA (rank64 = the ComfyUI lora file)
huggingface-cli download lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v \
  loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors \
  --local-dir models/loras

# (also complete umt5 bf16 if partial — Kijai comfy repo)
huggingface-cli download Kijai/WanVideo_comfy umt5-xxl-enc-bf16.safetensors \
  --local-dir models/text_encoders
```

> NOTE (ground-verified 2026-07-15): the old placeholder repos `<infinitetalk-repo>`,
> `<ltx-upscaler-repo>`, `<lightx2v-repo>` were fabricated and would 404. Also the
> original `casperkat/gemma-…` and `casperkat/umt5-…` returned 401/uncertain — replaced
> with `google/…` (canonical, gated) and `Kijai/WanVideo_comfy` (comfy-ready). ComfyUI
> node names may expect specific subdir/filename — if a workflow can't find a weight,
> check the loader node's expected path and rename/symlink accordingly.

## After download: restart container + re-run smoke
```bash
docker restart hostamar-comfyui-lowvram
./video-pipeline-lowvram/smoke-test-8gb.sh   # target PASS=4
```
Do NOT report PASS=4 until the smoke script actually prints it — partial
downloads make the gemma validation error persist.
