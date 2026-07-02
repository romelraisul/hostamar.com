/**
 * ComfyUI Client - Local image generation via Docker Model Runner
 * Uses the existing hostamar-comfyui container (port 8188)
 */

const COMFYUI_BASE = process.env.COMFYUI_URL || 'http://hostamar-comfyui:8188';

interface ComfyUIOutput {
  images?: Array<{ filename: string; type: string }>;
}

interface ComfyUIResponse {
  prompt_id: string;
  outputs?: Record<string, ComfyUIOutput>;
  status?: { status_str: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${COMFYUI_BASE}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { prompt_id: string };
  return data.prompt_id;
}

async function pollForCompletion(promptId: string, timeoutMs = 120000): Promise<ComfyUIResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${COMFYUI_BASE}/history/${promptId}`);
    if (!response.ok) {
      await sleep(2000);
      continue;
    }

    const history = (await response.json()) as Record<string, ComfyUIResponse>;
    const entry = history[promptId];
    if (!entry) {
      await sleep(2000);
      continue;
    }

    const status = entry.status?.status_str;
    if (status === 'success') {
      return entry;
    }
    if (status === 'error') {
      throw new Error(`ComfyUI workflow failed for prompt ${promptId}`);
    }

    await sleep(2000);
  }

  throw new Error(`ComfyUI prompt ${promptId} timed out after ${timeoutMs}ms`);
}

export interface ImageGenOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  outputFormat?: 'png' | 'jpg' | 'webp';
}

export async function generateImagesLocal(
  options: ImageGenOptions,
  model = 'sd_xl_turbo_1.0_fp16.safetensors'
): Promise<string[]> {
  const {
    prompt,
    negativePrompt = '',
    width = 1024,
    height = 1024,
    steps = 20,
    cfg = 7.0,
    seed = Math.floor(Math.random() * 2147483647),
    outputFormat = 'png',
  } = options;

  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0],
      },
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": model,
      },
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": 1,
      },
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": prompt,
        "clip": ["4", 1],
      },
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": negativePrompt,
        "clip": ["4", 1],
      },
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2],
      },
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": `hostamar_${Date.now()}`,
        "images": ["8", 0],
      },
    },
  };

  console.log(`[ComfyUI] Queueing prompt: "${prompt.slice(0, 60)}..."`);
  const promptId = await queuePrompt(workflow);
  const result = await pollForCompletion(promptId);

  const images = result.outputs?.['9']?.images || [];
  if (images.length === 0) {
    throw new Error(`ComfyUI prompt ${promptId} returned no images`);
  }

  return images.map((img) => {
    const cleanName = img.filename.replace(/\\/g, '/').split('/').pop() || img.filename;
    return `${COMFYUI_BASE}/view?type=${img.type}&filename=${encodeURIComponent(cleanName)}`;
  });
}

export default {
  generateImagesLocal,
};
