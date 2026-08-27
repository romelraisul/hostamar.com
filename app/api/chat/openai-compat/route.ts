import { NextRequest } from 'next/server'
import { getGatewayKey } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/chat/openai-compat
 * OpenAI-compatible proxy to Vercel AI Gateway — vanilla fetch without ai SDK
 * Body: { model, messages: [{role, content}], temperature?, max_tokens? }
 * Example: curl -X POST https://hostamar.com/api/chat/openai-compat -H "Content-Type: application/json" -d '{"model":"google/gemini-2.5-flash-lite","messages":[{"role":"user","content":"Summarize Hostamar"}]}'
 */
export async function POST(req: NextRequest) {
  const key = getGatewayKey()
  if (!key) return Response.json({ error: 'AI_GATEWAY_API_KEY not set (or VERCEL_OIDC_TOKEN missing)' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const model = body?.model || 'google/gemini-2.5-flash-lite'
  const messages = body?.messages
  if (!Array.isArray(messages) || !messages.length) return Response.json({ error: 'messages[] required' }, { status: 400 })

  const upstream = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 512,
      stream: false,
    }),
  })

  const data = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return Response.json({ error: data || { message: `gateway ${upstream.status}` } }, { status: upstream.status })
  }
  return Response.json(data)
}
