import { NextRequest, NextResponse } from 'next/server'

const COMFYUI_BASE = process.env.COMFYUI_URL || process.env.COMFYUI_PUBLIC_URL || 'http://localhost:8188'

// Available models that work on 8GB VRAM
const AVAILABLE_MODELS = [
  { id: 'sd_xl_turbo_1.0_fp16.safetensors', name: 'SDXL Turbo (Fastest)', speed: '~1s', quality: 'Good', vram: '6GB' },
  { id: 'sd_xl_base_1.0.safetensors', name: 'SDXL Base (Best Quality)', speed: '~10s', quality: 'Excellent', vram: '8GB' },
  { id: 'realvisxlV40.safetensors', name: 'RealVisXL (Photorealistic)', speed: '~15s', quality: 'Best', vram: '8GB' },
]

export async function GET() {
  // Return available models
  // Check which models exist on ComfyUI
  const models = []
  try {
    const resp = await fetch(`${COMFYUI_BASE}/object_info/CheckpointLoaderSimple`)
    if (resp.ok) {
      const data = await resp.json()
      const available = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []
      for (const m of AVAILABLE_MODELS) {
        if (available.includes(m.id)) {
          models.push(m)
        }
      }
    }
  } catch {
    // ComfyUI offline
  }
  
  return NextResponse.json({
    models: models.length > 0 ? models : AVAILABLE_MODELS,
    comfyui_online: models.length > 0,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      negativePrompt = 'blurry, low quality, ugly, distorted, watermark, text',
      width = 1024,
      height = 1024,
      steps = 4,
      cfg = 7.0,
      seed = Math.floor(Math.random() * 2147483647),
      model = 'sd_xl_turbo_1.0_fp16.safetensors',
      sampler = 'euler',
      scheduler = 'normal',
    } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    }

    // Validate model exists
    const resp = await fetch(`${COMFYUI_BASE}/object_info/CheckpointLoaderSimple`)
    if (!resp.ok) {
      return NextResponse.json({ error: 'ComfyUI offline. Start ComfyUI first.' }, { status: 503 })
    }
    
    const modelData = await resp.json()
    const availableModels = modelData?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []
    if (!availableModels.includes(model)) {
      return NextResponse.json({ 
        error: `Model ${model} not found. Available: ${availableModels.join(', ')}` 
      }, { status: 400 })
    }

    // Build SDXL workflow
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": cfg,
          "sampler_name": sampler,
          "scheduler": scheduler,
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
    }

    // Submit to ComfyUI
    const submitResp = await fetch(`${COMFYUI_BASE}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    })

    if (!submitResp.ok) {
      return NextResponse.json({ error: 'Failed to submit to ComfyUI' }, { status: 500 })
    }

    const { prompt_id } = await submitResp.json()

    // Poll for completion (up to 2 minutes)
    const startTime = Date.now()
    while (Date.now() - startTime < 120000) {
      await new Promise(r => setTimeout(r, 2000))
      
      const histResp = await fetch(`${COMFYUI_BASE}/history/${prompt_id}`)
      if (!histResp.ok) continue
      
      const history = await histResp.json()
      const entry = history[prompt_id]
      if (!entry) continue
      
      const status = entry.status?.status_str
      if (status === 'success') {
        const images = entry.outputs?.['9']?.images || []
        const imageUrls = images.map((img: { filename: string; type: string }) => {
          const cleanName = img.filename.replace(/\\/g, '/').split('/').pop() || img.filename
          return `${COMFYUI_BASE}/view?type=${img.type}&filename=${encodeURIComponent(cleanName)}`
        })
        
        return NextResponse.json({
          success: true,
          images: imageUrls,
          prompt_id,
          model,
          seed,
          steps,
        })
      }
      if (status === 'error') {
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Generation timed out' }, { status: 408 })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
