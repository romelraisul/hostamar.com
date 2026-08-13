import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildWanT2VWorkflow } from '@/lib/comfyWorkflow'
import path from 'path'
import fs from 'fs'

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
    url = `${QWEN_URL}/api/chat`
    body = {
      model: 'Qwen/Qwen3.6-35B-A3B-FP8',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
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
    : data.message?.content || ''

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

// Submit render job to ComfyUI using the validated Wan2.1-T2V-1.3B graph.
async function submitToComfyUI(scenePrompt: string, width = 832, height = 480): Promise<string> {
  const body = buildWanT2VWorkflow({ prompt: scenePrompt, width, height })

  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`ComfyUI submit failed: ${res.status} ${errText.slice(0, 200)}`)
  }
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

// Background: render all scenes
async function renderAllScenes(jobId: string, scenes: any[]) {
  const OUTPUT_ROOT = process.env.COMFYUI_OUTPUT_DIR || path.join('C:', 'ComfyUI_Download', 'ComfyUI_windows_portable', 'ComfyUI', 'output')

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]

    await prisma.videoScene.updateMany({
      where: { jobId, index: i },
      data: { status: 'rendering' },
    })

    try {
      const promptId = await submitToComfyUI(scene.prompt)

      const result = await waitForComfyOutput(promptId)
      if (!result) {
        throw new Error('Render timeout or no output')
      }

      const publicUrl = `${COMFYUI_PUBLIC}/api/video/file/${jobId}?f=${encodeURIComponent(result.fileName)}&t=${encodeURIComponent(result.type)}`

      await prisma.videoScene.updateMany({
        where: { jobId, index: i },
        data: { status: 'done', comfyPromptId: promptId, outputUrl: publicUrl },
      })
    } catch (error) {
      console.error(`Scene ${i} render failed:`, error)
      await prisma.videoScene.updateMany({
        where: { jobId, index: i },
        data: { status: 'failed', errorMessage: (error as any)?.message || 'render_failed' },
      })
    }
  }

  const summary = await prisma.videoScene.findMany({
    where: { jobId },
    select: { status: true, outputUrl: true },
  })

  const completedScenes = summary.filter((s) => s.status === 'done').length
  const status = completedScenes === 0 ? 'error' : 'done'
  const outputUrl = summary.find((s) => s.outputUrl)?.outputUrl || null

  await prisma.videoJob.update({
    where: { id: jobId },
    data: {
      status,
      completedScenes,
      outputUrl,
      completedAt: new Date(),
    },
  })
}

async function waitForComfyOutput(promptId: string, timeoutMs = 1000 * 60 * 10) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await sleep(2000)
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`).catch(() => null)
    if (!res || !res.ok) continue
    const data = await res.json().catch(() => null)
    const entry = data?.[promptId]
    if (!entry) continue

    const status = entry.status?.status_str
    if (status === 'success') {
      const images = entry.outputs?.['9']?.images || []
      const first = images[0]
      if (!first) return null
      const fileNames = Array.isArray(first) ? first[0]?.filename : first.filename
      if (!fileNames) return null
      const fileName = Array.isArray(fileNames) ? fileNames[0] : fileNames
      const source = await fetch(`${COMFYUI_URL}/view?type=${first.type}&filename=${encodeURIComponent(fileName)}`).catch(() => null)
      if (!source || !source.ok) return null
      const buffer = Buffer.from(await source.arrayBuffer())
      const OUTPUT_ROOT = process.env.COMFYUI_OUTPUT_DIR || path.join('C:', 'ComfyUI_Download', 'ComfyUI_windows_portable', 'ComfyUI', 'output')
      fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
      const outPath = path.join(OUTPUT_ROOT, fileName)
      await fs.promises.writeFile(outPath, buffer)
      return { fileName, type: first.type || 'output' }
    }
    if (status === 'error') return null
  }
  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
