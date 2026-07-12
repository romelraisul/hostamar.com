'use client'

// app/admin/support/triage/page.tsx — Tier2 assisted triage inbox.
// Lists escalations (tier=2 SupportEvents) with the TriageAgent decision and
// Approve/Deny/Escalate controls wired to /api/admin/support/fix.
import { useCallback, useEffect, useState } from 'react'

interface Triage {
  probableCause: string
  confidence: number
  suggestedFix: string
  runbookLink: string
  needsHumanApproval: boolean
  destructive: boolean
}
interface InboxItem {
  id: string
  service: string
  check: string
  action: string
  result: string
  detail?: string | null
  createdAt: string
  triage: Triage | null
}
interface EventsResp {
  inbox: InboxItem[]
  recentAuto: any[]
}

export default function TriagePage() {
  const [data, setData] = useState<EventsResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support/events', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setMsg(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function act(id: string, decision: 'approve' | 'deny' | 'escalate', applyNow = false) {
    setBusy(id + decision)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/support/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supportEventId: id, decision, applyNow }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setMsg(`✅ ${decision} → ${json.action}${json.incidentId ? ` (Incident ${json.incidentId})` : ''}`)
      await load()
    } catch (e) {
      setMsg(`❌ ${String((e as Error).message || e)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tier 2 — Support Triage</h1>
        <button onClick={load} className="px-3 py-1 rounded bg-slate-800 text-white text-sm" disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {msg && <div className="mb-4 p-3 rounded bg-slate-100 text-sm">{msg}</div>}

      {data?.inbox?.length === 0 && <p className="text-slate-500">No escalations pending. 🎉</p>}

      <div className="grid gap-4">
        {data?.inbox?.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold uppercase">{item.service}</span>
                <span className="ml-2 text-sm text-slate-500">{item.check}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            {item.triage && (
              <div className="mt-2 text-sm">
                <p><b>Cause:</b> {item.triage.probableCause}</p>
                <p><b>Confidence:</b> {(item.triage.confidence * 100).toFixed(0)}%</p>
                <p><b>Suggested fix:</b> <code className="text-xs bg-slate-100 px-1 rounded">{item.triage.suggestedFix}</code></p>
                <p><b>Runbook:</b> <a className="text-blue-600" href={item.triage.runbookLink}>{item.triage.runbookLink}</a></p>
                {item.triage.destructive && <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">⚠ DESTRUCTIVE — needs approval</span>}
                {item.triage.needsHumanApproval && !item.triage.destructive && <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">needs human approval</span>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={() => act(item.id, 'approve', false)} disabled={busy === item.id + 'approve'} className="px-3 py-1 rounded bg-green-600 text-white text-sm">
                Approve Fix
              </button>
              <button onClick={() => act(item.id, 'deny')} disabled={busy === item.id + 'deny'} className="px-3 py-1 rounded bg-slate-300 text-sm">
                Deny
              </button>
              <button onClick={() => act(item.id, 'escalate')} disabled={busy === item.id + 'escalate'} className="px-3 py-1 rounded bg-red-600 text-white text-sm">
                Escalate → Tier3
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8">Recent Tier 1 auto-resolutions</h2>
      <div className="mt-2 text-xs text-slate-500">
        {data?.recentAuto?.slice(0, 10).map((e) => (
          <div key={e.id} className="border-b py-1">
            <span className="uppercase font-mono">{e.service}</span> · {e.check} → <b>{e.result}</b> · {new Date(e.createdAt).toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  )
}
