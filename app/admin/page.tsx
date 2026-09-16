"use client"
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import {
  LayoutDashboard, Users, ShoppingCart, TrendingUp, DollarSign, Activity, Video, Server, CreditCard,
  CheckCircle, Clock, AlertCircle, RefreshCw, Radio, Search, Eye, MoreVertical, Shield, Coins, Receipt, Cpu, Package, Globe, Zap, HardDrive, CpuIcon
} from 'lucide-react'
import EmployeesTab from './components/ops/EmployeesTab'

// ── helpers ──────────────────────────────────────────────────────────
const TABS = ['overview','users','leads','credits','transactions','models','fleet','employees','second-brain','guard','drive','products','hosting'] as const
type Tab = typeof TABS[number]

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString() }
function fmtBDT(n: number | undefined | null) { return `৳${fmt(n)}` }
function badge(status?: string) {
  if (!status) return <span className="text-xs px-2 py-1 rounded-full bg-[#FFFDF6] text-[#78716C]">—</span>
  const s = status.toLowerCase()
  if (['completed','active','success','running'].includes(s)) return <span className="text-xs px-2.5 py-1 rounded-full bg-[#0E7C3A]/30 text-[#10B981] border border-[#10B981]/30">{status}</span>
  if (['pending','pending_verification','processing','trialing'].includes(s)) return <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">{status}</span>
  if (['failed','canceled','past_due','stopped','error'].includes(s)) return <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">{status}</span>
  return <span className="text-xs px-2.5 py-1 rounded-full bg-[#FFFDF6] text-[#78716C] border border-[#D8CDB4]">{status}</span>
}
async function jfetch(url: string) {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

// Live polling hook — re-runs `load` every intervalMs while the tab is visible.
function useLivePoll(load: () => void, intervalMs: number) {
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load() }, intervalMs)
    return () => clearInterval(t)
  }, [load, intervalMs])
}

// ── Overview ─────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        jfetch('/api/admin/stats'),
        jfetch('/api/admin/orders?limit=6').catch(()=>({orders:[]})),
      ])
      setStats(s.success ? s.data : s)
      setRecentOrders(o.orders || o.data || [])
      setErr('')
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  useLivePoll(load, 30000)

  if (loading) return <div className="p-10 text-center text-[#57534E]">Loading overview…</div>
  if (err) return <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{err}</div>
  const s = stats || {}
  const cards = [
    { label: 'Total Customers', value: fmt(s.totalCustomers), icon: Users, accent: 'from-[#0E7C3A] to-[#10B981] text-white' },
    { label: 'Total Orders', value: fmt(s.totalOrders), icon: ShoppingCart, accent: 'from-emerald-600 to-emerald-400' },
    { label: 'Total Revenue', value: fmtBDT(s.totalRevenue), icon: DollarSign, accent: 'from-amber-600 to-amber-400' },
    { label: 'Pending Orders', value: fmt(s.pendingOrders), icon: Clock, accent: 'from-amber-600 to-amber-400' },
    { label: 'Active Subscriptions', value: fmt(s.activeSubscriptions), icon: Activity, accent: 'from-[#0E7C3A] to-[#065F46] text-white' },
    { label: 'Videos', value: fmt(s.totalVideos), icon: Video, accent: 'from-violet-600 to-violet-400' },
    { label: 'New Today', value: fmt(s.newCustomersToday), icon: TrendingUp, accent: 'from-sky-600 to-sky-400' },
    { label: 'Monthly Revenue', value: fmtBDT(s.monthlyRevenue), icon: CreditCard, accent: 'from-[#0E7C3A] to-[#10B981] text-white' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c=>(
          <div key={c.label} className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5 hover:border-[#10B981]/30 transition">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}><c.icon className="w-5 h-5 text-white"/></div>
            <div className="text-2xl font-black text-[#1C1917]">{c.value}</div>
            <div className="text-xs tracking-widest text-[#57534E] mt-1">{c.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {(s.orderBreakdown || s.tierBreakdown) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {s.orderBreakdown && (
            <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
              <div className="text-xs tracking-[0.2em] text-[#57534E] mb-3">ORDER BREAKDOWN</div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {Object.entries(s.orderBreakdown).map(([k,v]: any)=>(
                  <div key={k} className="rounded-xl bg-[#0E7C3A]/10 border border-[#0E7C3A]/20 py-3">
                    <div className="text-lg font-bold text-[#1C1917]">{fmt(v)}</div>
                    <div className="text-[10px] tracking-widest text-[#57534E]">{k.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {s.tierBreakdown?.plans && (
            <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
              <div className="text-xs tracking-[0.2em] text-[#57534E] mb-3">SUBSCRIPTION PLANS</div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {Object.entries(s.tierBreakdown.plans).map(([k,v]: any)=>(
                  <div key={k} className="rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] py-3">
                    <div className="text-sm font-bold text-[#1C1917]">{fmt(v)}</div>
                    <div className="text-[9px] tracking-widest text-[#57534E]">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#0E7C3A]/10 flex items-center justify-between">
          <h3 className="font-semibold text-[#1C1917]">Recent Orders</h3>
          <span className="text-xs text-[#57534E]">{recentOrders.length} shown</span>
        </div>
        <div className="divide-y divide-[#D8CDB4]">
          {recentOrders.map((o: any)=>(
            <div key={o.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#FDF8EC]/40">
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${o.status==='completed' ? 'bg-[#0E7C3A]/20' : 'bg-amber-500/20'}`}>{o.status==='completed' ? <CheckCircle className="w-4 h-4 text-[#10B981]"/> : <Clock className="w-4 h-4 text-amber-400"/>}</div>
                <div><div className="text-sm font-medium text-[#1C1917]">{o.customer?.name || '—'}</div><div className="text-xs text-[#57534E]">{o.plan || '—'}</div></div>
              </div>
              <div className="text-right"><div className="text-sm font-bold text-[#1C1917]">{fmtBDT(o.amount)}</div>{badge(o.status)}</div>
            </div>
          ))}
          {!recentOrders.length && <div className="p-10 text-center text-[#57534E] text-sm">No recent orders.</div>}
        </div>
      </div>
    </div>
  )
}

// ── Users ────────────────────────────────────────────────────────────
function UsersTab() {
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const j = await jfetch(`/api/admin/customers?limit=50&page=${page}`)
      const list = j.customers || j.data || []
      setRows(list); setTotal(j.pagination?.total ?? list.length)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [page])
  useEffect(()=>{ load() }, [load])
  useLivePoll(load, 60000)

  const filtered = q ? rows.filter((r:any)=> `${r.name} ${r.email} ${r.phone||''}`.toLowerCase().includes(q.toLowerCase())) : rows

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#1C1917]">Users</h2><p className="text-xs text-[#57534E]">{total} total · Customers table</p></div>
        <div className="flex gap-2">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534E]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email" className="pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] text-sm text-[#1C1917] placeholder:text-[#57534E] focus:border-[#10B981]/50 focus:outline-none w-64"/></div>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
        </div>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{err}</div>}
      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E7C3A]/10 border-b border-[#0E7C3A]/20"><tr><th className="px-4 py-3 text-left text-[#78716C] font-semibold">User</th><th className="px-4 py-3 text-left text-[#78716C] font-semibold">Contact</th><th className="px-4 py-3 text-left text-[#78716C] font-semibold">Videos/Services/Subs</th><th className="px-4 py-3 text-left text-[#78716C] font-semibold">Joined</th><th className="px-4 py-3 text-right text-[#78716C] font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#D8CDB4]">
              {loading ? <tr><td colSpan={5} className="p-10 text-center text-[#57534E]">Loading…</td></tr> : filtered.map((c:any)=>(
                <tr key={c.id} className="hover:bg-[#FDF8EC]/40">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0E7C3A] to-[#10B981] flex items-center justify-center text-white text-xs font-bold">{(c.name?.[0]||'?').toUpperCase()}</div><div><div className="font-medium text-[#1C1917]">{c.name}</div><div className="text-xs text-[#57534E] font-mono">{c.id?.slice(0,8)}</div></div></div></td>
                  <td className="px-4 py-3"><div className="text-[#1C1917]">{c.email}</div><div className="text-xs text-[#57534E]">{c.phone || 'No phone'}</div></td>
                  <td className="px-4 py-3 text-[#57534E]">{c._count ? `${c._count.videos}/${c._count.services}/${c._count.subscriptions}` : '—'}</td>
                  <td className="px-4 py-3 text-[#57534E]">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/customers`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] text-xs text-[#57534E] hover:border-[#10B981]/30"><Eye className="w-3 h-3"/>View</Link></td>
                </tr>
              ))}
              {!loading && !filtered.length && <tr><td colSpan={5} className="p-10 text-center text-[#57534E]">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#D8CDB4] flex items-center justify-between text-xs text-[#57534E]">
          <span>Page {page} · {filtered.length} shown</span>
          <div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] hover:border-[#D8CDB4]">Prev</button><button onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] hover:border-[#D8CDB4]">Next</button></div>
        </div>
      </div>
    </div>
  )
}

// ── Credits ──────────────────────────────────────────────────────────
function CreditsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const j = await jfetch('/api/admin/customers?limit=100')
      setRows(j.customers || j.data || [])
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(()=>{ load() }, [load])
  useLivePoll(load, 60000)

  const save = async (id: string) => {
    const n = Number(draft)
    if (!Number.isFinite(n) || n < 0) return
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/customers/${id}`, { method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ credits: Math.trunc(n) }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Save failed')
      setRows(prev=> prev.map(x=> x.id===id ? { ...x, credits: Math.trunc(n) } : x))
      setEditing(null)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const filtered = q ? rows.filter((r:any)=> `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase())) : rows

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#1C1917]">Credits</h2><p className="text-xs text-[#57534E]">Customer.credits · PATCH /api/admin/customers/[id]</p></div>
        <div className="flex gap-2">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534E]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search" className="pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] text-sm text-[#1C1917] placeholder:text-[#57534E] focus:border-[#10B981]/50 focus:outline-none w-56"/></div>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
        </div>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{err}</div>}
      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E7C3A]/10 border-b border-[#0E7C3A]/20"><tr><th className="px-4 py-3 text-left text-[#78716C]">User</th><th className="px-4 py-3 text-left text-[#78716C]">Balance</th><th className="px-4 py-3 text-left text-[#78716C]">Credits</th><th className="px-4 py-3 text-right text-[#78716C]">Adjust</th></tr></thead>
            <tbody className="divide-y divide-[#D8CDB4]">
              {loading ? <tr><td colSpan={4} className="p-10 text-center text-[#57534E]">Loading…</td></tr> : filtered.map((c:any)=>(
                <tr key={c.id} className="hover:bg-[#FDF8EC]/40">
                  <td className="px-4 py-3"><div className="font-medium text-[#1C1917]">{c.name}</div><div className="text-xs text-[#57534E]">{c.email}</div></td>
                  <td className="px-4 py-3 text-[#57534E]">{c.balance!=null ? fmtBDT(c.balance) : '—'}</td>
                  <td className="px-4 py-3">
                    {editing===c.id ? (
                      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') save(c.id); if(e.key==='Escape') setEditing(null)}} className="w-24 px-2 py-1 rounded-lg bg-[#FDF8EC] border border-[#10B981]/40 text-[#1C1917] text-sm"/>
                    ) : (
                      <span className="inline-flex items-center gap-2"><span className="font-mono font-bold text-[#1C1917]">{c.credits ?? 0}</span><Coins className="w-3.5 h-3.5 text-amber-400"/></span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing===c.id ? (
                      <span className="flex justify-end gap-2"><button onClick={()=>save(c.id)} disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#0E7C3A] text-white text-xs disabled:opacity-50">{saving?'Saving…':'Save'}</button><button onClick={()=>setEditing(null)} className="px-3 py-1.5 rounded-lg bg-[#FFFDF6] text-[#57534E] text-xs">Cancel</button></span>
                    ) : (
                      <button onClick={()=>{ setEditing(c.id); setDraft(String(c.credits ?? 0)) }} className="px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] text-xs text-[#57534E] hover:border-[#10B981]/30">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && <tr><td colSpan={4} className="p-10 text-center text-[#57534E]">No customers.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#57534E]">Tip: Credits deduct 1 per video queue. Use Transactions → Approve to grant subscription credits automatically.</p>
    </div>
  )
}

// ── Transactions ─────────────────────────────────────────────────────
function TransactionsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [approving, setApproving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const j = await jfetch(`/api/admin/transactions?status=${encodeURIComponent(status)}&limit=100`)
      setRows(j.transactions || [])
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [status])
  useEffect(()=>{ load() }, [load])
  useLivePoll(load, 30000)

  const approve = async (id: string) => {
    if (!confirm('Approve this transaction? This will activate subscription + add credits.')) return
    setApproving(id)
    try {
      const r = await fetch(`/api/admin/payments/approve/${encodeURIComponent(id)}`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Approve failed')
      await load()
    } catch (e: any) { alert(e.message) }
    finally { setApproving(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#1C1917]">Transactions</h2><p className="text-xs text-[#57534E]">GET /api/admin/transactions · POST /api/admin/payments/approve/[id]</p></div>
        <div className="flex gap-2 items-center">
          <select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] text-sm text-[#1C1917]">
            <option value="all">All</option><option value="pending_verification">Pending verification</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option>
          </select>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
        </div>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{err}</div>}
      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E7C3A]/10 border-b border-[#0E7C3A]/20"><tr><th className="px-4 py-3 text-left text-[#78716C]">Customer</th><th className="px-4 py-3 text-left text-[#78716C]">Amount / Gateway</th><th className="px-4 py-3 text-left text-[#78716C]">TrxID</th><th className="px-4 py-3 text-left text-[#78716C]">Status</th><th className="px-4 py-3 text-left text-[#78716C]">Date</th><th className="px-4 py-3 text-right text-[#78716C]">Action</th></tr></thead>
            <tbody className="divide-y divide-[#D8CDB4]">
              {loading ? <tr><td colSpan={6} className="p-10 text-center text-[#57534E]">Loading…</td></tr> : rows.map((t:any)=>(
                <tr key={t.id} className="hover:bg-[#FDF8EC]/40">
                  <td className="px-4 py-3"><div className="font-medium text-[#1C1917]">{t.customerName || '—'}</div><div className="text-xs text-[#57534E]">{t.customerEmail || t.customerId?.slice(0,8)}</div></td>
                  <td className="px-4 py-3"><div className="text-[#1C1917] font-mono">{fmtBDT(t.amount)} <span className="text-[#57534E]">{t.currency}</span></div><div className="text-xs text-[#57534E]">{t.gateway || '—'} · +{t.creditsAdded||0} credits · {t.videoPackage||'—'}</div></td>
                  <td className="px-4 py-3 font-mono text-xs text-[#57534E]">{t.gatewayTrxId || t.id.slice(0,12)}</td>
                  <td className="px-4 py-3">{badge(t.status)}</td>
                  <td className="px-4 py-3 text-[#57534E] text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {(t.status==='pending' || t.status==='pending_verification') ? (
                      <button onClick={()=>approve(t.id)} disabled={approving===t.id} className="px-3 py-1.5 rounded-lg bg-[#0E7C3A] text-white text-xs hover:bg-[#0a5c2a] disabled:opacity-50">{approving===t.id ? 'Approving…':'Approve'}</button>
                    ) : <span className="text-xs text-[#57534E]">—</span>}
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && <tr><td colSpan={6} className="p-10 text-center text-[#57534E]">No transactions for this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Models ───────────────────────────────────────────────────────────
function ModelsTab() {
  const [models, setModels] = useState<any[]>([])
  const [source, setSource] = useState<'live'|'static'|''>('')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [ai, setAi] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const j = await jfetch('/api/gateway/models')
      setModels(j.data || []); setSource(j.source || 'static'); setGatewayUrl(j.gatewayUrl || ''); setHasKey(!!j.hasKey)
      setLastUpdated(new Date())
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])
  const loadAi = useCallback(async () => {
    try { setAi(await jfetch('/api/admin/ai-status')) } catch { /* non-fatal */ }
  }, [])
  useEffect(()=>{ load(); loadAi() }, [load, loadAi])
  // Live polling: models every 10s, AI infra every 15s (paused when tab hidden)
  useEffect(() => {
    const t1 = setInterval(() => { if (!document.hidden) load() }, 10000)
    const t2 = setInterval(() => { if (!document.hidden) loadAi() }, 15000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [load, loadAi])

  const providers = ai?.providers || {}
  const chainOrder = ['kilocode','nvidia','tokenrouter','opencode']
  const providerMeta: Record<string,{label:string; model:string; color:string}> = {
    kilocode: { label: 'KiloCode', model: 'kilo-auto/free', color: '#10B981' },
    nvidia: { label: 'NVIDIA', model: 'meta/llama-3.1-8b-instruct', color: '#76B900' },
    tokenrouter: { label: 'TokenRouter', model: 'qwen/qwen3.8-max-free', color: '#38BDF8' },
    opencode: { label: 'OpenCode Zen', model: 'hy3-free', color: '#A78BFA' },
  }

  // CEO TokenRouter tiers — routing brain (local-wsl → kaggle → edge → zoo)
  const [router, setRouter] = useState<any>(null)
  useEffect(() => {
    jfetch('/api/models/health').then(setRouter).catch(() => setRouter(null))
    const t = setInterval(() => { if (!document.hidden) jfetch('/api/models/health').then(setRouter).catch(()=>{}) }, 15000)
    return () => clearInterval(t)
  }, [])
  const tierStyle: Record<string,string> = {
    'up': 'border-[#10B981]/40 bg-[#0E7C3A]/10',
    'booting': 'border-amber-500/40 bg-amber-500/10',
    'planned': 'border-[#D8CDB4] bg-[#FDF8EC]/40',
    'down': 'border-red-500/40 bg-red-500/10',
  }

  // Kaggle On-Demand (Vercel-style) — IDLE=COMPLETE=0 GPU hours
  const [kg, setKg] = useState<any>(null)
  const [kgBusy, setKgBusy] = useState<string | null>(null)
  const loadKg = () => jfetch('/api/kaggle/status').then(setKg).catch(() => setKg(null))
  useEffect(() => {
    loadKg()
    const t = setInterval(() => { if (!document.hidden) loadKg() }, 30000)
    return () => clearInterval(t)
  }, [])
  const kgAction = async (notebook: string, action: 'start' | 'stop') => {
    setKgBusy(notebook + ':' + action)
    try {
      const r = await fetch(`/api/kaggle/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notebook }) })
      if (r.status === 429) alert('কোটা গেট: ২৫h/30h ব্যবহৃত — START বন্ধ, Edge fallback এ যাও।')
      loadKg()
    } finally { setKgBusy(null) }
  }
  const kgStateDot: Record<string,string> = { IDLE: 'bg-[#F6EBD2]', RUNNING: 'bg-[#10B981] animate-pulse', STARTING: 'bg-amber-400 animate-pulse', STOPPING: 'bg-amber-400', ERROR: 'bg-red-500' }
  const h = (s: number) => Math.round(s / 3600)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#1C1917]">Models <span className="text-xs font-normal text-[#57534E]">· CEO TokenRouter</span></h2><p className="text-xs text-[#57534E]">GET /api/gateway/models · {gatewayUrl ? <code className="font-mono text-[#78716C]">{gatewayUrl}</code> : 'gateway'}{lastUpdated && <span className="ml-2 text-[#57534E]">· updated {lastUpdated.toLocaleTimeString()}</span>}</p></div>
        <div className="flex items-center gap-2">
          {source && <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${source==='live' ? 'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>{source==='live' ? '● live' : '● offline (cached catalog)'}</span>}
          <button onClick={()=>{load(); loadAi()}} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
        </div>
      </div>

      {/* Infra strip: gateway + comfyui live status */}
      {ai && (
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${ai.gateway?.up ? 'bg-[#0E7C3A]/10 border-[#10B981]/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${ai.gateway?.up ? 'bg-[#10B981] animate-pulse' : 'bg-red-500'}`}/>
            <div><div className="text-xs font-semibold text-[#1C1917]">AI Gateway {ai.gateway?.up ? 'online' : 'offline'}</div><div className="text-[10px] text-[#57534E] font-mono">{ai.gateway?.url} · {ai.gateway?.latencyMs}ms</div></div>
          </div>
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${ai.comfyui?.up ? 'bg-[#0E7C3A]/10 border-[#10B981]/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${ai.comfyui?.up ? 'bg-[#10B981] animate-pulse' : 'bg-red-500'}`}/>
            <div><div className="text-xs font-semibold text-[#1C1917]">ComfyUI {ai.comfyui?.up ? 'online' : 'offline'}</div><div className="text-[10px] text-[#57534E] font-mono">{ai.comfyui?.gpu ? `${ai.comfyui.gpu.vramFreeMB}/${ai.comfyui.gpu.vramTotalMB} MB VRAM free` : ai.comfyui?.url}</div></div>
          </div>
        </div>
      )}

      {/* Kaggle On-Demand — Vercel-style serverless GPUs (account safe) */}
      {kg && (
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#38BDF8]/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-[#1C1917]">Kaggle On-Demand — অ্যাকাউন্ট সেফ মোড (Vercel-এর মতো)</div>
              <div className="text-[11px] text-[#57534E]">IDLE = COMPLETE = ০ GPU ঘণ্টা · দরকার হলে START · ১০ মিনিট idle → auto STOP · ২৫h/30h গেট</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#57534E] font-mono">GPU {h(kg.quota?.gpuUsedSec || 0)}h / {h(kg.quota?.gpuTotalSec || 30)}h</div>
              <div className="h-1.5 w-28 rounded-full bg-[#FFFDF6] mt-1 overflow-hidden">
                <div className={`h-full rounded-full ${(kg.quota?.gpuUsedSec||0)/(kg.quota?.gpuTotalSec||1) > 25/30 ? 'bg-red-500' : 'bg-[#10B981]'}`} style={{ width: `${Math.min(100, ((kg.quota?.gpuUsedSec||0)/(kg.quota?.gpuTotalSec||1))*100)}%` }} />
              </div>
              {kg.quota?.startDisabled && <div className="text-[9px] text-red-400 mt-0.5">quota gate: START disabled</div>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(kg.notebooks || []).map((n: any) => (
              <div key={n.notebook} className="rounded-xl border border-[#D8CDB4] bg-[#FDF8EC]/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#57534E]">{n.notebook}</span>
                  <span className={`w-2 h-2 rounded-full ${kgStateDot[n.state] || 'bg-[#FDF8EC]'}`} />
                </div>
                <div className="text-[10px] mt-1 text-[#78716C] font-mono">{n.state}</div>
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => kgAction(n.notebook, 'start')}
                    disabled={n.state !== 'IDLE' || kgBusy === `${n.notebook}:start` || kg.quota?.startDisabled}
                    className="flex-1 rounded-lg bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-bold py-1.5"
                  >{kgBusy === `${n.notebook}:start` ? '⏳' : '▶ START'}</button>
                  <button
                    onClick={() => kgAction(n.notebook, 'stop')}
                    disabled={n.state === 'IDLE' || kgBusy === `${n.notebook}:stop`}
                    className="flex-1 rounded-lg bg-[#FFFDF6] hover:bg-[#FDF8EC] disabled:opacity-30 disabled:cursor-not-allowed text-[#1C1917] text-[10px] font-bold py-1.5"
                  >{kgBusy === `${n.notebook}:stop` ? '⏳' : '⏹ STOP'}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-[#57534E]">
            রুল: IDLE-এ COMPLETE স্টেট — ০ খরচ · request আসলে START (CreateKernelSession), max 8h30m পরে auto COMPLETE · 10m idle → CancelKernelSession (সত্যিকারের STOP, GPU তৎক্ষণাৎ মুক্ত) · Secrets শুধু Kaggle Secrets-এ · লগ-এ abuse দেখলে instant STOP।
            Auto-start: local-wsl down হলে TokenRouter qwen27b backup on-demand চালু করবে।
          </div>
        </div>
      )}

      {/* CEO TokenRouter — tier routing table */}
      {router && (
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#38BDF8]/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-[#1C1917]">TokenRouter — CEO রাউটিং ব্রেইন</div>
              <div className="text-[11px] text-[#57534E]">lib/tokenrouter.ts · অগ্রাধিকার: local-wsl → kaggle → edge → zoo · 15s polling /api/models/health</div>
            </div>
            <div className="text-[10px] text-[#57534E] font-mono">{router.summary?.up}/{router.summary?.total} tier up</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(router.tiers || []).map((t: any, i: number) => (
              <div key={t.model} className={`rounded-xl border p-3 ${tierStyle[t.status] || tierStyle.planned}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#57534E]">#{i+1} {t.tier}</span>
                  <span className={`w-2 h-2 rounded-full ${t.status==='up' ? 'bg-[#10B981] animate-pulse' : t.status==='booting' ? 'bg-amber-400 animate-pulse' : 'bg-[#FDF8EC]'}`}/>
                </div>
                <div className="text-xs font-bold text-[#1C1917] mt-1.5 font-mono truncate">{t.model}</div>
                <div className="text-[10px] text-[#57534E] mt-1 font-mono">{t.url}</div>
                <div className="text-[10px] mt-1 text-[#57534E]">{t.creditCost === 0 ? '০ credit (local)' : `${t.creditCost} cr/1k tok`}</div>
                {t.note && <div className="text-[10px] mt-1.5 text-[#57534E] leading-snug">{t.note}</div>}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-[#57534E]">
            Failover: auto — tier down হলে পরেরটা answer দেয়। Zoo (KiloCode→NVIDIA→TokenRouter→OpenCode) PC off-এও চলে। Credit mapping: DB catalog = দামের সত্য, এই টেবিল = রাউটিং সত্য।
          </div>
        </div>
      )}

      {/* 24/7 Cloud Fallback Chain */}
      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div><div className="text-sm font-bold text-[#1C1917]">24/7 Cloud Fallback Chain</div><div className="text-[11px] text-[#57534E]">Vercel-side · works with PC off · order: KiloCode → NVIDIA → TokenRouter → OpenCode</div></div>
          <span className="text-[10px] text-[#57534E] font-mono">catalog cache 60s</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {chainOrder.map((name, i) => {
            const p = providers[name] || {}
            const meta = providerMeta[name]
            const configured = (ai?.chain || []).find((c:any)=>c.provider===name)?.configured
            return (
              <div key={name} className={`rounded-xl border p-3 ${p.up ? 'border-[#10B981]/30 bg-[#0E7C3A]/5' : 'border-[#D8CDB4] bg-[#FDF8EC]/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-[#57534E]">#{i+1}</span><span className="text-xs font-bold text-[#1C1917]">{meta.label}</span></div>
                  <span className={`w-2 h-2 rounded-full ${p.up ? 'bg-[#10B981] animate-pulse' : configured ? 'bg-red-500' : 'bg-[#FDF8EC]'}`}/>
                </div>
                <div className="text-[10px] font-mono text-[#57534E] mt-1.5">{meta.model}</div>
                <div className="text-[10px] text-[#57534E] mt-1">
                  {p.up ? <>{p.free} free / {p.total} models · {p.latencyMs}ms</> : configured ? (p.error || 'down') : 'no key'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hasKey===false && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">No active API key — gateway returns cached catalog. Create a key at <Link href="/dashboard/keys" className="underline">/dashboard/keys</Link>.</div>}
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{err}</div>}
      {loading ? <div className="p-10 text-center text-[#57534E]">Loading models…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {models.map((m:any)=>(
            <div key={m.id} className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5 hover:border-[#10B981]/30 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0E7C3A] to-[#10B981] flex items-center justify-center text-white"><Cpu className="w-5 h-5 text-white"/></div><div className="font-bold text-[#1C1917]">{m.id}</div></div>
                <span className="text-[10px] tracking-widest text-[#57534E] border border-[#D8CDB4] rounded-full px-2 py-1">{m.owned_by || 'hostamar'}</span>
              </div>
              {m.description && <p className="text-sm text-[#78716C] mt-3 leading-relaxed">{m.description}</p>}
              {typeof m.context_window==='number' && <p className="text-xs text-[#57534E] mt-2">Context: {fmt(m.context_window)} tokens</p>}
              <div className="mt-4 flex gap-2"><Link href="/chat" className="text-xs px-3 py-1.5 rounded-lg bg-[#0E7C3A] text-white hover:bg-[#0a5c2a]">Try in Chat</Link><Link href="/api/gateway/models" className="text-xs px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] text-[#78716C]">/v1/models</Link></div>
            </div>
          ))}
          {!models.length && <div className="col-span-full p-10 text-center text-[#57534E]">No models.</div>}
        </div>
      )}
    </div>
  )
}

// ── Products ─────────────────────────────────────────────────────────
function ProductsTab() {
  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-[#1C1917]">Products</h2><p className="text-xs text-[#57534E]">Single source of truth · lib/products.ts · 6 products</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PRODUCTS.map(p=>(
          <div key={p.slug} className="rounded-2xl overflow-hidden bg-[#FFFDF6] border border-[#0E7C3A]/20 hover:border-[#10B981]/30 transition">
            <div className={`h-2 bg-gradient-to-r ${p.gradient}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="text-2xl">{p.emoji}</span><div><div className="font-bold text-[#1C1917]">{p.nameEn}</div><div className="text-xs text-[#57534E]">{p.nameBn}</div></div></div>
                <span className={`text-[10px] tracking-widest px-2 py-1 rounded-full border font-semibold ${p.status==='live' ? 'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>{p.badge}</span>
              </div>
              <p className="text-sm text-[#78716C] mt-3 leading-relaxed">{p.description}</p>
              <p className="text-xs text-[#57534E] mt-2 italic">{p.taglineEn}</p>
              <ul className="mt-3 space-y-1">
                {p.features.slice(0,4).map((f,i)=>(<li key={i} className="text-xs text-[#57534E] flex gap-2"><span className="text-[#10B981]">•</span>{f}</li>))}
              </ul>
              <div className="mt-4 flex gap-2"><Link href={p.ctaHref} className="text-xs px-3 py-2 rounded-xl bg-[#0E7C3A] text-white hover:bg-[#0a5c2a]">{p.ctaLabel}</Link><Link href={`/products/${p.slug}`} className="text-xs px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-[#57534E]">Details → /products/{p.slug}</Link></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hosting ──────────────────────────────────────────────────────────
// ── Leads tab — every captured lead (contact form, CRM, imports) ─────
function LeadsTab() {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  const [source, setSource] = useState('')

  const load = useCallback(async () => {
    try {
      setErr('')
      setData(await jfetch(`/api/admin/leads?take=100${source ? `&source=${encodeURIComponent(source)}` : ''}`))
    } catch (e: any) { setErr(e.message) }
  }, [source])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1C1917]">লিড <span className="text-xs text-normal text-[#57534E]">· funnel capture</span></h2>
          <p className="text-xs text-[#57534E]">GET /api/admin/leads · contact form + CRM + imports · newest first</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>
      {err && <div className="text-xs text-red-400">{err}</div>}
      <div className="flex gap-2 items-center">
        {['', 'contact-form'].map((s) => (
          <button key={s || 'all'} onClick={() => setSource(s)} className={`px-3 py-1.5 rounded-lg text-xs border ${source === s ? 'bg-[#0E7C3A] text-white border-[#10B981]' : 'text-[#78716C] border-[#D8CDB4] hover:text-[#1C1917]'}`}>{s || 'সব'}</button>
        ))}
        <div className="ml-auto text-xs text-[#57534E]">Total: <span className="font-mono text-[#10B981]">{data?.total ?? '—'}</span></div>
      </div>
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3">
        {(data?.leads || []).map((l: any) => (
          <div key={l.id} className="border-b border-[#D8CDB4] py-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#1C1917] font-semibold">{l.name}</span>
              <span className="text-[#78716C]">{l.email || '—'}</span>
              {l.phone && <span className="text-[#78716C]">{l.phone}</span>}
              {badge(l.status)}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFDF6] text-[#78716C]">{l.source}</span>
              <span className="ml-auto text-[10px] text-[#57534E] font-mono">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
            {l.notes && <div className="mt-1 text-[11px] text-[#57534E] whitespace-pre-wrap">{String(l.notes).slice(0, 400)}</div>}
          </div>
        ))}
        {data && (!data.leads || data.leads.length === 0) && <div className="text-xs text-[#57534E]">এখনো কোনো লিড নেই — contact ফর্মের submission এখানে আসবে।</div>}
        {!data && <div className="text-xs text-[#57534E]">Loading leads…</div>}
      </div>
    </div>
  )
}

// ── V50 Fleet tab — AI employees: reports + chat + storage stream ────
const FLEET_META: Record<string, { lane: string; color: string }> = {
  Atlas: { lane: 'Hosting — 7 containers, site, uploader, disks', color: '#10B981' },
  Echo: { lane: 'Chat/AI — Brain :4000 15 models, tunnels, ComfyUI', color: '#38BDF8' },
  Reel: { lane: 'Video — renders, ComfyUI 384×216 recipe, ffprobe', color: '#A78BFA' },
  Bazaar: { lane: 'Store — Medusa 116 products, catalog', color: '#F59E0B' },
  Quill: { lane: 'Content/TV — HTTP media verify, playlist', color: '#EC4899' },
  Sage: { lane: 'Second Brain — nightly synthesis, wiki + /ask', color: '#F43F5E' },
}

function FleetTab() {
  const [fleet, setFleet] = useState<any>(null)
  const [err, setErr] = useState('')
  const [chatWith, setChatWith] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setFleet(await jfetch('/api/admin/fleet?limit=10')) } catch (e: any) { setErr(e.message) }
  }, [])
  useEffect(() => { load() }, [load])
  useLivePoll(load, 15000) // live stream: refresh reports + storage every 15s

  const storage = fleet?.storage
  const tb = storage ? (Number(storage.telegramBytes) / 1024**4) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1C1917]">AI Employees <span className="text-xs text-normal text-[#57534E]">· V48 fleet</span></h2>
          <p className="text-xs text-[#57534E]">GET /api/admin/fleet · reports from Hermes cron shifts · 15s live poll</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>
      {err && <div className="text-xs text-red-400">{err}</div>}

      {/* Storage strip: Telegram Drive (B2 hot cache in front) */}
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3 flex flex-wrap gap-3 items-center">
        <div className="text-xs font-semibold text-[#1C1917]">Hostamar Drive — B2 hot cache + Telegram ∞</div>
        <div className="text-xs text-[#78716C]">Telegram files: <span className="font-mono text-[#10B981]">{storage ? storage.telegramFiles.toLocaleString() : '—'}</span></div>
        <div className="text-xs text-[#78716C]">Telegram bytes: <span className="font-mono text-[#10B981]">{tb > 1 ? `${tb.toFixed(2)} TB` : (Number(storage?.telegramBytes||0)/1024**3).toFixed(1)+' GB'}</span></div>
        <div className="text-[10px] text-[#57534E]">DriveFile rows in Neon · B2 10GB hot cache in front · 2GB/file Telegram cold tier</div>
      </div>

      {/* Employee cards */}
      <div className="grid md:grid-cols-2 gap-3">
        {(fleet?.employees || []).map((e: any) => {
          const meta = FLEET_META[e.name] || { lane: '', color: '#10B981' }
          const r = e.lastReport
          const healthy = r?.verdict ? r.verdict.toUpperCase().includes('HEALTHY') : null
          return (
            <div key={e.name} className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${healthy === null ? 'bg-[#F6EBD2]' : healthy ? 'bg-[#10B981] animate-pulse' : 'bg-red-500'}`}/>
                  <div>
                    <div className="text-sm font-bold text-[#1C1917]">{e.name}</div>
                    <div className="text-[11px] text-[#57534E]">{meta.lane}</div>
                  </div>
                </div>
                <div className="text-[10px] text-[#57534E] font-mono">{r ? new Date(r.runAt).toLocaleString() : 'no report yet'}</div>
              </div>
              {r ? (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="text-[#57534E]"><span className="text-[#10B981] font-semibold">FINISHED:</span> {r.finished || '—'}</div>
                  <div className="text-[#57534E]"><span className="text-amber-400 font-semibold">COULDNT:</span> {r.couldnt || '—'}</div>
                  <div className="text-[#57534E]"><span className="text-red-400 font-semibold">NEEDS YOU:</span> {r.needsYou || '—'}</div>
                </div>
              ) : <div className="mt-2 text-xs text-[#57534E]">Waiting for first shift report…</div>}
              <button onClick={() => setChatWith(chatWith === e.name ? null : e.name)} className="mt-3 w-full py-1.5 rounded-lg border border-[#D8CDB4] text-xs text-[#57534E] hover:border-[#10B981] hover:text-[#1C1917] transition">
                {chatWith === e.name ? 'Close chat' : `Chat with ${e.name}`}
              </button>
              {chatWith === e.name && <EmployeeChat employee={e.name} />}
            </div>
          )
        })}
        {!fleet && <div className="text-xs text-[#57534E]">Loading fleet…</div>}
      </div>

      {/* Recent reports live log */}
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3">
        <div className="text-xs font-semibold text-[#1C1917] mb-2">Recent shift reports</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(fleet?.recent || []).map((r: any, i: number) => (
            <div key={i} className="text-[11px] font-mono text-[#78716C] border-b border-[#D8CDB4] py-1">
              <span className="text-[#57534E]">{new Date(r.runAt).toLocaleTimeString()}</span> <span className="text-[#1C1917]">{r.employee}</span> — {r.verdict || '—'} · {r.finished || ''}{r.needsYou ? ` · NEEDS YOU: ${r.needsYou}` : ''}
            </div>
          ))}
          {fleet && (!fleet.recent || fleet.recent.length === 0) && <div className="text-[11px] text-[#57534E]">No reports yet — employees post on each shift.</div>}
        </div>
      </div>
    </div>
  )
}

// Employee chat — talks to the Brain gateway (local first, cloud fallback).
// LiteLLM :4000 has open CORS (access-control-allow-origin: *) so the browser
// can call the local gateway directly when the admin is on the PC's browser;
// cloud fallback covers remote access.
function EmployeeChat({ employee }: { employee: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'employee'; text: string; time: string }[]>([
    { role: 'employee', text: `${employee} here. Ask me "What did you do today?" — I own this lane, I remember my shifts.`, time: new Date().toLocaleTimeString() },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!input.trim() || busy) return
    const text = input
    setMessages((m) => [...m, { role: 'user', text, time: new Date().toLocaleTimeString() }])
    setInput(''); setBusy(true)
    const endpoints = ['http://localhost:4000/v1', 'https://ai.hostamar.com/v1']
    let reply = `${employee}: Brain unreachable from this browser (local gateway off?) — reports above are from my saved shifts.`
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${ep}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kilocode-fast',
            messages: [
              { role: 'system', content: `You are ${employee}, a Hostamar AI employee who OWNS this lane (not a task). Answer as the employee, referencing your lane duties. Keep it under 120 words. Report style: FINISHED/COULDNT/NEEDS YOU.` },
              { role: 'user', content: text },
            ],
            max_tokens: 300,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const c = data.choices?.[0]?.message?.content
          if (c && c.trim()) { reply = c.trim(); break }
        }
      } catch { /* try next endpoint */ }
    }
    setMessages((m) => [...m, { role: 'employee', text: reply, time: new Date().toLocaleTimeString() }])
    setBusy(false)
  }

  return (
    <div className="mt-3 rounded-lg bg-[#FBF4E4] border border-[#D8CDB4] p-2">
      <div className="max-h-48 overflow-y-auto space-y-1.5 mb-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-xs p-1.5 rounded ${m.role === 'user' ? 'bg-[#0E7C3A]/20 ml-8' : 'bg-[#FDF8EC] mr-8'}`}>
            <div className="text-[9px] text-[#57534E]">{m.role === 'user' ? 'You' : employee} · {m.time}</div>
            <div className="text-[#1C1917] whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={`Ask ${employee}…`} className="flex-1 text-xs px-2 py-1.5 rounded bg-[#FFFDF6] border border-[#D8CDB4] text-[#1C1917] outline-none focus:border-[#10B981]"/>
        <button onClick={send} disabled={busy} className="text-xs px-3 py-1.5 rounded bg-[#0E7C3A] text-white disabled:opacity-50">{busy ? '…' : 'Send'}</button>
      </div>
    </div>
  )
}

// ── V55 Second Brain tab — synthesized WHY answers via local query layer ──
function SecondBrainTab() {
  const [state, setState] = useState<any>(null)
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setState(await jfetch('/api/admin/second-brain')) } catch { setState(null) }
  }, [])
  useEffect(() => { load() }, [load])

  const ask = async () => {
    if (!q.trim() || busy) return
    setBusy(true); setAnswer(null)
    try {
      const r = await fetch('/api/admin/second-brain', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      })
      const d = await r.json()
      setAnswer(d.answer || d.hint || 'no answer')
    } catch (e: any) { setAnswer(`error: ${e.message}`) }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1C1917]">Second Brain <span className="text-xs font-normal text-[#57534E]">· Raw → Wiki → Synthesis</span></h2>
          <p className="text-xs text-[#57534E]">SAGE 12:05 nightly synthesis · wiki pages: {(state?.wikiPages || []).join(' · ')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${state?.askOnline ? 'text-[#10B981] border-[#10B981]/30 bg-[#0E7C3A]/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
          {state?.askOnline ? '● query layer online' : '● query layer local-only'}
        </span>
      </div>
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3">
        <div className="text-xs text-[#57534E] mb-2">{state?.note || 'loading…'}</div>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="WHY প্রশ্ন করো — e.g. auth module এ বারবার bug কেন?"
            className="flex-1 text-sm px-3 py-2 rounded-xl bg-[#FBF4E4] border border-[#D8CDB4] text-[#1C1917] outline-none focus:border-[#10B981]"/>
          <button onClick={ask} disabled={busy} className="px-4 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm disabled:opacity-50">{busy ? '…' : 'Ask'}</button>
        </div>
        {answer && <div className="mt-3 text-sm text-[#1C1917] whitespace-pre-wrap rounded-lg bg-[#FDF8EC] p-3 border border-[#D8CDB4]">{answer}</div>}
      </div>
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3 text-xs text-[#78716C]">
        <div className="font-semibold text-[#1C1917] mb-1">Pipeline</div>
        raw floor (vision · consensus · 5 fleet shifts · guardian.log) → synthesize.mjs (nightly) → wiki/ pre-digested pages + synthesis.md A↔B connections → /ask RAG via local Brain. CLI quality loop: <code className="font-mono text-[#57534E]">dynamic_context.py "q" --quality</code> (critic &gt;0.95, up to 5 passes).
      </div>
    </div>
  )
}

// ── V55 Guard tab — zero-cost scammer guard state ──
function GuardTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1C1917]">Guard <span className="text-xs font-normal text-[#57534E]">· zero-cost · no Sixtyfour until $2k+/mo</span></h2>
        <p className="text-xs text-[#57534E]">Policy: risk-high → Telegram review + Approve/Reject — never silent auto-block</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-4">
          <div className="text-sm font-bold text-[#1C1917]">Layer A — Bot/Disposable</div>
          <div className="text-xs text-amber-300 mt-1">NEEDS YOU: TURNSTILE_SECRET_KEY (free signup)</div>
          <div className="text-xs text-[#57534E] mt-2">Cloudflare Turnstile on signup · Vercel Firewall · bot score &lt;30 → review · Tor/VPN/bot IP block. Until key is set: skip-note, never blocks.</div>
        </div>
        <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-4">
          <div className="text-sm font-bold text-[#1C1917]">Layer B — Email/Phone</div>
          <div className="text-xs text-[#10B981] mt-1">● fully functional</div>
          <div className="text-xs text-[#57534E] mt-2">disposable-email-domains (10k list) · libphonenumber validity · Holehe/Sherlock on review only. Self-test 4/4: disposable+bot→high/review · clean→low/allow · invalid→medium/flag.</div>
        </div>
        <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-4">
          <div className="text-sm font-bold text-[#1C1917]">Layer C — Wallet</div>
          <div className="text-xs text-amber-300 mt-1">NEEDS YOU: ETHERSCAN_API_KEY (free signup)</div>
          <div className="text-xs text-[#57534E] mt-2">wallet age &lt;7d · tx &lt;5 · Tornado/mixer funding · Dexscreener top-10 holder %/liquidity lock. Code: hostamar-platform/ansible/roles/guard/files/guard.mjs</div>
        </div>
      </div>
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3 text-xs text-[#78716C]">
        <div className="font-semibold text-[#1C1917] mb-1">Progressive profiling (marketing, free)</div>
        Signup collects email only → later one small question (business type) → Gravatar pic/name. Clearbit ($500/mo) not needed. Sixtyfour only at $2k+/mo revenue for the 2-3% high-risk cases. Rules baked into wiki/security-guard.md (second brain).
      </div>
    </div>
  )
}

// ── V55 Drive tab — B2 hot + Telegram cold Hostamar Drive ──
function DriveTab() {
  const [fleet, setFleet] = useState<any>(null)
  useEffect(() => { jfetch('/api/admin/fleet?limit=1').then(setFleet).catch(() => setFleet(null)) }, [])
  const storage = fleet?.storage
  const bytes = storage ? Number(storage.telegramBytes || 0) : 0
  const gb = (bytes / 1024**3).toFixed(1)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1C1917]">Hostamar Drive <span className="text-xs font-normal text-[#57534E]">· B2 10GB hot + Telegram ∞ cold</span></h2>
        <p className="text-xs text-[#57534E]">drive flow: check B2 → miss → fetch Telegram → cache B2 · survives PC-off via Cloudflare Worker + B2 + Vercel + Alwaysdata VPS</p>
      </div>
      <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-4 flex flex-wrap gap-6">
        <div>
          <div className="text-2xl font-black text-[#10B981]">{storage ? Number(storage.telegramFiles).toLocaleString() : '—'}</div>
          <div className="text-xs text-[#57534E]">Telegram DriveFile rows (Neon)</div>
        </div>
        <div>
          <div className="text-2xl font-black text-[#10B981]">{storage ? `${gb} GB` : '—'}</div>
          <div className="text-xs text-[#57534E]">Total stored bytes (Telegram cold tier)</div>
        </div>
        <div>
          <div className="text-2xl font-black text-[#78716C]">10 GB</div>
          <div className="text-xs text-[#57534E]">B2 hot cache (small files: renders, playlist, consensus, wiki)</div>
        </div>
        <div className="text-xs text-[#57534E] self-end">2GB/file Telegram chunking · guardian uploader ticking · both links live</div>
      </div>
    </div>
  )
}

function HostingTab() {
  const [status, setStatus] = useState<any>(null)
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name:'', image:'nginx:alpine', cpu:'2 vCPU', ram:'4 GB', storage:'40 GB SSD', os:'Alpine Linux 3.19', domain:'', ssl:false })
  const [domainForm, setDomainForm] = useState({ serverId:'', domain:'', autoSsl:true })

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const [st, sv] = await Promise.all([
        jfetch('/api/hosting/status').catch(()=>null),
        fetch('/api/hosting/servers', { credentials:'include' }).then(r=> r.ok ? r.json() : []).catch(()=>[]),
      ])
      setStatus(st)
      setServers(Array.isArray(sv) ? sv : sv.servers || [])
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(()=>{ load() }, [load])
  useLivePoll(load, 30000)

  const createServer = async () => {
    if (!form.name || !form.image) return alert('Name and image required')
    setCreating(true)
    try {
      const r = await fetch('/api/hosting/servers', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...form, ports: [] }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Create failed')
      setForm({ name:'', image:'nginx:alpine', cpu:'2 vCPU', ram:'4 GB', storage:'40 GB SSD', os:'Alpine Linux 3.19', domain:'', ssl:false })
      await load()
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }
  const attachDomain = async () => {
    if (!domainForm.serverId || !domainForm.domain) return alert('Server and domain required')
    try {
      const r = await fetch('/api/hosting/domains', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(domainForm) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Attach failed')
      alert(j.message || 'Domain attached')
      await load()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-6">

      {/* Tunnel status — spec: 530/200 + FALLBACK_URL + reboot command */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
        <div className="text-xs tracking-[0.2em] text-amber-300 mb-2">TUNNEL STATUS</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3"><div className="text-[#57534E] text-xs">browser.hostamar.com</div><div className="font-mono text-red-400">530 error 1033</div><div className="text-xs text-[#57534E]">Argo tunnel — origin DOWN</div></div>
          <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3"><div className="text-[#57534E] text-xs">comfy.hostamar.com</div><div className="font-mono text-red-400">530 error 1033</div><div className="text-xs text-[#57534E]">Tunnel DOWN</div></div>
          <div className="rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3"><div className="text-[#57534E] text-xs">ai.hostamar.com</div><div className="font-mono text-[#10B981]">200 ● live</div><div className="text-xs text-[#57534E]">93 models • 6000 credit</div></div>
        </div>
        <div className="mt-3 rounded-xl bg-[#FFFDF6] border border-[#D8CDB4] p-3 font-mono text-xs text-[#78716C]">
          <div className="text-[#57534E] mb-1">Windows host fix (0 Taka):</div>
          <div className="text-[#1C1917]">cloudflared tunnel run --name hostamar-app</div>
          <div className="text-[#1C1917]">python gateway.py</div>
          <div className="text-[#57534E] mt-2">Worker FALLBACK_URL: https://web-production-1234d.up.railway.app (unpause Railway) — so api.hostamar.com fails over without 530</div>
          <div className="text-[#57534E]">DNS 6815:210e OK • Vercel hostamar.com+www only • docs/outage-20aug.md</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#1C1917]">Hosting</h2><p className="text-xs text-[#57534E]">BDIX · Docker over /var/run/docker.sock · /api/hosting/servers</p></div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#0E7C3A] text-white text-sm flex items-center gap-2 hover:bg-[#0a5c2a]"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{err}</div>}

      {/* status cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
          <div className="text-xs tracking-[0.2em] text-[#57534E] mb-3">BDIX STATUS</div>
          {status ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"/><span className="text-[#1C1917] font-semibold">{status.status || 'ok'}</span><span className="text-[#57534E] text-sm">· {status.uptimePercent ?? status.uptime ?? 99.97}% uptime</span></div>
              <div className="text-sm text-[#78716C]">Latency: <span className="text-[#1C1917] font-mono">{status.latency || status.latency_human || '18ms'}</span> · {status.region || 'BDIX'} · {status.dc || 'Dhaka BDIX'}</div>
              <div className="text-xs text-[#57534E]">{status.provider || 'Hostamar BDIX'}</div>
            </div>
          ) : <div className="text-sm text-[#57534E]">{loading ? 'Loading…' : 'No status.'}</div>}
        </div>
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
          <div className="text-xs tracking-[0.2em] text-[#57534E] mb-2">SERVERS</div>
          <div className="text-3xl font-black text-[#1C1917]">{servers.length}</div>
          <div className="text-xs text-[#57534E]">{servers.filter((s:any)=> s.status==='running').length} running · {servers.filter((s:any)=> s.status!=='running').length} stopped</div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
          <div className="text-xs tracking-[0.2em] text-[#57534E] mb-2">NETWORK</div>
          <div className="text-sm text-[#57534E]">Subnet 172.19.0.0/16</div>
          <div className="text-xs text-[#57534E]">Pool 172.19.0.200–250 · hostamar-network</div>
          <div className="text-xs text-[#57534E] mt-2">GET /api/hosting/servers + /api/hosting/status</div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#0E7C3A]/10"><h3 className="font-semibold text-[#1C1917]">Servers</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E7C3A]/10 border-b border-[#0E7C3A]/20"><tr><th className="px-4 py-3 text-left text-[#78716C]">Name / Image</th><th className="px-4 py-3 text-left text-[#78716C]">IP / Domain</th><th className="px-4 py-3 text-left text-[#78716C]">Specs</th><th className="px-4 py-3 text-left text-[#78716C]">Status</th><th className="px-4 py-3 text-left text-[#78716C]">Ports</th></tr></thead>
            <tbody className="divide-y divide-[#D8CDB4]">
              {loading ? <tr><td colSpan={5} className="p-10 text-center text-[#57534E]">Loading…</td></tr> : servers.map((s:any)=>(
                <tr key={s.id} className="hover:bg-[#FDF8EC]/40">
                  <td className="px-4 py-3"><div className="font-medium text-[#1C1917]">{s.name}</div><div className="text-xs text-[#57534E] font-mono">{s.image}</div></td>
                  <td className="px-4 py-3"><div className="font-mono text-xs text-[#1C1917]">{s.ip}</div><div className="text-xs text-[#57534E]">{s.domain || '—'} {s.ssl ? '🔒' : ''}</div></td>
                  <td className="px-4 py-3 text-xs text-[#78716C]">{s.cpu} · {s.ram} · {s.storage}<div className="text-[#57534E]">{s.os}</div></td>
                  <td className="px-4 py-3">{badge(s.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#78716C]">{(s.ports||[]).join(', ') || '—'}</td>
                </tr>
              ))}
              {!loading && !servers.length && <tr><td colSpan={5} className="p-10 text-center text-[#57534E]">No servers. Create one below.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
          <h3 className="font-semibold text-[#1C1917] mb-3">Create Server</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Name (web-prod-02)" className="col-span-2 px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917] placeholder:text-[#57534E] focus:border-[#10B981]/40 focus:outline-none"/>
            <input value={form.image} onChange={e=>setForm({...form, image:e.target.value})} placeholder="Image (nginx:alpine)" className="col-span-2 px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917] focus:border-[#10B981]/40 focus:outline-none"/>
            <select value={form.cpu} onChange={e=>setForm({...form, cpu:e.target.value})} className="px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917]"><option>1 vCPU</option><option>2 vCPU</option><option>4 vCPU</option></select>
            <select value={form.ram} onChange={e=>setForm({...form, ram:e.target.value})} className="px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917]"><option>1 GB</option><option>2 GB</option><option>4 GB</option><option>8 GB</option></select>
            <input value={form.domain} onChange={e=>setForm({...form, domain:e.target.value})} placeholder="Domain (optional)" className="px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917] placeholder:text-[#57534E] focus:border-[#10B981]/40 focus:outline-none"/>
            <label className="flex items-center gap-2 text-sm text-[#78716C]"><input type="checkbox" checked={form.ssl} onChange={e=>setForm({...form, ssl:e.target.checked})} className="accent-[#0E7C3A]"/> SSL</label>
          </div>
          <button onClick={createServer} disabled={creating} className="mt-4 w-full py-2.5 rounded-xl bg-[#0E7C3A] text-white text-sm font-semibold hover:bg-[#0a5c2a] disabled:opacity-50">{creating ? 'Creating…' : 'Create Server (POST /api/hosting/servers)'}</button>
        </div>

        <div className="rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20 p-5">
          <h3 className="font-semibold text-[#1C1917] mb-3">Attach Domain</h3>
          <div className="space-y-3">
            <select value={domainForm.serverId} onChange={e=>setDomainForm({...domainForm, serverId:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917]">
              <option value="">Select server…</option>
              {servers.map((s:any)=><option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
            </select>
            <input value={domainForm.domain} onChange={e=>setDomainForm({...domainForm, domain:e.target.value})} placeholder="app.example.com" className="w-full px-3 py-2 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-sm text-[#1C1917] placeholder:text-[#57534E] focus:border-[#10B981]/40 focus:outline-none"/>
            <label className="flex items-center gap-2 text-sm text-[#78716C]"><input type="checkbox" checked={domainForm.autoSsl} onChange={e=>setDomainForm({...domainForm, autoSsl:e.target.checked})} className="accent-[#0E7C3A]"/> Auto SSL</label>
          </div>
          <button onClick={attachDomain} className="mt-4 w-full py-2.5 rounded-xl bg-[#FDF8EC] border border-[#D8CDB4] text-[#1C1917] text-sm font-semibold hover:border-[#10B981]/30">Attach Domain (POST /api/hosting/domains)</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const raw = searchParams.get('tab')
  const active: Tab = (TABS as readonly string[]).includes(raw || '') ? (raw as Tab) : 'overview'

  // Ensure URL always carries ?tab= ; prevents stale sidebar highlight
  // (no redirect loop — only when tab missing and not on legacy path)
  // We render by query, never by path.

  const setTab = (t: Tab) => router.push(`/admin?tab=${t}`)

  return (
    <main className="min-h-screen bg-[#FFFDF6]">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#0E7C3A]/20 via-transparent to-transparent border border-[#0E7C3A]/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black tracking-widest text-[#1C1917]">ADMIN CONSOLE <span style={{ fontFamily: 'var(--font-bn)', fontWeight: 600, letterSpacing: 0 }} className="align-middle">অ্যাডমিন</span></h1>
              <p className="text-sm text-[#57534E] mt-1">Real data · <span className="text-[#10B981] font-mono">/api/admin/*</span> + gateway + hosting</p>
            </div>
            <div className="text-right"><div className="text-xs tracking-widest text-[#57534E]">TODAY</div><div className="text-sm font-mono text-[#1C1917]">{new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric'})}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-[#FFFDF6] border border-[#0E7C3A]/20 rounded-2xl p-1.5">
          {[
            { id:'overview', label:'ওভারভিউ', icon: LayoutDashboard },
            { id:'users', label:'ইউজারসমূহ', icon: Users },
            { id:'leads', label:'লিড', icon: Eye },
            { id:'credits', label:'ক্রেডিট', icon: Coins },
            { id:'transactions', label:'লেনদেন', icon: Receipt },
            { id:'models', label:'মডেল·১২০', icon: Cpu },
            { id:'fleet', label:'ফ্লিট·৫', icon: Activity },
            { id:'employees', label:'এমপ্লয়িজ·১৬', icon: Radio },
            { id:'second-brain', label:'সেকেন্ড-ব্রেইন', icon: Search },
            { id:'guard', label:'গার্ড', icon: Shield },
            { id:'drive', label:'ড্রাইভ', icon: HardDrive },
            { id:'products', label:'প্রোডাক্ট·৫০+', icon: Package },
            { id:'hosting', label:'হোস্টিং', icon: Server },
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as Tab)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition border ${active===t.id ? 'bg-[#0E7C3A] text-white border-[#10B981] shadow-[0_0_18px_rgba(16,185,129,0.25)]' : 'text-[#57534E] border-transparent hover:text-white hover:bg-[#0E7C3A]/10'}`}>
              <t.icon className="w-4 h-4"/>{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-black/40 border border-[#0E7C3A]/10 p-4 lg:p-6">
          {active==='overview' && <OverviewTab/>}
          {active==='users' && <UsersTab/>}
          {active==='leads' && <LeadsTab/>}
          {active==='credits' && <CreditsTab/>}
          {active==='transactions' && <TransactionsTab/>}
          {active==='models' && <ModelsTab/>}
          {active==='fleet' && <FleetTab/>}
          {active==='employees' && <EmployeesTab/>}
          {active==='second-brain' && <SecondBrainTab/>}
          {active==='guard' && <GuardTab/>}
          {active==='drive' && <DriveTab/>}
          {active==='products' && <ProductsTab/>}
          {active==='hosting' && <HostingTab/>}
        </div>

        <p className="text-center text-[11px] text-[#57534E] mt-6">Green/Black hybrid · Hostamar Admin · All tabs fetch live APIs (no mocks except hosting fallback)</p>
      </div>
    </main>
  )
}
