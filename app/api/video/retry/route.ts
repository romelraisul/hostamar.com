import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const body = form ? Object.fromEntries(form as any) : await req.json().catch(() => ({}))
  const videoId = (body as any).videoId || 'demo'
  
  try {
    // Re-queue with local workflow WSL only - HunyuanVideo1.5 720p fp8 + Qwen RGBA - no API login
    const prompt = {
      prompt: {
        "1": { class_type: "UNETLoader", inputs: { unet_name: "hunyuan_video_720_fp8_e4m3fn.safetensors" } },
        "2": { class_type: "CLIPLoader", inputs: { clip_name: "qwen3.5_9b_qwen_image_2.1_pe_i2i.int8_convrot.safetensors" } },
        "3": { class_type: "VAELoader", inputs: { vae_name: "hunyuan_video_vae_bf16.safetensors" } },
        "4": { class_type: "CLIPTextEncode", inputs: { text: "Globalization FAILED! Hostamar.com AI for Bangladesh local hosting vertical 9:16" } },
        "5": { class_type: "EmptyHunyuanLatentVideo", inputs: { width: 720, height: 1280, length: 49 } },
        "6": { class_type: "SamplerCustom", inputs: {} },
        "7": { class_type: "VAEDecode", inputs: {} },
        "8": { class_type: "VHS_VideoCombine", inputs: { fps: 24, format: "video/h264-mp4", filename_prefix: `Globalization_FAILED_${videoId}` } }
      }
    }
    
    const res = await fetch('http://127.0.0.1:8188/api/prompt', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(prompt) 
    })
    const data = await res.json()
    
    try { 
      await prisma.video.update({ 
        where: { id: videoId }, 
        data: { status: 'processing' } 
      }) 
    } catch(e) {}
    
    return NextResponse.json({ 
      status: 're-queued WSL local ~/ComfyUI', 
      comfyui_id: data.prompt_id, 
      workflow: 'HunyuanVideo1.5 720p fp8 + VHS_VideoCombine VIDEO direct not LATENT only - no API login - WSL 382GB free', 
      videoId, 
      output: `~/ComfyUI/output/Globalization_FAILED_${videoId}_00001_.mp4` 
    })
  } catch(e: any) {
    return NextResponse.json({ 
      error: e.message, 
      fix: 'ComfyUI :8188 not reachable or Hunyuan models not in WSL ~/ComfyUI/models/' 
    }, { status: 500 })
  }
}