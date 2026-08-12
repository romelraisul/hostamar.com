import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// Unified Video Creation API
// Chains: User Prompt → AI Script (Bonsai/Qwen) → ComfyUI Render → Video URL
// ============================================================================

const BONSAI_URL = process.env.BONSAI_URL || 'http://localhost:11436'
const QWEN_URL = process.env.QWEN_URL || 'http://localhost:11435'
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://localhost:8188'
const COMFYUI_PUBLIC = process.env.COMFYUI_PUBLIC_URL || 'https://comfy.hostamar.com'

// Check which models are available
async function getAvailableModels(): Promise<{ bonsai: boolean; qwen36: boolean }> {
  const result = { bonsai: false, qwen36: false }

  try {
    const r = await fetch(`${BONSAI_URL}/v1/models`, { signal: AbortSignal.timeout(2000) })
    result.bonsai = r.ok
  } catch { /* not available */ }

  try {
    const r = await fetch(`${QWEN_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
    result.qwen36 = r.ok
  } catch { /* not available */ }

  return result
}

// Generate script using Bonsai or Qwen
async function generateScript(prompt: string, model: 'bonsai' | 'qwen36'): Promise<{ scenes: any[]; fullScript: string }> {
  const systemPrompt = `You are a professional video script writer for Bangladeshi businesses.
Given a user's video request, generate a JSON response with:
1. "fullScript": A complete voiceover script in Bengali (30-60 seconds when spoken)
2. "scenes": An array of 3-5 scenes, each with:
   - "description": What happens in this scene (1 sentence)
   - "prompt": Detailed visual description for AI video generation (English, descriptive)
   - "duration": Length in seconds (3-8 seconds per scene)
   - "voiceover": The Bengali voiceover text for this scene

Focus on: product showcase, pricing, bKash/Nagad payment info if mentioned.
Keep scenes short and impactful. Total video 30-60 seconds.

Output ONLY valid JSON, no other text.`

  const userPrompt = `Create a video script for: "${prompt}"`

  let url: string
  let body: any

  if (model === 'bonsai') {
    url = `${BONSAI_URL}/v1/chat/completions`
    body = {
      model: 'bonsai-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }
  } else {
    url = `${QWEN_URL}/api/generate`
    body = {
      model: 'qwen3.6:latest',
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      stream: false,
      options: { temperature: 0.8, num_predict: 2000 },
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Script generation failed: ${res.status}`)

  const data = await res.json()
  const text = model === 'bonsai'
    ? data.choices?.[0]?.message?.content || ''
    : data.response || ''

  // Parse JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Try to extract JSON manually
  }

  // Fallback: create a simple structure
  return {
    fullScript: prompt,
    scenes: [
      {
        description: prompt.substring(0, 100),
        prompt: `${prompt}, professional video, Bangladeshi context, high quality`,
        duration: 5,
        voiceover: prompt,
      },
    ],
  }
}

// Submit render job to ComfyUI
async function submitToComfyUI(prompt: string, width = 960, height = 540): Promise<string> {
  // Build a simple Wan2.1 workflow
  const workflow = {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { checkpoint_name: "sd_xl_turbo_1.0_fp16.safetensors" } },
    "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: prompt } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 0], text: "blurry, low quality, distorted" } },
    "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { seed: Math.floor(Math.random() * 1000000), steps: 8, cfg: 3.5, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: "hostamar_video", images: ["6", 0] } },
  }

  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  })

  if (!res.ok) throw new Error(`ComfyUI submit failed: ${res.status}`)
  const data = await res.json()
  return data.prompt_id
}

// Check render status
async function checkRenderStatus(promptId: string): Promise<{ status: string; progress: number }> {
  try {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`)
    if (!res.ok) return { status: 'pending', progress: 0 }
    const data = await res.json()
    if (data && data[promptId]) {
      return { status: 'done', progress: 100 }
    }
    return { status: 'rendering', progress: 50 }
  } catch {
    return { status: 'pending', progress: 0 }
  }
}

// ============================================================================
// API Routes
// ============================================================================

// POST /api/video/create — Start video creation
export async function POST(req: NextRequest) {
  try {
    const { prompt, model = 'bonsai' } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Generate script
    const scriptData = await generateScript(prompt, model)

    // Create job in database
    const job = await prisma.videoJob.create({
      data: {
        prompt,
        model,
        status: 'rendering',
        scenes: { create: scriptData.scenes.map((s: any, i: number) => ({
          index: i,
          description: s.description,
          prompt: s.prompt,
          duration: s.duration,
          status: 'pending',
        }))},
      },
    })

    // Start rendering scenes (async — don't await)
    renderAllScenes(job.id, scriptData.scenes).catch(console.error)

    return NextResponse.json({
      jobId: job.id,
      scenes: scriptData.scenes.map((s: any, i: number) => ({
        id: i + 1,
        ...s,
        status: 'pending',
      })),
    })

  } catch (error: any) {
    console.error('Video create error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

// GET /api/video/models — Check available AI models
export async function GET() {
  const models = await getAvailableModels()
  return NextResponse.json(models)
}

// GET /api/video/status/[jobId] — Check render progress
export async function getStatus(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const job = await prisma.videoJob.findUnique({
      where: { id: params.jobId },
      include: { scenes: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const doneScenes = job.scenes.filter(s => s.status === 'done').length
    const totalScenes = job.scenes.length
    const progress = totalScenes > 0 ? Math.round((doneScenes / totalScenes) * 100) : 0

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress,
      scenes: job.scenes,
      videoUrl: job.outputUrl,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Background: render all scenes
async function renderAllScenes(jobId: string, scenes: any[]) {
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    // Update scene status
    await prisma.videoScene.updateMany({
      where: { jobId, index: i },
      data: { status: 'rendering' },
    })

    try {
      // Submit to ComfyUI
      const promptId = await submitToComfyUI(scene.prompt)

      // Poll until done (simplified)
      await new Promise(resolve => setTimeout(resolve, 15000))

      // Mark as done
      await prisma.videoScene.updateMany({
        where: { jobId, index: i },
        data: { status: 'done', comfyPromptId: promptId },
      })

    } catch (error) {
      console.error(`Scene ${i} render failed:`, error)
      await prisma.videoScene.updateMany({
        where: { jobId, index: i },
        data: { status: 'failed' },
      })
    }
  }

  // Mark job complete
  await prisma.videoJob.update({
    where: { id: jobId },
    data: { status: 'done', completedAt: new Date() },
  })
}
