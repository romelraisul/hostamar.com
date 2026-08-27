// Shared ComfyUI video workflow builders.
// Wan2.1-T2V-1.3B uses WanVideoWrapper nodes.
// HunyuanVideo 1.5 uses native safetensors model with HyVideoModelLoader + DownloadAndLoadHyVideoTextEncoder (auto-downloads from HF).

export interface WanWorkflowOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numFrames?: number
  steps?: number
  cfg?: number
  seed?: number
  filenamePrefix?: string
}

export interface HunyuanWorkflowOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numFrames?: number
  steps?: number
  cfg?: number
  seed?: number
  filenamePrefix?: string
}

export function buildWanT2VWorkflow(opts: WanWorkflowOptions): any {
  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted, watermark, text overlay, static, ugly, deformed',
    width = 832,
    height = 480,
    numFrames = 49,
    steps = 30,
    cfg = 7,
    seed = Math.floor(Math.random() * 2147483647),
    filenamePrefix = `hostamar_${Date.now()}`,
  } = opts

  return {
    prompt: {
      // 1. Load T5 Text Encoder
      '1': {
        class_type: 'LoadWanVideoT5TextEncoder',
        inputs: {
          model_name: 't5xxl_fp8_e4m3fn.safetensors',
          precision: 'bf16',
          load_device: 'offload_device',
          quantization: 'disabled',
        },
      },
      // 2. Load VAE
      '2': {
        class_type: 'WanVideoVAELoader',
        inputs: { model_name: 'Wan2.1_VAE.pth', precision: 'bf16' },
      },
      // 3. Load Model (Wan2.1-T2V-1.3B)
      '3': {
        class_type: 'WanVideoModelLoader',
        inputs: {
          model: 'Wan2.1-T2V-1.3B_diffusion.safetensors',
          base_precision: 'bf16',
          quantization: 'disabled',
          load_device: 'offload_device',
          attention_mode: 'sdpa',
        },
      },
      // 4. Encode positive prompt with T5
      '4': {
        class_type: 'WanVideoTextEncode',
        inputs: {
          t5: ['1', 0],
          model_to_offload: ['3', 0],
          positive_prompt: prompt,
          negative_prompt: negativePrompt,
          force_offload: true,
          offload_device: 'gpu',
        },
      },
      // 5. Empty latent video
      '5': {
        class_type: 'WanVideoEmptyEmbeds',
        inputs: { width, height, num_frames: numFrames },
      },
      // 6. Sampler
      '6': {
        class_type: 'WanVideoSampler',
        inputs: {
          seed,
          steps,
          cfg,
          shift: 5,
          sampler_name: 'unipc',
          scheduler: 'unipc',
          force_offload: true,
          model: ['3', 0],
          text_embeds: ['4', 0],
          image_embeds: ['5', 0],
          riflex_freq_index: 0,
        },
      },
      // 7. Decode with VAE
      '7': {
        class_type: 'WanVideoDecode',
        inputs: {
          vae: ['2', 0],
          samples: ['6', 0],
          enable_vae_tiling: true,
          tile_x: 272,
          tile_y: 272,
          tile_stride_x: 144,
          tile_stride_y: 128,
        },
      },
      // 8. Save video
      '8': {
        class_type: 'SaveWEBM',
        inputs: {
          images: ['7', 0],
          filename_prefix: filenamePrefix,
          codec: 'vp9',
          fps: 24,
          crf: 19,
        },
      },
    },
  }
}

export function buildHunyuanT2VWorkflow(opts: HunyuanWorkflowOptions): any {
  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted, watermark, text overlay, static, ugly, deformed, jittery motion',
    width = 384,
    height = 216,
    numFrames = 85,
    steps = 30,
    cfg = 6,
    seed = Math.floor(Math.random() * 2147483647),
    filenamePrefix = `hostamar_${Date.now()}`,
  } = opts

  // Native safetensors model file on disk (Windows backslash path as expected by ComfyUI node).
    // '\\' in TS source = 1 backslash at runtime = '\\' in JSON wire = 1 backslash after JSON decode.
  const modelFile = ['split_files', 'diffusion_models', 'hunyuan_video_720_fp8_e4m3fn.safetensors'].join(String.fromCharCode(92))

  return {
    prompt: {
      // 1. Load model via HunyuanVideo native loader. fp8 quantization + block-swap fits 8GB VRAM.
      '1': {
        class_type: 'HyVideoModelLoader',
        inputs: {
          model: modelFile,
          base_precision: 'bf16',
          quantization: 'fp8_e4m3fn',
          load_device: 'offload_device',
          attention_mode: 'sdpa',
          block_swap_args: ['9', 0],
        },
      },
      // 9. Block-swapping to keep peak VRAM under 8GB: stream transformer blocks to CPU.
      '9': {
        class_type: 'HyVideoBlockSwap',
        inputs: {
          double_blocks_to_swap: 20,
          single_blocks_to_swap: 40,
          offload_txt_in: true,
          offload_img_in: true,
        },
      },
      // 2. Load Hunyuan text encoder. fp8 to save RAM. The node resolves llm_model to models/LLM/<name>.
      '2': {
        class_type: 'DownloadAndLoadHyVideoTextEncoder',
        inputs: {
          llm_model: 'Kijai/llava-llama-3-8b-text-encoder-tokenizer',
          clip_model: 'openai/clip-vit-large-patch14',
          precision: 'bf16',
          apply_final_norm: false,
          hidden_state_skip_layer: 2,
          quantization: 'disabled',
          load_device: 'offload_device',
        },
      },
      // 3. Load VAE via wrapper's loader (HyVideoDecode expects this format, not comfy-core VAELoader).
      '3': {
        class_type: 'HyVideoVAELoader',
        inputs: { model_name: 'hunyuan_video_vae_bf16.safetensors', precision: 'fp16' },
      },
      // 4. Encode positive + negative prompt.
      '4': {
        class_type: 'HyVideoTextEncode',
        inputs: {
          text_encoders: ['2', 0],
          prompt: prompt,
          prompt_template: 'video',
          force_offload: true,
        },
      },
      // 6. Sampler (HyVideoSampler) — builds its own latent from width/height/num_frames
      //    (matches the official t2v example; using a separate EmptyHunyuanLatentVideo
      //     causes a 1-frame latent/embed length mismatch).
      '6': {
        class_type: 'HyVideoSampler',
        inputs: {
          model: ['1', 0],
          hyvid_embeds: ['4', 0],
          width,
          height,
          num_frames: numFrames,
          steps,
          embedded_guidance_scale: cfg,
          flow_shift: 9.0,
          seed,
          force_offload: true,
          scheduler: 'FlowMatchDiscreteScheduler',
          riflex_freq_index: 0,
        },
      },
      // 7. Decode with tiling for 8GB VRAM.
      '7': {
        class_type: 'HyVideoDecode',
        inputs: {
          vae: ['3', 0],
          samples: ['6', 0],
          enable_vae_tiling: true,
          temporal_tiling_sample_size: 64,
          spatial_tile_sample_min_size: 256,
          auto_tile_size: true,
          force_offload: true,
        },
      },
      // 8. Save video using VHS_VideoCombine.
      '8': {
        class_type: 'VHS_VideoCombine',
        inputs: {
          images: ['7', 0],
          frame_rate: 24,
          filename_prefix: filenamePrefix,
          format: 'video/h264-mp4',
          pix_fmt: 'yuv420p',
          crf: 19,
          loop_count: 0,
          save_metadata: true,
          pingpong: false,
          save_output: true,
        },
      },
    },
  }
}

// Script-to-video uses the same Hunyuan native workflow but with detailed prompt
export function buildHunyuanScriptWorkflow(opts: HunyuanWorkflowOptions): any {
  return buildHunyuanT2VWorkflow({
    ...opts,
    negativePrompt: 'blurry, low quality, distorted, watermark, text overlay, static, ugly, deformed, jittery motion, bad anatomy, extra limbs, missing limbs, floating objects, disconnected elements, flickering, inconsistent lighting, color bleeding',
    filenamePrefix: opts.filenamePrefix || `hostamar_script_${Date.now()}`,
    // 30 seconds at 24fps = 720 frames, but Hunyuan works in 4-frame chunks
    // 30s * 24fps = 720 frames, but we use 49 frames for 5s chunks
    // For 30s we'd need multiple generations, so let's do 5s (49 frames) as a segment
    numFrames: opts.numFrames || 49,
  })
}