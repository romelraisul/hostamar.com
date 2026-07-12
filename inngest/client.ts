// Inngest client for the Hostamar harness background/durable functions.
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'hostamar-harness',
  // Ollama/self-hosted only — no external event key required for dev/self-host.
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
})
