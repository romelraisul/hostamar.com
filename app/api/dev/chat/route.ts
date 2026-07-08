import { NextRequest, NextResponse } from 'next/server'
import { chat as kilocodeChat } from '@/lib/kilocode-client'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'

async function callOllama(messages: any[], model: string) {
  const response = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, temperature: 0.7, max_tokens: 1024 }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Ollama unreachable')
    throw new Error(`Ollama failed: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || data.content || 'No response generated.'
  return { reply, provider: 'ollama', model }
}

async function callKiloCode(messages: any[]) {
  const result = await kilocodeChat(
    messages.findLast?.((m: any) => m.role === 'user')?.content ||
      [...messages].reverse().find((m: any) => m.role === 'user')?.content ||
      '',
    messages.find((m: any) => m.role === 'system')?.content,
    'kilo-auto/free',
  )
  if ('error' in result) throw new Error(`KiloCode failed: ${result.error}`)
  return { reply: result.text, provider: 'kilocode-free', model: 'kilo-auto/free' }
}

function fallbackReply(tool: string | undefined, message: string): string {
  const persona = tool === 'kai'
    ? 'Kai (Hostamar dev assistant)'
    : 'Hostamar CEO assistant'
  const m = (message || '').trim()
  const seed = (persona + '|' + m).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr: string[]) => arr[seed % arr.length]
  const helpTag = [
    'KILOCODE_API_KEY not set and Ollama unreachable — using built-in fallback.',
    'Set KILOCODE_API_KEY on Railway (Token B from kilo.ai) for free AI responses.',
    'kilo-auto/free via KiloCode gateway is the zero-cost option — configure KILOCODE_API_KEY to activate.',
  ][seed % 3]
  if (tool === 'kai') return [
    `Kai here. You said: "${m.slice(0, 220)}".`,
    pick(['Check lib/auth.ts then app/api/dev/chat/route.ts for AI wiring.',
          'Reproduce: curl -X POST https://hostamar.com/api/dev/chat',
          'Try: npm run lint && npx tsc --noEmit --skipLibCheck']),
    helpTag,
  ].join(' ').slice(0, 800)
  return [
    `${persona} here. You wrote: "${m.slice(0, 220)}".`,
    pick(['Strategy: ship always-on fallback before adding more features.',
          'Strategy: gate spend on production health, not on the next shiny.']),
    'Three things: confirm signups land in Postgres, wire zero-credit AI, keep shim as last resort.',
    helpTag,
  ].join(' ').slice(0, 800)
}

export async function POST(request: NextRequest) {
  try {
    const { tool, message, history } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    const systemPrompt = tool === 'kai'
      ? 'You are Kai, a developer assistant for Hostamar.com. Help with product tasks, debugging, and implementation guidance.'
      : 'You are Hostamar CEO assistant. Help with leadership tasks, strategic planning, and product decisions.'
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user', content: message },
    ]

    let result: { reply: string; provider: string; model: string }
    try {
      result = await callOllama(messages, OLLAMA_MODEL)
    } catch (ollamaError: any) {
      console.warn('[chat] Ollama down, trying KiloCode free:', ollamaError?.message)
      try {
        result = await callKiloCode(messages)
      } catch (kcError: any) {
        console.warn('[chat] KiloCode free down, using shim:', kcError?.message)
        result = { reply: fallbackReply(tool, message), provider: 'shim', model: 'hostamar-fallback-shim' }
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: result.reply,
      model: result.model,
      provider: result.provider,
      tool,
    })
  } catch (error: any) {
    console.error('Dev chat error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
