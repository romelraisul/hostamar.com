/**
 * KiloCode gateway client — OpenAI-compatible chat completions.
 *
 * Uses Token B (KILOCODE_API_KEY) via https://api.kilo.ai/api/gateway.
 * Model: kilo-auto/free (zero cost, resolves to tencent/hy3 or similar).
 *
 * This is separate from lib/kilo-client.ts which handles analytics tRPC
 * (Token A, kilo.ai, different base URL and auth scheme).
 */

const DEFAULT_BASE = 'https://api.kilo.ai/api/gateway'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionParams {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  stop?: string | string[]
}

export interface ChatCompletionChoice {
  index: number
  message: { role: string; content: string }
  finish_reason: string
}

export interface ChatCompletionUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  provider: string
  choices: ChatCompletionChoice[]
  usage: ChatCompletionUsage
}

export type ChatResult =
  | { ok: true; data: ChatCompletionResponse }
  | { ok: false; status: number; error: string; retryable: boolean }

function getBase(): string {
  return process.env.KILOCODE_BASE_URL || DEFAULT_BASE
}

function getToken(): string | null {
  const t = process.env.KILOCODE_API_KEY
  return t && t.trim().length > 0 ? t.trim() : null
}

export async function chatCompletion(
  params: ChatCompletionParams,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 60_000,
): Promise<ChatResult> {
  const token = getToken()
  if (!token) {
    return { ok: false, status: 503, error: 'KILOCODE_API_KEY not configured', retryable: false }
  }

  const base = getBase()
  const url = base + '/v1/chat/completions'

  const body = {
    model: params.model || 'kilo-auto/free',
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 4096,
    top_p: params.top_p,
    stream: false,
    stop: params.stop,
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })

    const text = await res.text().catch(() => '')

    if (!res.ok) {
      let errMsg = 'KiloCode HTTP ' + res.status
      try {
        const errJson = JSON.parse(text)
        errMsg = errJson.error?.message || errJson.message || errMsg
      } catch {}
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408
      return { ok: false, status: res.status, error: errMsg, retryable }
    }

    const parsed = JSON.parse(text) as ChatCompletionResponse
    return { ok: true, data: parsed }
  } catch (e: unknown) {
    const msg = e instanceof Error && e.name === 'AbortError'
      ? 'KiloCode timeout'
      : (e instanceof Error ? e.message : 'fetch error')
    return { ok: false, status: 504, error: msg, retryable: true }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Convenience: single-shot chat. Sends a prompt and returns the assistant text.
 */
export async function chat(
  prompt: string,
  system?: string,
  model = 'kilo-auto/free',
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; raw: ChatCompletionResponse } | { error: string; status: number }> {
  const messages: ChatMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const result = await chatCompletion({ model, messages }, fetchImpl)

  if (!result.ok) {
    return { error: result.error, status: result.status }
  }

  const text = result.data.choices[0]?.message?.content?.trim() ?? ''
  return { text, raw: result.data }
}
