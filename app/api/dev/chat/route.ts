import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'
const KAI9000_API_URL = process.env.KAI9000_API_URL || ''
const KAI9000_API_KEY  = process.env.KAI9000_API_KEY || ''
const KAI9000_MODEL   = process.env.KAI9000_MODEL || 'kai-9000'

async function callOllama(messages: any[], model: string) {
  const response = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Ollama unreachable')
    throw new Error(`Ollama failed: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || data.content || 'No response generated.'
  return { reply, provider: 'ollama', model }
}

async function callKai9000(messages: any[]) {
  if (!KAI9000_API_URL) {
    throw new Error('KAI9000_API_URL is not configured')
  }
  const authHeader = KAI9000_API_KEY ? `Bearer ${KAI9000_API_KEY}` : undefined
  const response = await fetch(`${KAI9000_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      model: KAI9000_MODEL,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Kai-9000 unreachable')
    throw new Error(`Kai-9000 failed: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || data.content || 'No response generated.'
  return { reply, provider: 'kai-9000', model: KAI9000_MODEL }
}

/**
 * Emergency zero-cost shim. Used only when both Ollama and Kai-9000 are
 * unavailable — i.e. the local Ollama process is down AND we don't have
 * KAI9000_API_URL set on the server.
 *
 * The shim produces varied, context-aware fallback text so /kai and
 * /hostamar-ceo never show a 500 in development or zero-credit
 * environments. It DOES NOT claim to be the real model. tag="shim" lets
 * the UI surface the provenance to the user.
 */
function fallbackReply(tool: string | undefined, message: string, history: any[]): string {
  const persona = tool === 'kai'
    ? 'Kai (Hostamar dev assistant)'
    : 'Hostamar CEO assistant'
  const m = (message || '').trim()
  const len = Math.min(420, Math.max(80, Math.floor(m.length * 1.4)))
  // Light echo-ish, persona-correct, deterministic per (message, persona).
  const seed = (persona + '|' + m).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr: string[]) => arr[seed % arr.length]
  const helpTag = [
    "I'm running on built-in fallback for now (KAI9000_API_URL not configured and Ollama unreachable).",
    "Switch me over to your preferred provider by setting KAI9000_API_URL on Railway.",
    "I'm responding from a local fallback until KAI9000 or Ollama is reachable.",
  ][seed % 3]
  // Tone per tool
  if (tool === 'kai') return [
    `Got it — ${persona} here. You said: "${m.slice(0, 220)}".`,
    `Quick take: I'll need this in a dev context. If it's a Next.js / Prisma task on hostamar-build, check lib/auth.ts first; then app/api/dev/chat/route.ts.`,
    `Suggested next move:`,
    `  1) reproduce with a minimal test (curl POST /api/...),`,
    `  2) capture stderr + railway logs --service web --lines 100,`,
    `  3) diff the file that 500'd against main.`,
    `Try: npm run lint && npx tsc --noEmit --skipLibCheck && npm run build.`,
    helpTag,
  ].join(' ').slice(0, 800)

  return [
    `${persona} here. You wrote: "${m.slice(0, 220)}".`,
    pick([
      'Strategy: this quarter, ship the always-on fallback before adding more features.',
      'Strategy: lock down the admin pipeline first; defer new product surface until auth is boring.',
      'Strategy: gate marketing spend on production health, not on the next shiny feature.',
    ]),
    `Three things I would do this week:`,
    `  * confirm signups land in Postgres without schema drift`,
    `  * wire a zero-credit OpenAI-compatible fallback (Groq or OpenRouter) so /kai never 500s`,
    `  * keep the dev/chat shim as last-resort only`,
    `Length target ~${len} chars; this is fallback prose, not the real model.`,
    helpTag,
  ].join(' ').slice(0, 800)
}

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

    let result
    try {
      result = await callOllama(messages, OLLAMA_MODEL)
    } catch (ollamaError: any) {
      console.warn('Ollama fallback triggered:', ollamaError?.message || ollamaError)
      try {
        result = await callKai9000(messages)
      } catch (kaiError: any) {
        console.warn('Kai-9000 fallback triggered:', kaiError?.message || kaiError)
        // Zero-cost fallback: deterministic, persona-correct shim.
        result = {
          reply: fallbackReply(tool, message, history),
          provider: 'shim',
          model: 'hostamar-fallback-shim',
        }
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
