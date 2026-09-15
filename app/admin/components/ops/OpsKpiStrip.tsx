'use client'
import { Users, CreditCard, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react'
import type { OpsKpis } from './types'
import { num, bdt } from './shared'

// KPI strip: signups today · paying customers /10 · MRR BDT · active lanes · alerts (24h)
export default function OpsKpiStrip({
  kpis,
  err,
  loading,
  onRefresh,
}: {
  kpis?: OpsKpis
  err?: string
  loading?: boolean
  onRefresh?: () => void
}) {
  const cards = [
    { label: 'Signups today',     value: num(kpis?.signupsToday),                                  icon: Users,       accent: 'from-[#0E7C3A] to-[#10B981]' },
    { label: 'Paying customers',  value: `${num(kpis?.payingCustomers)} / ${num(kpis?.targetCustomers ?? 10)}`, icon: CreditCard,  accent: 'from-emerald-600 to-emerald-400' },
    { label: 'MRR',               value: bdt(kpis?.mrrBdt),                                        icon: DollarSign,  accent: 'from-zinc-700 to-zinc-600' },
    { label: 'Active lanes',      value: num(kpis?.activeLanes),                                   icon: Activity,    accent: 'from-[#0E7C3A] to-[#065F46]' },
    { label: 'Alerts (24h)',      value: num(kpis?.alerts24h),                                     icon: AlertCircle, accent: 'from-amber-600 to-amber-400' },
  ]

  const blank = !kpis && !loading

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.2em] text-zinc-500">OPS KPIs</div>
        <button onClick={onRefresh} className="px-2.5 py-1.5 rounded-lg bg-[#23201D] border border-zinc-800 text-xs text-zinc-300 hover:border-[#10B981]/30 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5"/>Refresh</button>
      </div>
      {err && <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">{err}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-[#1C1917] border border-[#0E7C3A]/20 p-4 hover:border-[#10B981]/30 transition">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-2.5`}><c.icon className="w-4 h-4 text-white"/></div>
            <div className="text-xl font-black text-white">{blank ? '—' : c.value}</div>
            <div className="text-[10px] tracking-widest text-zinc-500 mt-1">{c.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
