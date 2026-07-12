// ============================================================================
// FoundryMemoryProvider — durable fine-grained memory (Foundry pattern).
//
// • Coarse memory: agent explicitly writes Markdown files to
//   working/agent-file-memory/<sessionId>/ (watchlist.md, reports/*.md).
// • Fine memory: a Qdrant collection `hostamar_memory` stores extracted facts
//   as vectors (Ollama nomic-embed-text). Facts like "user prefers low-risk"
//   are auto-extracted from conversation and recalled on new sessions.
// ============================================================================
import { ollamaEmbed } from '@/lib/harness/ollama-client'

const QDRANT_URL = (process.env.QDRANT_PUBLIC_URL || 'http://localhost:8200').replace(/\/$/, '')
const COLLECTION = 'hostamar_memory'
const VECTOR_SIZE = 768 // nomic-embed-text dimension

export interface MemoryFact {
  id: string
  text: string
  sessionId?: string
  createdAt: string
}

async function ensureCollection(): Promise<void> {
  try {
    const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, { method: 'GET' })
    if (res.ok) return
  } catch {
    /* fall through to create */
  }
  await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    }),
  }).catch(() => undefined)
}

/** Extract candidate facts from a piece of conversation text. */
export function extractFacts(text: string): string[] {
  const facts: string[] = []
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const patterns = [
    /user prefers? (.+)/i,
    /(saving|save) (for|to) (.+)/i,
    /(want|wants|need|needs) (a|an|to) (.+)/i,
    /(budget|risk) (is|are|:) (.+)/i,
    /(prefer|prefers|like|likes) (.+)/i,
  ]
  for (const line of lines) {
    for (const p of patterns) {
      const m = line.match(p)
      if (m) {
        facts.push(line)
        break
      }
    }
  }
  return [...new Set(facts)].slice(0, 10)
}

export class FoundryMemoryProvider {
  async storeFact(text: string, sessionId?: string): Promise<void> {
    try {
      await ensureCollection()
      const vec = await ollamaEmbed(text)
      const id = `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [
            {
              id,
              vector: vec,
              payload: { text, sessionId: sessionId || null, createdAt: new Date().toISOString() },
            },
          ],
        }),
      })
    } catch {
      /* memory is best-effort; never block the agent */
    }
  }

  async recall(query: string, k = 5): Promise<MemoryFact[]> {
    try {
      const vec = await ollamaEmbed(query)
      const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector: vec, limit: k, with_payload: true }),
      })
      if (!res.ok) return []
      const data = (await res.json()) as {
        result: { id: string; payload?: { text?: string; sessionId?: string; createdAt?: string } }[]
      }
      return (data.result || []).map((r) => ({
        id: String(r.id),
        text: r.payload?.text || '',
        sessionId: r.payload?.sessionId,
        createdAt: r.payload?.createdAt || '',
      }))
    } catch {
      return []
    }
  }

  /** Persist coarse memory (explicit Markdown) via the file store root. */
  async writeCoarseMemory(sessionId: string, filename: string, content: string): Promise<string> {
    const fs = await import('fs/promises')
    const path = await import('path')
    const dir = path.resolve(process.cwd(), 'working', 'agent-file-memory', sessionId)
    await fs.mkdir(dir, { recursive: true })
    const file = path.join(dir, filename)
    await fs.writeFile(file, content, 'utf8')
    return file
  }
}

export { COLLECTION as MEMORY_COLLECTION }
