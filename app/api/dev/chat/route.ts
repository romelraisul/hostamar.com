import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6:latest'
const KAI9000_API_URL = process.env.KAI9000_API_URL || ''
const KAI9000_API_KEY=proces..._KEY || ''
const KAI9000_MODEL = process.env.KAI9000_MODEL || 'kai-9000'

async function callOllama(messages, model) {
  const response = await fetch(OLLAMA_HOST + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, temperature: 0.7, max_tokens: 1024 }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Ollama unreachable')
    throw new Error('Ollama failed: ' + response.status + ' ' + errorText)
  }
  const data = await response.json()
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : (data.content || 'No response generated.')
  return { reply, provider: 'ollama', model: model }
}

async function callKai9000(messages) {
  if (!KAI9000_API_URL) {
    throw new Error('KAI9000_API_URL is not configured')
  }
  const authHeader = KAI9000_API_KEY ? 'Bearer ' + KAI9000_API_KEY : undefined
  const response = await fetch(KAI9000_API_URL + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({ model: KAI9000_MODEL, messages, stream: false, temperature: 0.7, max_tokens: 1024 }),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Kai-9000 unreachable')
    throw new Error('Kai-9000 failed: ' + response.status + ' ' + errorText)
  }
  const data = await response.json()
  const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : (data.content || 'No response generated.')
  return { reply, provider: 'kai-9000', model: KAI9000_MODEL }
}

export async function POST(request: NextRequest) {
  try {
    const { tool, message, history } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    const systemPrompt = tool === 'kai' ? 'You are Kai, a developer assistant for Hostamar.com. Help with product tasks, debugging, and implementation guidance.' : 'You are Hostamar CEO assistant. Help with leadership tasks, strategic planning, and product decisions.'
    const messages = [{ role: 'system', content: systemPrompt }, ...(Array.isArray(history) ? history.slice(-10) : []), { role: 'user', content: message }]
    let result
    try {
      result = await callOllama(messages, OLLAMA_MODEL)
    } catch (ollamaError: any) {
      console.warn('Ollama fallback triggered:', ollamaError && ollamaError.message ? ollamaError.message : ollamaError)
      result = await callKai9000(messages)
    }
    return NextResponse.json({ role: 'assistant', content: result.reply, model: result.model, provider: result.provider, tool })
  } catch (error: any) {
    console.error('Dev chat error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error && error.message ? error.message : 'Unknown error' }, { status: 500 })
  }
}
