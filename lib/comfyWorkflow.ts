// Shared ComfyUI video workflow builders.
// Wan2.1-T2V-1.3B uses WanVideoWrapper nodes.
// HunyuanVideo 1.5 8B GGUF uses UnetLoaderGGUF + native Hunyuan nodes (requires ComfyUI-GGUF).

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
      '1': {
        class_type: 'WanVideoModelLoader',
        inputs: {
          model: 'Wan2.1-T2V-1.3B_diffusion.safetensors',
          base_precision: 'bf16',
          quantization: 'disabled',
          load_device: 'offload_device',
          attention_mode: 'sdpa',
        },
      },
      '2': {
        class_type: 'WanVideoVAELoader',
        inputs: { model_name: 'Wan2.1_VAE.pth', precision: 'bf16' },
      },
      '3': {
        class_type: 'WanVideoTextEncode',
        inputs: {
          wan_model: ['1', 0],
          force_offload: true,
          positive_prompt: prompt,
          negative_prompt: negativePrompt,
        },
      },
      '4': {
        class_type: 'WanVideoEmptyEmbeds',
        inputs: { width, height, num_frames: numFrames },
      },
      '5': {
        class_type: 'WanVideoSampler',
        inputs: {
          seed,
          steps,
          cfg,
          shift: 5,
          sampler_name: 'unipc',
          scheduler: 'unipc',
          force_offload: true,
          model: ['1', 0],
          text_embeds: ['3', 0],
          image_embeds: ['4', 0],
          riflex_freq_index: 0,
        },
      },
      '6': {
        class_type: 'WanVideoDecode',
        inputs: {
          vae: ['2', 0],
          samples: ['5', 0],
          enable_vae_tiling: true,
          tile_x: 272,
          tile_y: 272,
          tile_stride_x: 144,
          tile_stride_y: 128,
        },
      },
      '7': {
        class_type: 'SaveWEBM',
        inputs: {
          images: ['6', 0],
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
    negativePrompt = 'blurry, low quality, distorted, watermark, text overlay, static, ugly, deformed',
    width = 720,
    height = 720,
    numFrames = 49,
    steps = 30,
    cfg = 7,
    seed = Math.floor(Math.random() * 2147483647),
    filenamePrefix = `hostamar_${Date.now()}`,
  } = opts

  // GGUF model file on disk.
  const ggufModel = 'hunyuan-video-t2v-720p-Q4_K_S.gguf'

  return {
    prompt: {
      // 1. Load UNet via ComfyUI-GGUF loader.
      '1': {
        class_type: 'UnetLoaderGGUF',
        inputs: {
          gguf_name: ggufModel,
          unet_name: ggufModel,
        },
      },
      // 2. Load CLIP vision encoder for Hunyuan 1.5.
      '2': {
        class_type: 'DualCLIPLoader',
        inputs: {
          clip_name1: 'clip_l.safetensors',
          clip_name2: 'llava_llama3_vision.safetensors',
          type: 'hunyuan',
        },
      },
      // 3. Load VAE.
      '3': {
        class_type: 'VAELoader',
        inputs: { vae_name: 'hunyuan_video_vae_bf16.safetensors' },
      },
      // 4. Encode positive prompt.
      '4': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: prompt,
          clip: ['2', 0],
        },
      },
      // 5. Encode negative prompt.
      '5': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: negativePrompt,
          clip: ['2', 0],
        },
      },
      // 6. Empty latent video.
      '6': {
        class_type: 'EmptyHunyuanLatentVideo',
        inputs: { width, height, length: numFrames, batch_size: 1 },
      },
      // 7. Sampler.
      '7': {
        class_type: 'SamplerCustomAdvanced',
        inputs: {
          noise: ['6', 0],
          guider: [
            '8',
            0,
          ],
          sampler: [
            '9',
            0,
          ],
          sigmas: ['10', 0],
        },
      },
      // 8. Guider.
      '8': {
        class_type: 'CFGGuider',
        inputs: {
          model: ['1', 0],
          positive: ['4', 0],
          negative: ['5', 0],
          cfg: cfg,
        },
      },
      // 9. Sampler.
      '9': {
        class_type: 'KSampler',
        inputs: {
          seed,
          steps,
          cfg,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
        },
      },
      // 10. Decode with tiling for 8GB VRAM.
      '10': {
        class_type: 'VAEDecodeTiled',
        inputs: {
          vae: ['3', 0],
          samples: ['7', 0],
          tile_size: 512,
          overlap: 64,
        },
      },
      // 11. Save video.
      '11': {
        class_type: 'SaveVideo',
        inputs: {
          video: ['10', 0],
          filename_prefix: filenamePrefix,
          codec: 'vp9',
          fps: 24,
          crf: 19,
        },
      },
    },
  }
}
