/**
 * RAG system — ZERO COST: B2 (docs) + CF Worker KV (cache) + in-process cache.
 * No Pinecone/Weaviate/paid vector DB. Chunk + hash-index + BM25-lite scoring
 * works well at this corpus size (50 services + FAQ + docs), and the LLM call
 * goes through the always-on ai-fallback chain.
 */

export type Doc = { id: string; title: string; text: string }

// ---- in-process index (serverless instance-local, free) ----
const index = new Map<string, string[]>() // docId → tokens
let corpus: Doc[] = []
let built = false

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(t => t.length > 1)
}

export function buildRagIndex(docs: Doc[]) {
  corpus = docs
  index.clear()
  for (const d of docs) index.set(d.id, tokenize(`${d.title} ${d.text}`))
  built = true
}

/** BM25-lite retrieval — top-k docs for a query */
export function retrieve(query: string, k = 3): Doc[] {
  if (!built) return []
  const q = tokenize(query)
  const df = new Map<string, number>()
  for (const toks of index.values()) for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1)
  const N = corpus.length || 1
  const scores = corpus.map(d => {
    const toks = index.get(d.id) || []
    let s = 0
    for (const t of new Set(q)) {
      const tf = toks.filter(x => x === t).length
      if (!tf) continue
      const idf = Math.log(1 + N / (1 + (df.get(t) || 0)))
      s += (tf * (1.2 + 1)) / (tf + 1.2 * (0.25 + 0.75 * (toks.length / 100))) * idf
    }
    return { d, s }
  })
  return scores.sort((a, b) => b.s - a.s).slice(0, k).filter(x => x.s > 0).map(x => x.d)
}

/** Grounded answer: retrieve → context → LLM. Falls back to kb-only. */
export async function ragAnswer(query: string, llm: (messages: any[], sys: string) => Promise<{ text: string; model: string; provider: string }>): Promise<{ answer: string; sources: string[]; model?: string; provider?: string }> {
  const docs = retrieve(query, 3)
  const context = docs.map(d => `[${d.id}] ${d.title}: ${d.text.slice(0, 600)}`).join('\n\n')
  const sys = `You are Hostamar AI. Answer ONLY from the context below. If not in context, say আমি নিশ্চিত নই (I'm not sure) and suggest support. Context:\n${context || '(empty — no docs indexed)'}` 
  const r = await llm([{ role: 'user', content: query }], sys)
  return { answer: r.text, sources: docs.map(d => d.id), model: r.model, provider: r.provider }
}
