export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'
const FALLBACK_API_URL = process.env.FALLBACK_API_URL || ''
const FALLBACK_API_KEY = process.env.FALLBACK_API_KEY || ''
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || OLLAMA_MODEL
const OMNIROUTE_URL = process.env.OMNIROUTE_URL || ''
const OMNIROUTE_KEY = process.env.OMNIROUTE_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

const MODELS_AVAILABLE = ['qwen3.6:latest', 'hermes3:latest', 'granite4.1:8b']

// Helper: call Google Gemini API (free tier, always works on Vercel)
async function callGemini(messages: any[]) {
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')
  const contents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const systemInstruction = systemMsg
    ? { parts: [{ text: systemMsg.content }] }
    : undefined

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })

  if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`)
  const data = await resp.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'
  return { content: text, model: 'gemini-2.5-flash' }
}

// Helper: call OmniRoute (free AI gateway, 90+ providers)
async function callOmniRoute(messages: any[]) {
  if (!OMNIROUTE_URL || !OMNIROUTE_KEY) throw new Error('OmniRoute not configured')
  const resp = await fetch(`${OMNIROUTE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OMNIROUTE_KEY}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!resp.ok) throw new Error(`OmniRoute error: ${resp.status}`)
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || 'No response generated.',
    model: OLLAMA_MODEL,
  }
}

// Helper: call local Ollama via tunnel (only works when PC is on)
async function callOllama(messages: any[]) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000) // 3s timeout — fail fast on Vercel
  try {
    const resp = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    })
    if (!resp.ok) throw new Error('Ollama unreachable')
    const data = await resp.json()
    return {
      content: data.choices?.[0]?.message?.content || 'No response generated.',
      model: OLLAMA_MODEL,
    }
  } finally {
    clearTimeout(timeout)
  }
}

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

    // 4-tier fallback chain: Ollama (local) → OmniRoute (free gateway) → Gemini (Google) → error
    let result: { content: string; model: string } | null = null
    let provider = ''

    // Tier 1: Local Ollama via tunnel (only when PC is on)
    try {
      result = await callOllama(messages)
      provider = 'ollama'
    } catch {
      // PC is off or Ollama unreachable — fall through
    }

    // Tier 2: OmniRoute (free AI gateway, 90+ providers)
    if (!result) {
      try {
        result = await callOmniRoute(messages)
        provider = 'omniroute'
      } catch {
        // OmniRoute down or not configured — fall through
      }
    }

    // Tier 3: Google Gemini (free tier, always works on Vercel)
    if (!result && GEMINI_API_KEY) {
      try {
        result = await callGemini(messages)
        provider = 'gemini'
      } catch {
        // Gemini failed too — fall through
      }
    }

    // Tier 4: Legacy fallback (if configured)
    if (!result && FALLBACK_API_URL && FALLBACK_API_KEY) {
      try {
        const resp = await fetch(FALLBACK_API_URL, {
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
        if (resp.ok) {
          const data = await resp.json()
          result = {
            content: data.choices?.[0]?.message?.content || 'No response generated.',
            model: FALLBACK_MODEL,
          }
          provider = 'legacy'
        }
      } catch {
        // All providers failed
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'AI service unavailable', detail: 'All AI providers failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      role: 'assistant',
      content: result.content,
      model: result.model,
      provider,
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