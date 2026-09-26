export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const pk = process.env.MEDUSA_PK || 'pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad'
  const targets: Record<string, any> = {}
  const bases: string[] = ['https://store.hostamar.com']
  if (process.env.MEDUSA_URL) bases.push(process.env.MEDUSA_URL)
  for (const base of bases) {
    try {
      const r = await fetch(`${base}/store/carts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': pk, 'user-agent': 'HostamarStorefront/1.0 (Vercel SSR)' },
        body: JSON.stringify({ region_id: 'reg_01M27QBX4C3XKZFWCQD47CM2EJ', items: [], email: 'probe@x.com' }),
        signal: AbortSignal.timeout(12000),
      })
      const t = await r.text()
      targets[base] = { status: r.status, body: t.slice(0, 200) }
    } catch (e: any) { targets[base] = { error: String(e?.message || e).slice(0, 200) } }
  }
  return new Response(JSON.stringify(targets, null, 2), { headers: { 'Content-Type': 'application/json' } })
}
