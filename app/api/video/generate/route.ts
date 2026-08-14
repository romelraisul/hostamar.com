import { NextRequest, NextResponse } from 'next/server'
import { buildWanT2VWorkflow, buildHunyuanT2VWorkflow } from '@/lib/comfyWorkflow'
import { getAuthUser } from '@/lib/get-auth-user'
import { getCreditAccount, deductCredits, CREDIT_COSTS } from '@/lib/credits'

const COMFYUI_BASE = process.env.COMFYUI_PUBLIC_URL || 'https://comfy.hostamar.com'
const COMFYUI_INTERNAL = process.env.COMFYUI_URL || 'http://localhost:8188'

const AVAILABLE_MODELS = [
  { id: 'hunyuan1.5', name: 'HunyuanVideo 1.5 8B GGUF', provider: 'local-comfyui', creditsPer5s: CREDIT_COSTS.video_hunyuan_5s },
  { id: 'wan2.1', name: 'Wan2.1 T2V 1.3B', provider: 'local-comfyui', creditsPer5s: CREDIT_COSTS.video_wan_5s },
]

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const customerId = user?.id

    const { prompt, duration = 30, model = 'hunyuan1.5' } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const selected = AVAILABLE_MODELS.find((m) => m.id === model)
    if (!selected) {
      return NextResponse.json({ error: 'Unsupported model', available: AVAILABLE_MODELS.map((m) => m.id) }, { status: 400 })
    }

    const cost = selected.creditsPer5s * Math.max(1, Math.ceil(duration / 5))

    if (customerId) {
      const account = await getCreditAccount(customerId)
      if (account.credits < cost) {
        return NextResponse.json({ error: 'Insufficient credits', required: cost, balance: account.credits }, { status: 402 })
      }
    }

    let body: any
    if (model === 'hunyuan1.5') {
      const frames = duration <= 5 ? 49 : duration <= 10 ? 81 : 121
      body = buildHunyuanT2VWorkflow({
        prompt,
        numFrames: frames,
        steps: 30,
        filenamePrefix: `hostamar_${Date.now()}`,
      })
    } else {
      const frames = duration <= 5 ? 49 : 81
      body = buildWanT2VWorkflow({
        prompt,
        numFrames: frames,
        steps: 30,
        filenamePrefix: `hostamar_${Date.now()}`,
      })
    }

    const target = COMFYUI_INTERNAL
    const response = await fetch(`${target}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      return NextResponse.json({ error: 'ComfyUI unavailable', detail: err.slice(0, 300) }, { status: 503 })
    }

    const data = await response.json()

    if (customerId) {
      await deductCredits(customerId, cost, model === 'hunyuan1.5' ? 'video_hunyuan_5s' : 'video_wan_5s', `Video generation (${model}, ${duration}s)`)
    }

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      model: selected.id,
      duration,
      credits_cost: cost,
      message: 'Video generation started',
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to start video generation', detail: error?.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    available: true,
    comfyui_url: COMFYUI_BASE,
    models: AVAILABLE_MODELS.map((m) => ({ id: m.id, name: m.name, creditsPer5s: m.creditsPer5s })),
    note: 'Video generation via ComfyUI (Wan2.1 / HunyuanVideo 1.5 GGUF)',
  })
}
