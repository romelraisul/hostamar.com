// ============================================================================
// ResearchAgent — a lean background agent with ONLY a web_search tool.
//
// The main harness ("claw") fans out N ResearchAgents per ticker/lead; they run
// concurrently (Promise.all / Inngest steps) and their results are aggregated.
//
// For the MVP, web_search is STUBBED to return 3 deterministic bullets so the
// fan-out is fully testable offline. Swap `webSearch` for a real SERP / Ollama
// tool-call when a provider is wired.
// ============================================================================
import { ollamaGenerate } from '@/lib/harness/ollama-client'

export interface ResearchResult {
  query: string
  bullets: string[]
  summary: string
}

/** STUB web_search — returns 3 mock bullets. Replace with a real search tool. */
export async function webSearch(query: string): Promise<string[]> {
  return [
    `${query}: strong local demand signal; 3 competitors within 2km, none with an online storefront.`,
    `${query}: average ticket size ৳150-400; peak orders Thu-Fri evenings (bakery segment).`,
    `${query}: no Google Business profile / weak SEO — clear opportunity for a Hostamar landing page.`,
  ]
}

export class ResearchAgent {
  constructor(id: string = 'research') {
    void id
  }

  async run(query: string): Promise<ResearchResult> {
    const bullets = await webSearch(query)
    // Try to synthesize a 1-line summary via Ollama; degrade to a join if down.
    let summary = ''
    try {
      summary = await ollamaGenerate(
        `Summarize these research bullets for a Bangladeshi small-business lead in ONE sentence (Bengali ok):\n${bullets
          .map((b, i) => `${i + 1}. ${b}`)
          .join('\n')}`,
        { temperature: 0.3, maxTokens: 120 },
      )
    } catch {
      summary = bullets[0]
    }
    if (!summary) summary = bullets[0]
    return { query, bullets, summary }
  }
}

/** Fan-out helper: run N research queries concurrently and aggregate. */
export async function fanOutResearch(queries: string[]): Promise<ResearchResult[]> {
  const agents = queries.map((_, i) => new ResearchAgent(`research-${i + 1}`))
  return Promise.all(agents.map((a, i) => a.run(queries[i])))
}
