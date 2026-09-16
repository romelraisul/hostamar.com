'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { OpsStatus, OpsLane, OpsEvent } from './types'
import { jjson, errText, useLivePoll } from './shared'
import OpsKpiStrip from './OpsKpiStrip'
import OpsFeed from './OpsFeed'
import OpsLaneGrid from './OpsLaneGrid'
import OpsLaneDrawer from './OpsLaneDrawer'

// Employees / Ops Center tab — KPI strip + live feed + lane grid + lane drawer.
// Owns both polls (status 15s, feed 10s) so children stay presentational and the
// drawer filters the same feed without a second request.
export default function EmployeesTab() {
  const [status, setStatus] = useState<OpsStatus | null>(null)
  const [statusErr, setStatusErr] = useState('')
  const [statusLoading, setStatusLoading] = useState(true)

  const [events, setEvents] = useState<OpsEvent[]>([])
  const [feedErr, setFeedErr] = useState('')
  const [feedLoading, setFeedLoading] = useState(true)

  const [selected, setSelected] = useState<string | null>(null)
  const statusRef = useRef<OpsStatus | null>(null)
  useEffect(() => { statusRef.current = status }, [status])

  const loadStatus = useCallback(async () => {
    try { setStatus(await jjson<OpsStatus>('/api/admin/ops/status')); setStatusErr('') }
    catch (e: any) { setStatusErr(errText(e)) }
    finally { setStatusLoading(false) }
  }, [])

  const loadFeed = useCallback(async () => {
    try { const f = await jjson<{ events: OpsEvent[] }>('/api/admin/ops/feed?limit=50'); setEvents(f.events || []); setFeedErr('') }
    catch (e: any) { setFeedErr(errText(e)) }
    finally { setFeedLoading(false) }
  }, [])

  useEffect(() => { loadStatus(); loadFeed() }, [loadStatus, loadFeed])
  useLivePoll(loadStatus, 15000)
  useLivePoll(loadFeed, 10000)

  const lanes: OpsLane[] = status?.lanes || []
  const laneNames = lanes.length ? lanes.map((l) => l.employee) : Array.from(new Set(events.map((e) => e.lane)))

  // Optimistic control with revert on error.
  const control = useCallback(async (employee: string, patch: { paused?: boolean; autonomy?: string; note?: string }) => {
    const prev = statusRef.current?.lanes?.find((l) => l.employee === employee) || null
    setStatus((s) => s ? { ...s, lanes: (s.lanes || []).map((l) => l.employee === employee ? { ...l, ...patch } : l) } : s)
    try {
      const row = await jjson<any>('/api/admin/ops/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee, ...patch }),
      })
      if (row && row.employee) {
        setStatus((s) => s ? { ...s, lanes: (s.lanes || []).map((l) => l.employee === employee ? { ...l, paused: row.paused ?? l.paused, autonomy: row.autonomy ?? l.autonomy } : l) } : s)
      }
      loadFeed()
    } catch (e) {
      if (prev) setStatus((s) => s ? { ...s, lanes: (s.lanes || []).map((l) => l.employee === employee ? { ...l, paused: prev.paused, autonomy: prev.autonomy } : l) } : s)
      throw e
    }
  }, [loadFeed])

  const refreshAll = () => { loadStatus(); loadFeed() }
  const selectedLane = lanes.find((l) => l.employee === selected) || null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1C1917]">এমপ্লয়িজ <span className="text-xs font-normal text-[#57534E]">· Ops Center · 16 lanes</span></h2>
          <p className="text-xs text-[#57534E]">GET /api/admin/ops/status + /feed · 10s live feed · POST /api/admin/ops/control</p>
        </div>
        <button onClick={refreshAll} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>

      <OpsKpiStrip kpis={status?.kpis} err={statusErr && !status ? statusErr : ''} loading={statusLoading} onRefresh={refreshAll} />

      <OpsFeed events={events} err={feedErr && !events.length ? feedErr : ''} laneNames={laneNames} loading={feedLoading} />

      <OpsLaneGrid
        lanes={lanes}
        loading={statusLoading}
        err={statusErr && !lanes.length ? statusErr : ''}
        onSelect={setSelected}
        onToggle={(l) => control(l.employee, { paused: !l.paused })}
      />

      {selectedLane && (
        <OpsLaneDrawer lane={selectedLane} events={events} onClose={() => setSelected(null)} onControl={control} />
      )}

      <p className="text-[11px] text-[#57534E]">Autonomy: autonomous = internal work no approval · supervised = external actions need owner approval · halted/paused = no runs (control sync).</p>
    </div>
  )
}
