// ============================================================================
// Ollama client — wraps the self-hosted Ollama chat API on the tunnel.
// Used by HarnessAgent and ResearchAgent. Degrades gracefully on failure.
// ============================================================================
const GEN_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
const OLLAMA_URL = (process.env.OLLAMA_PUBLIC_URL || 'http://localhost:11434').replace(/\/$/, '')

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export async function ollamaGenerate(
  prompt: string,
  opts?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts?.model || GEN_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: opts?.temperature ?? 0.4,
          num_predict: opts?.maxTokens ?? 800,
        },
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`ollama ${res.status}`)
    const data = (await res.json()) as { response?: string }
    return (data.response || '').trim()
  } finally {
    clearTimeout(t)
  }
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) throw new Error(`embed ${res.status}`)
  const data = (await res.json()) as { embeddings: number[][] }
  return data.embeddings[0]
}

export { OLLAMA_URL, GEN_MODEL, EMBED_MODEL }
