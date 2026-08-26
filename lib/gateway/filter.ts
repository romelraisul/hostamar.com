export const isFree = (id: string) => /:free$/i.test(id) || /\/free$/i.test(id) || /-free$/i.test(id)
export const isHostamar = (id: string) => id.startsWith('hostamar-')
export const isNvidia = (id: string) => id.toLowerCase().includes('nvidia')
const FREE_ONLY_PROVIDERS = ['opencode', 'kilocode', 'tokenrouter']

const providerOf = (m: { id: string; provider?: string }) => {
  const p = (m.provider || '').toLowerCase()
  if (p) return p
  return m.id.split('/')[0].toLowerCase()
}

export const shouldKeep = (m: { id: string; provider?: string }) => {
  if (isHostamar(m.id)) return true
  if (isNvidia(m.id)) return true
  const p = providerOf(m)
  // opencode/kilocode/tokenrouter: ONLY :free models — paid never slip in,
  // whether tagged by provider field or by vendor prefix in the id itself.
  if (FREE_ONLY_PROVIDERS.includes(p)) return isFree(m.id)
  if (FREE_ONLY_PROVIDERS.some(v => m.id.toLowerCase().includes(v))) return isFree(m.id)
  if (isFree(m.id)) return true
  // keep 1M paid models like kimi-k3, minimax-m1, etc.
  return true
}

export function filterModels<T extends { id: string; provider?: string }>(models: T[]): T[] {
  return models.filter(shouldKeep)
}
