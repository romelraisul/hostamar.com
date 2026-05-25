import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LRUCache } from '@/lib/cache'

// ---------------------------------------------------------------------------
// In-memory embedding cache: key = video.id, value = number[]
// Stored in memory – no schema changes needed; survives serverless warm starts.
// ---------------------------------------------------------------------------
const embeddingCache = new LRUCache<string, number[]>({
  max: 5_000,
  ttl: 60 * 60 * 1000, // 1 hour
})

// ---------------------------------------------------------------------------
// Ollama embedding helper
// ---------------------------------------------------------------------------
const OLLAMA_URL = 'http://localhost:11435/api/embeddings'
const OLLAMA_MODEL = 'hermes3:latest'

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Ollama embedding error (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error('Ollama returned no embedding array')
  }
  return data.embedding as number[]
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ---------------------------------------------------------------------------
// Build a combined text field from a video record for embedding
// ---------------------------------------------------------------------------
function videoText(video: {
  title: string
  description?: string | null
  prompt?: string | null
  script?: string | null
}): string {
  return [video.title, video.description, video.prompt, video.script]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// POST /api/search
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const query = (body.query ?? '').trim()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // 1. Generate embedding for the user's query
    let queryEmbedding: number[]
    try {
      queryEmbedding = await getEmbedding(query)
    } catch (ollamaErr: any) {
      console.error('[search] Ollama error:', ollamaErr.message)
      return NextResponse.json(
        { error: 'Failed to generate embedding. Is Ollama running on port 11435?' },
        { status: 503 },
      )
    }

    // 2. Fetch all videos
    const videos = await prisma.video.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        prompt: true,
        script: true,
        thumbnailUrl: true,
        url: true,
        duration: true,
        language: true,
        createdAt: true,
        customerId: true,
      },
    })

    if (videos.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // 3. Compute similarity for each video (embed on-the-fly with cache)
    const scored: Array<{ video: (typeof videos)[number]; score: number }> = []

    for (const video of videos) {
      // Get or compute embedding for this video's text
      let videoEmb = embeddingCache.get(video.id)
      if (!videoEmb) {
        const text = videoText(video)
        if (!text) continue // skip videos with no searchable text
        try {
          videoEmb = await getEmbedding(text)
          embeddingCache.set(video.id, videoEmb)
        } catch {
          continue // skip videos that fail embedding
        }
      }

      const score = cosineSimilarity(queryEmbedding, videoEmb)
      scored.push({ video, score })
    }

    // 4. Sort descending by similarity, take top 50
    scored.sort((a, b) => b.score - a.score)
    const topResults = scored.slice(0, 50).map(({ video, score }) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      url: video.url,
      duration: video.duration,
      language: video.language,
      createdAt: video.createdAt,
      customerId: video.customerId,
      score: Math.round(score * 10000) / 10000,
    }))

    return NextResponse.json({ results: topResults, query })
  } catch (error: any) {
    console.error('[search] Error:', error.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
