type GuardState = { fails: number; blockedUntil: number }

const circuit = new Map<string, GuardState>()
const LIMIT = 120000 // nvidia context limit
const BLOCK_MS = 60_000

export function countTokens(text: string): number {
  // rough: 1 token ~4 chars
  return Math.ceil(text.length / 4)
}

export function estimateMessagesTokens(messages: { content: string }[]): number {
  return messages.reduce((n, m) => n + countTokens(m.content || ''), 0) + 20
}

export function isBlocked(model: string): boolean {
  const s = circuit.get(model)
  if (!s) return false
  if (Date.now() < s.blockedUntil) return true
  return false
}

export function markSuccess(model: string) {
  circuit.delete(model)
}

export function markFail(model: string, status: number) {
  if (status === 429 || status === 402) {
    const cur = circuit.get(model) || { fails: 0, blockedUntil: 0 }
    cur.fails += 1
    cur.blockedUntil = Date.now() + BLOCK_MS * Math.min(cur.fails, 5)
    circuit.set(model, cur)
  }
}

export async function shouldUseNvidia(model: string, messages: any[]): Promise<{ useNvidia: boolean; reason?: string }> {
  if (isBlocked(model)) return { useNvidia: false, reason: 'circuit open' }
  const tokens = estimateMessagesTokens(messages)
  if (tokens > LIMIT) return { useNvidia: false, reason: `tokens ${tokens} > ${LIMIT}` }
  return { useNvidia: true }
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let last: any
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e: any) {
      last = e
      const status = e?.status || 0
      if (status !== 429 && status !== 402 && status !== 500) throw e
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  throw last
}

export function getGuardStats() {
  return Object.fromEntries(circuit.entries())
}
