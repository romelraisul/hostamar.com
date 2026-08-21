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
const TOKENROUTER_BASE = process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1'
const NVIDIA_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const OPENCODE_BASE = process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1'

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

function getTokenRouterToken(): string | null {
  const t = process.env.TOKENROUTER_API_KEY
  return t && t.trim().length > 0 ? t.trim() : null
}

function getNvidiaToken(): string | null {
  const t = process.env.NVIDIA_API_KEY
  return t && t.trim().length > 0 ? t.trim() : null
}

function getOpenCodeToken(): string | null {
  const t = process.env.OPENCODE_ZEN_API_KEY
  return t && t.trim().length > 0 ? t.trim() : null
}

async function chatCompletionWithProvider(
  base: string,
  token: string,
  model: string,
  params: ChatCompletionParams,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  providerLabel: string,
): Promise<ChatResult> {
  const url = base.replace(/\/$/, '') + '/v1/chat/completions'
  const body = {
    model,
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
      let errMsg = providerLabel + ' HTTP ' + res.status
      try {
        const errJson = JSON.parse(text)
        errMsg = errJson.error?.message || errJson.message || errMsg
      } catch {}
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408 || res.status === 403
      return { ok: false, status: res.status, error: errMsg, retryable }
    }
    const parsed = JSON.parse(text) as ChatCompletionResponse
    return { ok: true, data: parsed }
  } catch (e: unknown) {
    const msg = e instanceof Error && e.name === 'AbortError' ? providerLabel + ' timeout' : (e instanceof Error ? e.message : 'fetch error')
    return { ok: false, status: 504, error: msg, retryable: true }
  } finally {
    clearTimeout(timer)
  }
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

/**
 * 24/7 fallback chain: KiloCode (15 free) -> TokenRouter (2 free) -> NVIDIA (102) -> OpenCode
 * Tries each provider in order; on retryable error advances to next. Returns first success.
 * Uses free models only: kilo-auto/free, qwen/qwen3.8-max-free, nvidia/nemotron-3-nano-omni:free etc.
 */
export async function chatWithFallback(
  prompt: string,
  system?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; raw: ChatCompletionResponse; provider: string; model: string } | { error: string; status: number }> {
  const messages: ChatMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const chain: Array<{ label: string; base: string; token: string | null; model: string }> = [
    { label: 'KiloCode', base: getBase(), token: getToken(), model: 'kilo-auto/free' },
    { label: 'NVIDIA', base: NVIDIA_BASE, token: getNvidiaToken(), model: 'meta/llama-3.1-8b-instruct' },
    { label: 'TokenRouter', base: TOKENROUTER_BASE, token: getTokenRouterToken(), model: 'qwen/qwen3.8-max-free' },
    { label: 'OpenCode', base: OPENCODE_BASE, token: getOpenCodeToken(), model: 'hy3-free' },
  ]

  let lastError = { error: 'No provider configured', status: 503 }

  for (const p of chain) {
    if (!p.token) continue
    const res = await chatCompletionWithProvider(p.base, p.token, p.model, { messages }, fetchImpl, 15000, p.label)
    if (res.ok) {
      const text = res.data.choices[0]?.message?.content?.trim() ?? ''
      // Surface real model id from response
      const modelOut = (res.data as any).model || p.model
      return { text, raw: res.data, provider: p.label.toLowerCase(), model: modelOut }
    }
    lastError = { error: p.label + ': ' + res.error, status: res.status }
    if (!res.retryable) break
  }

  return lastError
}

/** List which providers are configured for the fallback chain (for /api/health diagnostics) */
export function getFallbackStatus(): Array<{ provider: string; configured: boolean; model: string }> {
  return [
    { provider: 'kilocode', configured: !!getToken(), model: 'kilo-auto/free' },
    { provider: 'nvidia', configured: !!getNvidiaToken(), model: 'meta/llama-3.1-8b-instruct' },
    { provider: 'tokenrouter', configured: !!getTokenRouterToken(), model: 'qwen/qwen3.8-max-free' },
    { provider: 'opencode', configured: !!getOpenCodeToken(), model: 'hy3-free' },
  ]
}
