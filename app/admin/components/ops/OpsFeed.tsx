'use client'
import { useMemo, useState } from 'react'
import type { OpsEvent } from './types'
import { sev, relTime } from './shared'

// LIVE feed: severity colors, lane chip + relative time, type + lane filters,
// LIVE pulse, graceful empty/loading/error states.
export default function OpsFeed({
  events,
  err,
  laneNames,
  loading,
}: {
  events: OpsEvent[]
  err?: string
  laneNames: string[]
  loading?: boolean
}) {
  const [type, setType] = useState('all')
  const [lane, setLane] = useState('all')

  const types = useMemo(() => ['all', ...Array.from(new Set(events.map((e) => e.type))).sort()], [events])
  const lanes = useMemo(() => {
    const fromEvents = events.map((e) => e.lane)
    return ['all', ...Array.from(new Set([...laneNames, ...fromEvents].filter(Boolean))).sort()]
  }, [events, laneNames])

  const filtered = events.filter(
    (e) => (type === 'all' || e.type === type) && (lane === 'all' || e.lane === lane),
  )

  return (
    <div className="rounded-2xl bg-[#1C1917] border border-[#0E7C3A]/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#0E7C3A]/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <h3 className="font-semibold text-white text-sm">LIVE FEED</h3>
          <span className="text-[10px] text-zinc-600 font-mono">10s</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-2 py-1.5 rounded-lg bg-[#1C1917] border border-zinc-800 text-xs text-white">
            {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
          </select>
          <select value={lane} onChange={(e) => setLane(e.target.value)} className="px-2 py-1.5 rounded-lg bg-[#1C1917] border border-zinc-800 text-xs text-white">
            {lanes.map((l) => <option key={l} value={l}>{l === 'all' ? 'All lanes' : l}</option>)}
          </select>
          <span className="text-[11px] text-zinc-500">{filtered.length}/{events.length}</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5 max-h-96 overflow-y-auto">
        {filtered.map((e) => {
          const s = sev(e.severity)
          return (
            <div key={e.id} className={`flex gap-3 px-3 py-2 rounded-lg border ${s.border} ${s.bg}`}>
              <span className={`mt-1.5 w-2 h-2 rounded-full ${s.dot} shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{e.lane}</span>
                  <span className={`text-[10px] font-semibold tracking-wide ${s.text}`}>{e.type}</span>
                  <span className="text-sm text-white font-medium">{e.title}</span>
                  <span className="ml-auto text-[10px] text-zinc-600 font-mono whitespace-nowrap">{relTime(e.createdAt)}</span>
                </div>
                {e.body && <div className="text-[11px] text-zinc-400 mt-0.5 whitespace-pre-wrap break-words">{String(e.body).slice(0, 400)}</div>}
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div className="p-8 text-center text-sm">
            {err ? <span className="text-red-300">{err}</span>
              : loading ? <span className="text-zinc-500">Loading live feed…</span>
              : events.length ? <span className="text-zinc-600">No events match this filter.</span>
              : <span className="text-zinc-600">No events yet — the fleet posts here on each run.</span>}
          </div>
        )}
      </div>
    </div>
  )
}
