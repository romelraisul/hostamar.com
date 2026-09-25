'use client'

import { useEffect, useState } from 'react'

type SecurityDigest = {
  ok: boolean
  generatedAt: string
  wazuh: { indexer: 'up' | 'down'; manager: 'up' | 'down'; lastChecked: string }
  rateLimit: { last1h: number; last24h: number; topPaths: Array<{ path: string; count: number }> }
  auth: { failedLogins24h: number }
  securityEvents24h: number
  incidents: { open: number }
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-[#10B981]' : tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-red-300' : 'text-white'
  return (
    <div className="rounded-2xl bg-black border border-[#0E7C3A]/20 p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold font-mono ${toneClass}`}>{value}</div>
    </div>
  )
}

function Pill({ label, up }: { label: string; up: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${up ? 'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-[#10B981]' : 'bg-red-400'}`} />
      {label} {up ? 'up' : 'down'}
    </span>
  )
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityDigest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/security', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as SecurityDigest
        if (!cancelled) { setData(json); setError('') }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (loading) return <div className="p-10 text-center text-zinc-500">Loading security posture…</div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Security — Wazuh L7 &amp; Threat Digest</h1>
        <p className="text-sm text-zinc-400">
          Wazuh pipeline health, L7 rate-limit pressure, auth failures, and open incidents.
          {data?.generatedAt ? ` Updated ${new Date(data.generatedAt).toLocaleString()}.` : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
          Digest unavailable: {error}. The Wazuh scaffold lives in <span className="font-mono">infra/wazuh/</span>; start it to populate pipeline status.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Rate-limited (1h)" value={data ? String(data.rateLimit.last1h) : '—'} tone={data && data.rateLimit.last1h > 50 ? 'warn' : undefined} />
        <Stat label="Rate-limited (24h)" value={data ? String(data.rateLimit.last24h) : '—'} tone={data && data.rateLimit.last24h > 500 ? 'warn' : undefined} />
        <Stat label="Failed logins (24h)" value={data ? String(data.auth.failedLogins24h) : '—'} tone={data && data.auth.failedLogins24h > 20 ? 'bad' : undefined} />
        <Stat label="Open incidents" value={data ? String(data.incidents.open) : '—'} tone={data && data.incidents.open > 0 ? 'warn' : 'good'} />
      </div>

      <div className="rounded-2xl bg-black border border-[#0E7C3A]/20 p-5">
        <h2 className="text-sm font-semibold text-white">Wazuh pipeline</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Pill label="Indexer :9200" up={data?.wazuh.indexer === 'up'} />
          <Pill label="Manager API :55000" up={data?.wazuh.manager === 'up'} />
        </div>
        <p className="mt-3 font-mono text-xs text-zinc-500">
          Bring-up: cd infra/wazuh &amp;&amp; docker compose up -d &nbsp;•&nbsp; agent enrollment: see infra/wazuh/README.md
        </p>
      </div>

      <div className="rounded-2xl bg-black border border-[#0E7C3A]/20 p-5">
        <h2 className="text-sm font-semibold text-white">Top rate-limited paths (24h)</h2>
        {data && data.rateLimit.topPaths.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <thead className="border-b border-[#0E7C3A]/20 text-left text-zinc-500">
              <tr><th className="px-2 py-2">Path</th><th className="px-2 py-2 text-right">Events</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {data.rateLimit.topPaths.map((p) => (
                <tr key={p.path}>
                  <td className="px-2 py-2 font-mono text-zinc-300">{p.path}</td>
                  <td className="px-2 py-2 text-right font-mono text-zinc-400">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No rate-limit events in the last 24h.</p>
        )}
      </div>

      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 font-mono text-xs text-amber-200">
        L7 rules shipped in infra/wazuh/rules/hostamar_l7_rules.xml (custom rule IDs 100400-100499).
        Alerts land in the wazuh-alerts index; this page reads app DB posture and pings the pipeline live.
      </div>
    </div>
  )
}
