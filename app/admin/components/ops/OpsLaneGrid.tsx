'use client'
import { useState } from 'react'
import { Pause, Play, ChevronRight } from 'lucide-react'
import type { OpsLane } from './types'
import { ageLabel } from './shared'

function verdictStyle(v?: string | null) {
  if (!v) return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  const s = v.toUpperCase()
  if (s.includes('HEALTHY') || s.includes('OK') || s.includes('SUCCESS')) return 'bg-[#0E7C3A]/30 text-[#10B981] border-[#10B981]/30'
  if (s.includes('ALERT') || s.includes('FAIL') || s.includes('ERROR')) return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
}

function autonomyStyle(a?: string | null) {
  switch ((a || 'autonomous')) {
    case 'supervised': return 'bg-sky-500/10 text-sky-300 border-sky-500/30'
    case 'halted': return 'bg-red-500/10 text-red-300 border-red-500/30'
    default: return 'bg-[#0E7C3A]/10 text-[#10B981] border-[#10B981]/30'
  }
}

function dotStyle(l: OpsLane) {
  if (l.paused) return 'bg-amber-400'
  const v = (l.verdict || '').toUpperCase()
  if (!l.verdict) return 'bg-zinc-600'
  if (v.includes('ALERT') || v.includes('FAIL') || v.includes('ERROR')) return 'bg-red-500'
  if (v.includes('HEALTHY') || v.includes('OK') || v.includes('SUCCESS')) return 'bg-[#10B981] animate-pulse'
  return 'bg-amber-400'
}

// Lane grid: 16 employee cards with last-run age, verdict badge, autonomy chip
// and an optimistic Pause/Resume button.
export default function OpsLaneGrid({
  lanes,
  loading,
  err,
  onSelect,
  onToggle,
}: {
  lanes: OpsLane[]
  loading?: boolean
  err?: string
  onSelect: (employee: string) => void
  onToggle: (lane: OpsLane) => Promise<unknown>
}) {
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = async (l: OpsLane) => {
    setBusy(l.employee)
    try { await onToggle(l) } catch { /* parent already reverted + alerted */ }
    finally { setBusy(null) }
  }

  if (!lanes.length) {
    return (
      <div className="rounded-2xl bg-black border border-[#0E7C3A]/20 p-10 text-center">
        {err ? <div className="text-sm text-red-300">{err}</div>
          : loading ? <div className="text-sm text-zinc-500">Loading lanes…</div>
          : <div className="text-sm text-zinc-600">No fleet lanes registered yet — they appear once employees post their first run.</div>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.2em] text-zinc-500">LANES · {lanes.length}</div>
        <div className="text-[10px] text-zinc-600">{lanes.filter((l) => !l.paused).length} active · {lanes.filter((l) => l.paused).length} paused</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {lanes.map((l) => (
          <div key={l.employee} className={`rounded-xl bg-black border p-3 transition ${l.paused ? 'border-amber-500/30' : 'border-zinc-800 hover:border-[#10B981]/30'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotStyle(l)}`} />
                <span className="text-sm font-bold text-white truncate">{l.employee}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0 ${autonomyStyle(l.autonomy)}`}>{(l.autonomy || 'autonomous').toUpperCase()}</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">{l.role || '—'}</div>
            <div className="text-[10px] text-zinc-600 truncate">{l.schedule || 'no schedule'}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${verdictStyle(l.verdict)}`}>{l.verdict || 'no verdict'}</span>
              <span className="text-[10px] text-zinc-600 font-mono ml-auto">{ageLabel(l.ageMinutes)}</span>
            </div>
            {l.lastSnippet && <div className="text-[11px] text-zinc-400 mt-2 line-clamp-2 break-words">{l.lastSnippet}</div>}
            {l.paused && <div className="text-[10px] text-amber-300 mt-2">⏸ paused — runs disabled by control sync</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => onSelect(l.employee)} className="flex-1 py-1.5 rounded-lg border border-zinc-700 text-[11px] text-zinc-300 hover:border-[#10B981] hover:text-white transition flex items-center justify-center gap-1">
                Details<ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggle(l)}
                disabled={busy === l.employee}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition disabled:opacity-50 ${l.paused ? 'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#0E7C3A]/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'}`}
              >
                <span className="inline-flex items-center justify-center gap-1">
                  {l.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  {busy === l.employee ? '…' : l.paused ? 'Resume' : 'Pause'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
