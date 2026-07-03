import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'

export async function POST(request: NextRequest) {
  try {
    const { tool, message, history } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const systemPrompt =
      tool === 'kai'
        ? 'You are Kai, a developer assistant for Hostamar.com. Help with product tasks, debugging, and implementation guidance.'
        : 'You are Hostamar CEO assistant. Help with leadership tasks, strategic planning, and product decisions.'

    const messages = [
      { role: 'system', content: systemPrompt },
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
      const errorText = await response.text().catch(() => 'Ollama unreachable')
      return NextResponse.json({ error: 'AI service unavailable', detail: errorText }, { status: 502 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || data.content || 'No response generated.'

    return NextResponse.json({
      role: 'assistant',
      content: reply,
      model: OLLAMA_MODEL,
      provider: 'ollama',
      tool,
    })
  } catch (error: any) {
    console.error('Dev chat error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
