'use client'
import { useEffect, useState } from 'react'
import { getAllServices, CATEGORIES, STRIP_COLOR } from '@/lib/services/catalog'
import { Search, Sparkles, Coins, CreditCard, Download, Clock, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Service = ReturnType<typeof getAllServices>[number]
type Order = { id: string; serviceId: string; creditCost: number; status: string; createdAt: string; resultUrl?: string }

export default function ServicesStorePage() {
  const [services] = useState(() => getAllServices())
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'popular'|'low'|'high'>('popular')
  const [credits, setCredits] = useState(6000)
  const [loadingCredits, setLoadingCredits] = useState(true)
  const [selected, setSelected] = useState<Service | null>(null)
  const [inputs, setInputs] = useState<Record<string,string>>({})
  const [orders, setOrders] = useState<Order[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(()=>{
    fetch('/api/credits/balance').then(r=>r.json()).then(d=>{
      if (d?.balance?.credits!=null) setCredits(d.balance.credits)
    }).catch(()=>{}).finally(()=>setLoadingCredits(false))
    fetch('/api/services/orders?limit=20').then(r=>r.json()).then(d=>{ if (Array.isArray(d.orders)) setOrders(d.orders) }).catch(()=>{})
  }, [])

  const filtered = services.filter(s=>{
    if (cat!=='all' && s.category!==cat) return false
    if (search && !(`${s.name} ${s.nameBn} ${s.benefitBn} ${s.perfectForBn}`.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  }).sort((a,b)=>{
    if (sort==='low') return a.creditCost - b.creditCost
    if (sort==='high') return b.creditCost - a.creditCost
    return (b as any).popular - (a as any).popular
  })

  const used = 6000 - credits
  const pct = Math.max(4, Math.min(100, Math.round((credits/6000)*100)))

  const activate = async (s: Service) => {
    if (credits < s.creditCost) return
    setBusyId(s.id)
    try {
      const res = await fetch('/api/services/activate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ serviceId: s.id, inputs }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'failed')
      setCredits(c=>c - s.creditCost)
      // fake 3s generation then delivered
      const newOrder: Order = { id: j.orderId || `ord-${Date.now()}`, serviceId: s.id, creditCost: s.creditCost, status:'queued', createdAt: new Date().toISOString() }
      setOrders(o=>[newOrder, ...o])
      setSelected(null)
      setTimeout(()=> setOrders(o=> o.map(x=> x.id===newOrder.id? {...x, status:'delivered', resultUrl: `/results/${newOrder.id}.json`}:x)), 3000)
    } catch(e:any){ alert(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Bangla */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#0E7C3A] grid place-items-center text-white font-bold">H</div>
            <div>
              <div className="font-semibold">Hostamar <span className="text-[#0E7C3A]">AI স্টোর</span> <span className="text-xs font-normal text-zinc-500">• ৫০ সার্ভিস • ৬০০০ ক্রেডিট</span></div>
              <div className="text-[11px] text-zinc-500">AI Store — 6000 credit = currency, 1 click = AI delivers</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="hidden md:flex items-center gap-3 rounded-2xl border bg-white px-4 py-2 shadow-sm">
              <div className="text-center">
                <div className="text-[11px] tracking-wide font-semibold text-zinc-500">ক্রেডিট</div>
                <div className="font-bold tabular-nums">{credits.toLocaleString()} / 6000</div>
                <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-[#0E7C3A]" style={{width:`${pct}%`}}/></div>
                <div className="text-[11px] text-zinc-500">ব্যবহৃত {used} / অবশিষ্ট {credits}</div>
              </div>
              <div className="hidden lg:flex gap-1.5 text-[11px]">
                {['15cr','25cr','40cr','75cr','100cr'].map(c=> <span key={c} className="bg-zinc-900 text-white px-2 py-1 rounded-full">{c}</span>)}
              </div>
              <Link href="/dashboard/payment" className="bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"><CreditCard className="w-3 h-3"/> bKash রিনিউ</Link>
              <span className="text-xs bg-zinc-100 px-2 py-1 rounded-full">⌘K</span>
            </div>
          </div>
        </div>
        {/* Mobile credit bar */}
        <div className="md:hidden mt-3 rounded-xl bg-[#0E7C3A] text-white p-3 flex items-center justify-between">
          <span className="text-sm font-bold">৬০০০ ক্রেডিট • ৪০cr গড় • এখনই এক্টিভেট করুন সবুজ</span>
          <span className="text-xs bg-white text-[#0E7C3A] px-2 py-1 rounded-full">{pct}%</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-6">
        {/* Sidebar categories Bangla */}
        <aside className="space-y-2">
          {CATEGORIES.map(c=>(
            <button key={c.key} onClick={()=>setCat(c.key)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border ${cat===c.key?'bg-[#0E7C3A] text-white border-[#0E7C3A]':'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
              {c.labelBn} <span className="float-right text-xs opacity-70">{c.count}</span>
            </button>
          ))}
          <div className="pt-4 space-y-2">
            <h4 className="font-semibold text-sm">চলমান কাজ</h4>
            {orders.filter(o=>o.status!=='delivered').slice(0,3).map(o=>(
              <div key={o.id} className="rounded-xl border bg-white p-3 text-sm">
                <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin text-[#0E7C3A]"/> {o.serviceId} — {o.status==='queued'?'অপেক্ষায়':'তৈরি হচ্ছে...'}</div>
                <div className="h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-[#0E7C3A] animate-pulse" style={{width:'60%'}}/></div>
              </div>
            ))}
            {orders.filter(o=>o.status!=='delivered').length===0 && <p className="text-xs text-zinc-500">কোনো চলমান কাজ নেই</p>}
          </div>
        </aside>

        {/* Main */}
        <main>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="৫০টি সার্ভিস খুঁজুন..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"/>
            </div>
            <select value={sort} onChange={e=>setSort(e.target.value as any)} className="rounded-xl border bg-white px-3 py-2.5 text-sm">
              <option value="popular">জনপ্রিয়</option>
              <option value="low">ক্রেডিট কম থেকে বেশি</option>
              <option value="high">ক্রেডিট বেশি থেকে কম</option>
            </select>
          </div>
          <div className="text-sm text-zinc-500 mb-2">{filtered.length} / 50 সার্ভিস</div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(s=>(
              <div key={s.id} className="rounded-2xl border bg-white shadow-sm hover:shadow-md overflow-hidden flex flex-col">
                <div className={`h-1.5 ${STRIP_COLOR[s.category]||'bg-[#0E7C3A]'}`}/>
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-[11px] font-bold text-zinc-500">#{s.id}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-zinc-50">{s.categoryBn}</span>
                    </div>
                    <span className="bg-[#0E7C3A] text-white text-xs px-2 py-1 rounded-full font-bold">{s.creditCost}cr</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-sm leading-tight">{s.nameBn}</h3>
                  <p className="text-xs text-zinc-500">{s.name}</p>
                  <p className="mt-2 text-xs text-zinc-700">{s.benefitBn}</p>
                  <p className="mt-1 text-[11px] inline-flex bg-zinc-100 px-2 py-1 rounded-full">জন্য: {s.perfectForBn}</p>
                </div>
                <div className="p-3 border-t bg-zinc-50">
                  <button disabled={credits < s.creditCost || busyId===s.id} onClick={()=> setSelected(s)} className="w-full rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white text-sm font-bold py-2.5 flex items-center justify-center gap-2">
                    {busyId===s.id? <><Loader2 className="w-4 h-4 animate-spin"/> তৈরি হচ্ছে...</> : `${s.creditCost}cr • এক্টিভেট করুন`}
                  </button>
                  {credits < s.creditCost && <p className="text-[11px] text-red-600 text-center mt-1">ক্রেডিট কম — রিনিউ করুন</p>}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right panels Bangla */}
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4"/> সাম্প্রতিক ডেলিভারি</h4>
            {orders.filter(o=>o.status==='delivered').slice(0,3).map(o=>(
              <div key={o.id} className="mt-3 flex items-center justify-between text-sm border-t pt-3">
                <span>{o.serviceId}</span>
                <a href={o.resultUrl||'#'} className="text-xs bg-[#0E7C3A] text-white px-2 py-1 rounded-full flex items-center gap-1"><Download className="w-3 h-3"/> ডাউনলোড করুন</a>
              </div>
            ))}
            {orders.filter(o=>o.status==='delivered').length===0 && <p className="text-xs text-zinc-500 mt-2">কোনো ডেলিভারি নেই — এক্টিভেট করুন</p>}
            <Link href="/dashboard/services/orders" className="mt-3 block text-xs text-[#2563EB] hover:underline">হিস্ট্রি দেখুন →</Link>
          </div>
          <div className="rounded-2xl bg-[#0E7C3A] text-white p-4">
            <h4 className="font-semibold text-sm">ক্রেডিট হিস্ট্রি</h4>
            <div className="mt-2 h-2 bg-black/20 rounded-full overflow-hidden"><div className="h-full bg-white" style={{width:`${pct}%`}}/></div>
            <div className="mt-2 flex justify-between text-xs"><span>ব্যবহৃত {used}</span><span>অবশিষ্ট {credits}</span></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {filtered.slice(0,6).map(s=> <div key={s.id} className="bg-white/15 rounded-lg p-2 text-center">{s.creditCost}cr<br/><span className="text-[10px] opacity-80">{s.nameBn.slice(0,12)}</span></div>)}
            </div>
          </div>
        </aside>
      </div>

      {/* Activate Modal Bangla */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setSelected(null)}/>
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold">{selected.nameBn} — {selected.creditCost}cr</h3>
            <p className="text-sm text-zinc-500">{selected.benefitBn}</p>
            {((Array.isArray(selected.inputs) ? selected.inputs : Object.values(selected.inputs as any)) as any[]).map((inp:any)=>(
              <div key={inp.key || inp.labelBn} className="mt-3">
                <label className="text-sm font-medium">{inp.labelBn || inp.label}</label>
                <input value={inputs[inp.key]||''} onChange={e=>setInputs({...inputs,[inp.key]:e.target.value})} placeholder={inp.placeholder} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/>
              </div>
            ))}
            <div className="mt-4 flex gap-2">
              <button onClick={()=>setSelected(null)} className="flex-1 rounded-full border py-2.5 text-sm">বাতিল</button>
              <button onClick={()=> activate(selected)} disabled={busyId===selected.id} className="flex-1 rounded-full bg-[#0E7C3A] text-white py-2.5 text-sm font-bold">{busyId? 'তৈরি হচ্ছে...':'এক্টিভেট করুন'}</button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 text-center">{credits} → {credits - selected.creditCost} ক্রেডিট</p>
          </div>
        </div>
      )}

      {/* Sticky bottom CTA mobile 320px */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex items-center justify-between">
        <span className="text-sm font-bold">৬০০০ ক্রেডিট • ৪০cr গড়</span>
        <span className="bg-[#0E7C3A] text-white px-4 py-2 rounded-full text-sm font-bold">এখনই এক্টিভেট করুন সবুজ</span>
      </div>
    </div>
  )
}
