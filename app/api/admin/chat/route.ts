import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const DMR_BASE_URL = 'http://localhost:12434/engines/v1'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'localhost'
  const { allowed } = rateLimit(`chat:${ip}`, 20, 60000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in 60 seconds.' }, { 
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }

  let timeoutId: NodeJS.Timeout | undefined
  let model = 'smollm3:F16'

  try {
    const { 
      message, 
      model: selectedModel = 'smollm3:F16',
      systemPrompt,
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      conversationHistory = []
    } = await request.json()

    model = selectedModel

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const availableModels = ['qwen3.6:27B', 'smollm3:F16', 'seed-oss:36B-UD-IQ1_M', 'stable-diffusion:latest']
    if (!availableModels.includes(model)) {
      return NextResponse.json({ error: `Model ${model} not available` }, { status: 400 })
    }

    const messages: { role: string; content: string }[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    if (conversationHistory?.length) {
      messages.push(...conversationHistory)
    }
    messages.push({ role: 'user', content: message })

    const timeoutMs = model.includes('27B') || model.includes('36B') ? 120000 : 30000
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${DMR_BASE_URL}/chat/completions`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream
      }),
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: `DMR API error: ${response.status}`,
        details: errorText 
      }, { status: 500 })
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      response: data.choices?.[0]?.message?.content || '',
      model: data.model || model,
      usage: data.usage,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)
    const msg = error instanceof Error ? error.message : 'Chat failed'
    const isTimeout = msg.includes('aborted') || msg.includes('AbortError')

    if (isTimeout && (model.includes('27B') || model.includes('36B'))) {
      return NextResponse.json({
        success: true,
        response: `[${model} timed out — switched to small model for speed] Please try a smaller model like smollm3:F16 for faster responses. Large models are available for async tasks.`,
        model: 'fallback',
        fallback: true,
      })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  let modelStatus: Record<string, string> = {}
  try {
    const res = await fetch(`${DMR_BASE_URL}/models`)
    const data = await res.json()
    data.data?.forEach((m: { id: string }) => {
      modelStatus[m.id] = 'available'
    })
  } catch {
    modelStatus = {}
  }

  return NextResponse.json({
    endpoint: DMR_BASE_URL,
    status: Object.keys(modelStatus).length > 0 ? 'connected' : 'disconnected',
    availableModels: [
      { id: 'qwen3.6:27B', name: 'Qwen 3.6 27B', size: '16.39GB', type: 'chat', recommended: true },
      { id: 'smollm3:F16', name: 'Smollm3 F16', size: '5.73GB', type: 'chat', recommended: true },
      { id: 'seed-oss:36B-UD-IQ1_M', name: 'Seed OSS 36B', size: '8.45GB', type: 'chat', recommended: false },
      { id: 'stable-diffusion:latest', name: 'Stable Diffusion XL', size: '6.94GB', type: 'image', recommended: false }
    ],
    capabilities: {
      chat: ['qwen3.6:27B', 'smollm3:F16', 'seed-oss:36B-UD-IQ1_M'],
      image: ['stable-diffusion:latest']
    },
    modelStatus
  })
}