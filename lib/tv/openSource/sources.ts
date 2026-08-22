/**
 * Open-source video sources (all legal to rebroadcast with Bangla dub):
 *  - NASA images API (public domain, U.S. gov work)
 *  - Prelinger Archives via archive.org (public domain)
 *  - Blender open movies (CC-BY)
 * Serverless-safe: fetch-only, no disk writes.
 */

export type SourceCandidate = {
  id: string
  source: "NASA" | "PRELINGER" | "BLENDER"
  externalId: string
  title: string
  description?: string
  downloadUrl: string
  license: string
  licenseUrl?: string
  durationSec?: number
  thumbnail?: string
}

const UA = "HostamarTV/1.0 (educational Bangla dubbing)"

async function getJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, cache: "no-store" })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (await r.json()) as T
  } finally {
    clearTimeout(t)
  }
}

export async function searchNasa(q: string, limit = 8): Promise<SourceCandidate[]> {
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=video&year_start=2018`
  const data = await getJson<any>(url)
  const items: any[] = (data?.collection?.items || []).slice(0, limit)
  const out: SourceCandidate[] = []
  for (const item of items) {
    const d = item?.data?.[0]
    const nid = d?.nasa_id
    if (!nid) continue
    try {
      const assets = await getJson<any>(`https://images-api.nasa.gov/asset/${encodeURIComponent(nid)}`)
      const mp4s: string[] = (assets?.collection?.items || [])
        .map((i: any) => i?.href || "")
        .filter((u: string) => u.toLowerCase().endsWith(".mp4"))
      if (!mp4s.length) continue
      mp4s.sort((a: string, b: string) => {
        const rank = (u: string) => (u.toLowerCase().includes("mobile") || u.toLowerCase().includes("medium") ? 0 : 1)
        return rank(a) - rank(b)
      })
      const thumb = (assets?.collection?.items || []).map((i: any) => i?.href || "").find((u: string) => u.endsWith("~thumb.jpg")) || undefined
      out.push({
        id: `nasa-${nid}`,
        source: "NASA",
        externalId: nid,
        title: String(d.title || nid).slice(0, 160),
        description: String(d.description || "").slice(0, 400),
        downloadUrl: mp4s[0],
        license: "Public Domain (NASA)",
        licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        thumbnail: thumb,
      })
    } catch {
      continue
    }
  }
  return out
}

export async function searchPrelinger(q: string, limit = 8): Promise<SourceCandidate[]> {
  const query = q ? `collection:(prelinger) AND title:(${q})` : "collection:(prelinger)"
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl%5B%5D=identifier&fl%5B%5D=title&rows=${limit}&page=1&output=json`
  const data = await getJson<any>(url)
  const docs: any[] = data?.response?.docs || []
  const out: SourceCandidate[] = []
  for (const doc of docs) {
    const ident = doc?.identifier
    if (!ident) continue
    try {
      const meta = await getJson<any>(`https://archive.org/metadata/${ident}`)
      const mp4s: any[] = (meta?.files || []).filter((f: any) => (f?.name || "").toLowerCase().endsWith(".mp4"))
      if (!mp4s.length) continue
      mp4s.sort((a: any, b: any) => Number(a?.size || 0) - Number(b?.size || 0))
      const f = mp4s[0]
      if (Number(f?.size || 0) > 220 * 1024 * 1024) continue
      out.push({
        id: `prelinger-${ident}`,
        source: "PRELINGER",
        externalId: ident,
        title: String(doc.title || ident).slice(0, 160),
        downloadUrl: `https://archive.org/download/${ident}/${encodeURIComponent(f.name)}`,
        license: "Public Domain (Prelinger Archives)",
        licenseUrl: "https://archive.org/details/prelinger",
        thumbnail: `https://archive.org/services/img/${ident}`,
      })
    } catch {
      continue
    }
  }
  return out
}

const BLENDER_FILMS = [
  { externalId: "BigBuckBunny_124", title: "Big Buck Bunny", license: "CC-BY 3.0" },
  { externalId: "Sintel", title: "Sintel", license: "CC-BY 3.0" },
  { externalId: "ElephantsDream", title: "Elephants Dream", license: "CC-BY 2.5" },
  { externalId: "TearsOfSteel", title: "Tears of Steel", license: "CC-BY 3.0" },
]

export async function searchBlender(q: string): Promise<SourceCandidate[]> {
  const out: SourceCandidate[] = []
  for (const film of BLENDER_FILMS) {
    if (q && !film.title.toLowerCase().includes(q.toLowerCase())) continue
    try {
      const meta = await getJson<any>(`https://archive.org/metadata/${film.externalId}`)
      const mp4s: any[] = (meta?.files || []).filter((f: any) => (f?.name || "").toLowerCase().endsWith(".mp4"))
      if (!mp4s.length) continue
      mp4s.sort((a: any, b: any) => Number(a?.size || 0) - Number(b?.size || 0))
      const f = mp4s[0]
      if (Number(f?.size || 0) > 220 * 1024 * 1024) continue
      out.push({
        id: `blender-${film.externalId}`,
        source: "BLENDER",
        externalId: film.externalId,
        title: film.title,
        downloadUrl: `https://archive.org/download/${film.externalId}/${encodeURIComponent(f.name)}`,
        license: `${film.license} (Blender Foundation)`,
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        thumbnail: `https://archive.org/services/img/${film.externalId}`,
      })
    } catch {
      continue
    }
  }
  return out
}

export async function searchAllSources(q: string, source?: string): Promise<SourceCandidate[]> {
  const jobs: Promise<SourceCandidate[]>[] = []
  const want = (source || "ALL").toUpperCase()
  if (want === "ALL" || want === "NASA") jobs.push(searchNasa(q || "earth science").catch(() => []))
  if (want === "ALL" || want === "PRELINGER") jobs.push(searchPrelinger(q).catch(() => []))
  if (want === "ALL" || want === "BLENDER") jobs.push(searchBlender(q).catch(() => []))
  const settled = await Promise.all(jobs)
  return settled.flat()
}
