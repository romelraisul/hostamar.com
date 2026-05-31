import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'

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

    const response = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Ollama error:', error)
      return NextResponse.json(
        { error: 'AI service unavailable', detail: error },
        { status: 502 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'No response generated.'

    return NextResponse.json({
      role: 'assistant',
      content: reply,
      model: OLLAMA_MODEL,
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
