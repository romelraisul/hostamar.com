import { NextRequest, NextResponse } from 'next/server'
import { buildHunyuanT2VWorkflow } from '@/lib/comfyWorkflow'
import { getAuthUser } from '@/lib/get-auth-user'
import { getCreditAccount, deductCredits, CREDIT_COSTS } from '@/lib/credits'

const COMFYUI_BASE = process.env.COMFYUI_PUBLIC_URL || 'https://comfy.hostamar.com'
const COMFYUI_INTERNAL = process.env.COMFYUI_URL || 'http://localhost:8188'

const AVAILABLE_MODELS = [
  { id: 'hunyuan1.5', name: 'HunyuanVideo 1.5 8B', provider: 'local-comfyui', creditsPer5s: CREDIT_COSTS.video_hunyuan_5s },
]

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const customerId = user?.id

    const { prompt, duration = 30, model = 'hunyuan1.5' } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (model !== 'hunyuan1.5') {
      return NextResponse.json({ error: 'Only hunyuan1.5 model available', available: ['hunyuan1.5'] }, { status: 400 })
    }

    const cost = CREDIT_COSTS.video_hunyuan_5s * Math.max(1, Math.ceil(duration / 5))

    if (customerId) {
      const account = await getCreditAccount(customerId)
      if (account.credits < cost) {
        return NextResponse.json({ error: 'Insufficient credits', required: cost, balance: account.credits }, { status: 402 })
      }
    }

    const frames = duration <= 5 ? 49 : duration <= 10 ? 81 : 121
    const body = buildHunyuanT2VWorkflow({
      prompt,
      numFrames: frames,
      steps: 30,
      filenamePrefix: `hostamar_${Date.now()}`,
    })

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
      await deductCredits(customerId, cost, 'video_hunyuan_5s', `Video generation (hunyuan1.5, ${duration}s)`)
    }

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      model: 'hunyuan1.5',
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
    note: 'Video generation via ComfyUI (HunyuanVideo 1.5 native)',
  })
}
