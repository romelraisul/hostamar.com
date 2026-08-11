import { NextRequest, NextResponse } from 'next/server'

const COMFYUI_BASE = process.env.COMFYUI_PUBLIC_URL || 'https://comfy.hostamar.com'

export async function POST(request: NextRequest) {
  try {
    const { prompt, duration = 5, model = 'wan2.1' } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Simple Wan2.1 text-to-video workflow
    const workflow = {
      "3": {
        "class_type": "WanVideoTextToVideo",
        "inputs": {
          "prompt": prompt,
          "negative_prompt": "",          "width": 512,
          "height": 512,
          "frames": 49,
          "steps": 20,
          "cfg": 7.0,
          "seed": Math.floor(Math.random() * 2147483647)
        }
      },
      "4": {
        "class_type": "WanVideoDecode",
        "inputs": {
          "samples": ["3", 0]
        }
      },
      "5": {
        "class_type": "VHS_VideoCombine",
        "inputs": {
          "video": ["4", 0],
          "fps": 24,
          "loop_count": 0,
          "filename_prefix": `hostamar_${Date.now()}`,
          "format": "video/h264-mp4",
          "pix_fmt": "yuv420p",
          "crf": 19,
          "save_metadata": false,
          "trim_to_audio": false,
          "pingpong": false,
          "save_output": true
        }
      }
    }

    const response = await fetch(`${COMFYUI_BASE}/prompt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({ prompt: workflow }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'ComfyUI unavailable' }, { status: 503 })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      message: 'Video generation started',
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to start video generation' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    available: true,
    comfyui_url: COMFYUI_BASE,
    models: ['wan2.1', 'ltx-video'],
    note: 'Video generation via ComfyUI'
  })
}
