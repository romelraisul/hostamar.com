'use client'
import { useEffect, useState } from 'react'

interface Row { id:string; status:string; bonusAmount:number; createdAt:string; referrerName:string; referrerEmail:string; referrerCode:string|null; referredName:string; referredEmail:string; referredAt:string }

export default function AdminReferralsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [approving, setApproving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/referrals?status=${filter}`, { credentials:'include' })
      const j = await r.json()
      setRows(j.referrals||[])
    } catch {} finally{ setLoading(false) }
  }
  useEffect(()=>{ load() }, [filter])

  async function approve(id:string){
    setApproving(id); setMsg('')
    try{
      const r = await fetch(`/api/admin/referrals/${id}/approve`, { method:'POST', credentials:'include' })
      const j = await r.json().catch(()=>({}))
      if(r.ok) { setMsg('✅ '+ (j.message||'পেআউট সম্পন্ন')); load() }
      else setMsg('❌ '+(j.error||'ব্যর্থ'))
    } catch(e:any){ setMsg('❌ '+(e.message||'error'))}
    finally{ setApproving(null)}
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="bangla text-2xl font-bold">রেফারেল ম্যানেজমেন্ট</h1>
      <p className="bangla text-sm text-zinc-500">প্রতি সফল রেফারেলে রেফারার পায় ৫০০ ক্রেডিট + ৬০ টাকা — পেন্ডিং থেকে পেইড করুন।</p>

      <div className="flex gap-2 mt-4">
        {[
          ['all','সব'],
          ['pending','পেন্ডিং'],
          ['paid','পেইড'],
        ].map(([k,l])=> (
          <button key={k} onClick={()=>setFilter(k)} className={`bangla px-4 py-2 rounded-full text-sm border ${filter===k?'bg-[#0E7C3A] text-white border-[#0E7C3A]':'bg-white border-zinc-200'}`}>{l}</button>
        ))}
        <button onClick={load} className="bangla ml-auto px-4 py-2 rounded-full bg-white border border-zinc-200 text-sm">রিফ্রেশ</button>
      </div>

      {msg && <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">{msg}</div>}

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left px-3 py-2 bangla">রেফারার</th>
                <th className="text-left px-3 py-2 bangla">রেফারড</th>
                <th className="text-left px-3 py-2 bangla">কোড</th>
                <th className="text-left px-3 py-2 bangla">স্ট্যাটাস</th>
                <th className="text-left px-3 py-2 bangla">বোনাস</th>
                <th className="text-left px-3 py-2 bangla">তারিখ</th>
                <th className="text-left px-3 py-2 bangla">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500 bangla">লোড হচ্ছে...</td></tr>
              ) : rows.length===0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500 bangla">কোনো রেফারেল নেই</td></tr>
              ) : rows.map(r=> (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2"><div className="font-medium">{r.referrerName}</div><div className="text-xs text-zinc-500">{r.referrerEmail}</div></td>
                  <td className="px-3 py-2"><div className="font-medium">{r.referredName}</div><div className="text-xs text-zinc-500">{r.referredEmail}</div></td>
                  <td className="px-3 py-2 font-mono text-xs">{r.referrerCode||'-'}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${['paid','PAID'].includes(r.status)?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                  <td className="px-3 py-2">{r.bonusAmount}৳ + 500cr</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString('bn-BD')}</td>
                  <td className="px-3 py-2">
                    {['pending','PENDING'].includes(r.status) ? (
                      <button disabled={approving===r.id} onClick={()=>approve(r.id)} className="bangla px-3 py-1.5 rounded-full bg-[#0E7C3A] text-white text-xs font-semibold disabled:bg-zinc-300">
                        {approving===r.id ? '...' : 'পেআউট অনুমোদন'}
                      </button>
                    ) : <span className="bangla text-xs text-zinc-400">সম্পন্ন</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bangla mt-4 p-4 rounded-xl bg-[#0E7C3A]/10 border border-[#0E7C3A]/20 text-sm text-zinc-700">
        <b>নিয়ম:</b> বন্ধু সাইনআপ করলে <b>pending (৬০ টাকা)</b> — প্রথম পেমেন্ট ভেরিফাই হলে <b>paid</b> ও রেফারার পায় <b>৫০০ ক্রেডিট + ৬০ টাকা</b> (১০% starter)। অ্যাডমিন ম্যানুয়ালি অনুমোদনও করতে পারেন।
      </div>
    </div>
  )
}
