// 50+ AI services catalog — shared client types + fetch helper.
// Catalog API: /api/services/catalog (public, returns {total, services}).

export interface CatalogService {
  id: string
  name: string
  nameBn: string
  category: string
  categoryBn: string
  creditCost: number
  dollarRange?: string | null
  benefit: string
  benefitBn: string
  perfectFor: string
  perfectForBn: string
  icon: string
  isActive?: boolean
}

export interface CatalogResponse {
  success: boolean
  total: number
  services: CatalogService[]
}

// Icons are stored double-escaped ("\\uD83C\\uDFA8") in the DB — decode safely.
export function decodeIcon(raw: string | undefined | null): string {
  if (!raw) return '✨'
  try {
    const out = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    // combine surrogate pairs produced by fromCharCode
    return out.replace(/([\uD800-\uDBFF])([\uDC00-\uDFFF])/g, (_m, hi, lo) =>
      String.fromCharCode(((hi.charCodeAt(0) - 0xd800) << 10) + (lo.charCodeAt(0) - 0xdc00) + 0x10000)
    )
  } catch {
    return raw || '✨'
  }
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const res = await fetch('/api/services/catalog', { cache: 'no-store' })
  if (!res.ok) throw new Error(`catalog ${res.status}`)
  return res.json()
}
