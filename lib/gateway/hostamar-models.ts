export type HostamarModel = { id: string; base: string; context: string; last?: boolean }

export function getHostamarModels(latest1M: string[] = []): HostamarModel[] {
  const a = latest1M[0] || 'moonshotai/kimi-k3'
  const b = latest1M[1] || 'minimax/minimax-m1'
  const c = latest1M[2] || 'moonshotai/kimi-k2-0711-preview'
  return [
    { id: 'hostamar-1m-a', base: a, context: '1M' },
    { id: 'hostamar-1m-b', base: b, context: '1M' },
    { id: 'hostamar-1m-c', base: c, context: '1M' },
    { id: 'hostamar-own', base: 'qwen3:8b', context: '32k', last: true },
    { id: 'minimax-m3', base: 'qwen3.5:4b', context: '32k', last: true },
  ]
}

export async function fetchLatest1M(): Promise<string[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const models: any[] = data.data || []
    // filter context >= 1M (approx: context_length >= 1000000 or description contains 1M)
    const BAD = /(:free|-free$|-exp\b|-experimental|stealth\/|-preview$|-vision-exp)/i
    const filtered = models.filter((m: any) => {
      if (BAD.test(m.id || '')) return false
      const ctx = m.context_length || m.top_provider?.context_length || 0
      if (ctx >= 900000) return true
      const desc = (m.description || '').toLowerCase()
      return desc.includes('1m') || desc.includes('1000000')
    })
    filtered.sort((a: any, b: any) => (b.created || 0) - (a.created || 0))
    // stable well-known anchors first when present, then newest discoveries
    const ids = filtered.map((m: any) => m.id).filter(Boolean)
    const anchors = ['moonshotai/kimi-k3', 'minimax/minimax-m1', 'moonshotai/kimi-k2-0711-preview']
    const ordered = [...anchors.filter(a => ids.includes(a)), ...ids.filter(i => !anchors.includes(i))]
    return ordered.slice(0, 3)
  } catch {
    return []
  }
}
