'use client'
import { useEffect, useState } from 'react'
import { X, Pause, Play, Send, RefreshCw } from 'lucide-react'
import type { OpsLane, OpsEvent } from './types'
import { jjson, relTime, ageLabel, errText, sev } from './shared'

// Lane drawer/modal: recent events for this lane (filtered from the live feed),
// the raw last shift report (via /api/admin/fleet) and control actions.
export default function OpsLaneDrawer({
  lane,
  events,
  onClose,
  onControl,
}: {
  lane: OpsLane
  events: OpsEvent[]
  onClose: () => void
  onControl: (employee: string, patch: { paused?: boolean; autonomy?: string; note?: string }) => Promise<unknown>
}) {
  const [raw, setRaw] = useState<any>(null)
  const [rawErr, setRawErr] = useState('')
  const [rawLoading, setRawLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [autonomy, setAutonomy] = useState(lane.autonomy || 'autonomous')

  const laneEvents = events.filter((e) => e.lane === lane.employee)

  useEffect(() => {
    let alive = true
    setRaw(null); setRawErr(''); setRawLoading(true)
    jjson<any>('/api/admin/fleet?limit=10')
      .then((f) => {
        if (!alive) return
        const emp = (f?.employees || []).find((x: any) => x.name === lane.employee)
        setRaw(emp?.lastReport || null)
      })
      .catch((e) => { if (alive) setRawErr(errText(e)) })
      .finally(() => { if (alive) setRawLoading(false) })
    return () => { alive = false }
  }, [lane.employee])

  useEffect(() => { setAutonomy(lane.autonomy || 'autonomous') }, [lane.employee, lane.autonomy])

  const run = async (label: string, patch: { paused?: boolean; autonomy?: string; note?: string }) => {
    setBusy(label)
    try { await onControl(lane.employee, patch); if (patch.note) setNote('') }
    catch (e: any) { alert(errText(e)) }
    finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-lg bg-[#080d09] border-l border-[#0E7C3A]/30 overflow-y-auto">
        {/* header */}
        <div className="sticky top-0 z-10 bg-[#080d09]/95 backdrop-blur border-b border-[#0E7C3A]/20 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${lane.paused ? 'bg-amber-400' : 'bg-[#10B981] animate-pulse'}`} />
              <h3 className="text-base font-bold text-white truncate">{lane.employee}</h3>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{lane.role || '—'} · {lane.schedule || 'no schedule'}</div>
            <div className="text-[11px] text-zinc-600">last run {ageLabel(lane.ageMinutes)} · streak {lane.streak ?? 0}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* controls */}
          <div className="rounded-xl bg-black border border-[#0E7C3A]/20 p-4 space-y-3">
            <div className="text-xs tracking-[0.2em] text-zinc-500">CONTROL</div>
            <div className="flex gap-2">
              <button
                onClick={() => run(lane.paused ? 'resume' : 'pause', { paused: !lane.paused })}
                disabled={busy !== null}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50 ${lane.paused ? 'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {lane.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {busy === (lane.paused ? 'resume' : 'pause') ? '…' : lane.paused ? 'Resume lane' : 'Pause lane'}
                </span>
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[11px] text-zinc-500">Autonomy</span>
              <select value={autonomy} onChange={(e) => setAutonomy(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white">
                <option value="autonomous">autonomous</option>
                <option value="supervised">supervised</option>
                <option value="halted">halted</option>
              </select>
              <button onClick={() => run('autonomy', { autonomy })} disabled={busy !== null || autonomy === (lane.autonomy || 'autonomous')} className="px-3 py-1.5 rounded-lg bg-[#0E7C3A] text-white text-xs disabled:opacity-50">{busy === 'autonomy' ? '…' : 'Apply'}</button>
            </div>
            <div className="flex gap-2 items-center">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && note.trim() && run('note', { note })} placeholder="Note for this lane (ops log)…" className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:border-[#10B981]/40 focus:outline-none" />
              <button onClick={() => run('note', { note })} disabled={busy !== null || !note.trim()} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs disabled:opacity-40 flex items-center gap-1"><Send className="w-3 h-3" />Log</button>
            </div>
            <div className="text-[10px] text-zinc-600">POST /api/admin/ops/control · {lane.autonomy || 'autonomous'} default · halted/paused stops runs via control sync.</div>
          </div>

          {/* raw last report */}
          <div className="rounded-xl bg-black border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs tracking-[0.2em] text-zinc-500">LAST SHIFT REPORT</div>
              <span className="text-[10px] text-zinc-600 font-mono">{raw?.runAt ? new Date(raw.runAt).toLocaleString() : ''}</span>
            </div>
            {rawLoading ? <div className="text-xs text-zinc-500">Loading…</div>
              : rawErr ? <div className="text-xs text-zinc-600">{rawErr}</div>
              : raw ? (
                <div className="space-y-1 text-xs">
                  <div className="text-zinc-300"><span className="text-[#10B981] font-semibold">FINISHED:</span> {raw.finished || '—'}</div>
                  <div className="text-zinc-300"><span className="text-amber-400 font-semibold">COULDNT:</span> {raw.couldnt || '—'}</div>
                  <div className="text-zinc-300"><span className="text-red-400 font-semibold">NEEDS YOU:</span> {raw.needsYou || '—'}</div>
                  {raw.verdict && <div className="text-zinc-500 mt-1">verdict: <span className="font-mono">{raw.verdict}</span></div>}
                </div>
              ) : <div className="text-xs text-zinc-600">No report yet for this lane.</div>}
          </div>

          {/* lane events */}
          <div className="rounded-xl bg-black border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs tracking-[0.2em] text-zinc-500">RECENT EVENTS · {laneEvents.length}</div>
              <RefreshCw className="w-3 h-3 text-zinc-600" />
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {laneEvents.map((e) => {
                const s = sev(e.severity)
                return (
                  <div key={e.id} className={`flex gap-2 px-2.5 py-1.5 rounded-lg border ${s.border} ${s.bg}`}>
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${s.text}`}>{e.type}</span>
                        <span className="text-xs text-white truncate">{e.title}</span>
                        <span className="ml-auto text-[9px] text-zinc-600 font-mono whitespace-nowrap">{relTime(e.createdAt)}</span>
                      </div>
                      {e.body && <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-pre-wrap break-words">{String(e.body).slice(0, 240)}</div>}
                    </div>
                  </div>
                )
              })}
              {!laneEvents.length && <div className="text-xs text-zinc-600">No recent events for this lane.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
