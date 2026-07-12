// ============================================================================
// research-fanout — durable background research fan-out via Inngest steps.
// Triggered by event 'harness/research.fanout' with { queries: string[] }.
// Each query runs as its own step (retryable, observable), then aggregated.
// ============================================================================
import { inngest } from '@/inngest/client'
import { ResearchAgent, ResearchResult } from '@/lib/agents/ResearchAgent'

export const researchFanout = inngest.createFunction(
  { id: 'research-fanout', name: 'Harness Research Fan-out', triggers: [{ event: 'harness/research.fanout' }] },
  async ({ event, step }) => {
    const queries: string[] = event.data?.queries || []
    const results: ResearchResult[] = []
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i]
      const r = await step.run(`research-${i + 1}`, async () => {
        const agent = new ResearchAgent(`research-${i + 1}`)
        return agent.run(q)
      })
      results.push(r as ResearchResult)
    }
    return { count: results.length, results }
  },
)
