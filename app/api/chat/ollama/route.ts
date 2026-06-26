import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'
const FALLBACK_API_URL = process.env.FALLBACK_API_URL || ''
const FALLBACK_API_KEY = process.env.FALLBACK_API_KEY || ''
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || OLLAMA_MODEL

const MODELS_AVAILABLE = ['qwen3.6:latest', 'hermes3:latest', 'granite4.1:8b']

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const messages = [
      {
        role: 'system',
        content: 'You are Hostamar AI, a helpful assistant for Hostamar.com — a cloud hosting, AI video marketing, and gaming platform. Respond in the same language the user writes in (Bengali, English, or Urdu). Keep responses concise and actionable.',
      },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user', content: message },
    ]

    // Try local Ollama first, then fall back to hosted OpenAI-compatible endpoint
    let response = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    }).catch(() => undefined)

    let usedFallback = false

    if (!response || !response.ok) {
      if (!FALLBACK_API_URL || !FALLBACK_API_KEY) {
        const detail = response ? await response.text().catch(() => 'Ollama unreachable') : 'Ollama unreachable'
        return NextResponse.json(
          { error: 'AI service unavailable', detail },
          { status: 502 }
        )
      }

      response = await fetch(FALLBACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FALLBACK_API_KEY}`,
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })

      usedFallback = true
    }

    if (!response.ok) {
      const error = await response.text()
      console.error('AI provider error:', error)
      return NextResponse.json(
        { error: 'AI service unavailable', detail: error },
        { status: 502 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.content || 'No response generated.'

    return NextResponse.json({
      role: 'assistant',
      content: reply,
      model: usedFallback ? FALLBACK_MODEL : OLLAMA_MODEL,
      provider: usedFallback ? 'fallback' : 'ollama',
    })
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`)
    if (!response.ok) throw new Error('Ollama not reachable')
    const data = await response.json()
    const models = data.models?.map((m: any) => m.name) || []
    return NextResponse.json({ status: 'connected', models })
  } catch {
    return NextResponse.json({ status: 'disconnected', models: [] })
  }
}
