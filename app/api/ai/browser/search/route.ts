import { NextRequest, NextResponse } from 'next/server'

const SEARXNG_BASE = process.env.SEARXNG_BASE_URL || 'http://localhost:5013'
const SEARXNG_PATH = '/search'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
}

async function searchSearXNG(query: string, maxResults = 8) {
  const url = new URL(SEARXNG_PATH, SEARXNG_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('engines', 'google,bing,duckduckgo,wikipedia')
  url.searchParams.set('language', 'en')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 0 },
    })
    clearTimeout(timeout)
    if (!res.ok) {
      return []
    }
    const data = (await res.json()) as any
    const items = Array.isArray(data?.results) ? data.results : []
    const seen = new Set<string>()
    const out: Array<{ title: string; url: string; snippet?: string }> = []
    for (const item of items) {
      const link = typeof item.url === 'string' ? item.url : ''
      const cleanTitle = typeof item.title === 'string' ? item.title : ''
      if (!link || seen.has(link)) continue
      seen.add(link)
      out.push({
        title: cleanTitle || link,
        url: link,
        snippet: typeof item.content === 'string' ? item.content : undefined,
      })
      if (out.length >= maxResults) break
    }
    return out
  } catch {
    return []
  }
}

async function summarizeWithOllama(
  query: string,
  results: Array<{ title: string; url: string; snippet?: string }>,
) {
  const items = results.slice(0, 8)
  if (!items.length) return ''
  const bullets = items
    .map((r, idx) => `${idx + 1}) ${r.title.replace(/<\/?[^>]+(>|$)/g, '')} — ${r.url}`)
    .join('\n')
  const prompt = `You are a concise research assistant. User asked: "${query}". Based on these search results, write 3 short bullets and 1 sentence answering the user's intent. Do not invent URLs.\n\nResults:\n${bullets}\n\nRespond in the same language as the query when obvious; otherwise English.`

  try {
    const ollamaHost =
      process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const url = `${ollamaHost.replace(/\/+$/, '')}/api/generate`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'qwen3.6:27b',
        prompt,
        stream: false,
        options: { num_predict: 260, temperature: 0.3 },
      }),
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`ollama ${res.status}`)
    const data = (await res.json()) as any
    const text = String(data.response || '').trim()
    if (text) return text
  } catch {
    // keep it optional — the source links are primary output
  }
  return ''
}

function extractCustomerId(req: NextRequest) {
  const header = req.headers.get('x-user-id') || req.headers.get('x-customer-id') || ''
  const cookie = req.cookies.get('customerId')?.value || ''
  const cleaned = header || cookie
  if (/^[0-9a-f-]{36}$/i.test(cleaned)) return cleaned
  return null
}

export async function GET(request: NextRequest) {
  return runQuery(request)
}

export async function POST(request: NextRequest) {
  return runQuery(request)
}

async function runQuery(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim()
  const sessionId = extractCustomerId(request)
  if (!query) {
    return NextResponse.json({ ok: false, error: 'missing_query', results: [] }, { headers: CORS_HEADERS })
  }

  const results = await searchSearXNG(query)
  const summary = await summarizeWithOllama(query, results)
  const payload =
    process.env.OLLAMA_MODEL || process.env.OLLAMA_HOST
      ? { summary }
      : { summary: null }

  return NextResponse.json(
    {
      ok: results.length > 0,
      query,
      provider: 'searxng',
      count: results.length,
      results,
      ...payload,
    },
    { headers: CORS_HEADERS },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS })
}
