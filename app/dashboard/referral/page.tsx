'use client'
import { useEffect, useState } from 'react'
import { Users, Copy, Check, Gift, Wallet, Share2, Trophy } from 'lucide-react'

interface ReferralRow { name: string; email: string; status: string; joinedAt?: string; createdAt?: string; bonusAmount?: number; id?: string }

export default function ReferralPage() {
  const [code, setCode] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pending, setPending] = useState(0)
  const [paid, setPaid] = useState(0)
  const [earnedCr, setEarnedCr] = useState(0)
  const [earnedTk, setEarnedTk] = useState(0)
  const [rows, setRows] = useState<ReferralRow[]>([])
  const [copied, setCopied] = useState(false)
  const [withdrawMsg, setWithdrawMsg] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      // try new code endpoints first
      let data: any = null
      const r1 = await fetch('/api/referral', { credentials: 'include', cache: 'no-store' }).catch(()=>null)
      if (r1?.ok) { const j = await r1.json(); if (j?.data) data = j.data }
      if (!data) {
        const r2 = await fetch('/api/referral/code', { credentials: 'include' }).catch(()=>null)
        if (r2?.ok) { const j = await r2.json(); data = { referralCode: j.code, referralLink: j.link } }
      }
      if (!data) { setLoading(false); return }
      const c = data.referralCode || data.code || ''
      setCode(c)
      // spec link: https://hostamar.com/?ref=CODE  (homepage)
      setLink(data.referralLink || `https://hostamar.com/?ref=${c}`)
      const referrals: ReferralRow[] = data.referrals || []
      setRows(referrals)
      const totalCount = data.referredCount ?? data.totalReferrals ?? referrals.length
      const completed = data.completedCount ?? data.paidCount ?? referrals.filter((r:any)=> ['PAID','paid','COMPLETED','completed'].includes(r.status)).length
      const pend = data.pendingCount ?? referrals.filter((r:any)=> ['PENDING','pending'].includes(r.status)).length
      setTotal(totalCount)
      setPaid(completed)
      setPending(pend)
      // earned from API or compute
      if (data.earnedCredits != null) setEarnedCr(data.earnedCredits)
      else if (data.totalBonus != null) setEarnedCr(completed * 500) // fallback tier bonus
      else setEarnedCr(completed * 500)
      if (data.earnedTaka != null) setEarnedTk(data.earnedTaka)
      else if (data.totalBonus != null && completed > 0) {
        // if old API totalBonus is tier sum, override with per-referral commission
        const tk = referrals.filter((r:any)=> ['PAID','paid','COMPLETED'].includes(r.status)).reduce((s:number, r:any)=> s + (r.bonusAmount||60),0) || completed*60
        setEarnedTk(tk)
      } else setEarnedTk(referrals.filter((r:any)=> ['PAID','paid'].includes(r.status)).reduce((s:number,r:any)=> s+(r.bonusAmount||0),0) || completed*60)
      // try fresh admin-like aggregate via referrals endpoint if needed
    } catch {} finally { setLoading(false) }
  }

  // also fetch aggregate from our lib stats if available (best numbers)
  useEffect(()=> {
    fetch('/api/referral', { credentials:'include' }).then(r=>r.json()).then(j=>{
      if (j?.data?.referralCode) {
        // re-use computed but ensure 500cr+60Tk per paid
        const d=j.data
        const completed = d.completedCount ?? d.paidCount ?? 0
        if (completed) {
          // if API already computed earned, keep; else compute
        }
      }
    }).catch(()=>{})
  },[])

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(()=>setCopied(false),1800)
  }

  async function withdraw() {
    setWithdrawLoading(true); setWithdrawMsg('')
    try {
      const res = await fetch('/api/referral/withdraw', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ method:'bKash' }) })
      const j = await res.json().catch(()=>({}))
      if (res.ok) setWithdrawMsg('✅ উত্তোলন রিকোয়েস্ট জমা হয়েছে — bKash এ ২৪ ঘণ্টার মধ্যে পাবেন।')
      else setWithdrawMsg(j.error || '❌ উত্তোলন ব্যর্থ — অ্যাডমিনের সাথে যোগাযোগ করুন।')
    } catch { setWithdrawMsg('❌ নেটওয়ার্ক সমস্যা।') }
    finally { setWithdrawLoading(false) }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 bangla">লোড হচ্ছে...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="bangla text-2xl md:text-3xl font-bold text-zinc-900">রেফারেল</h1>
        <p className="bangla text-sm text-zinc-500 mt-1">বন্ধুকে ইনভাইট করুন — প্রতি সফল রেফারেলে <b className="text-[#0E7C3A]">৫০০ ক্রেডিট + ৬০ টাকা</b> বোনাস!</p>
      </div>

      {/* Code & Link card */}
      <div className="rounded-[20px] border border-[#0E7C3A]/20 bg-gradient-to-br from-[#0E7C3A] to-[#14a34a] text-white p-5 md:p-6">
        <div className="flex items-center gap-2 mb-3"><Gift className="w-5 h-5"/> <span className="bangla font-bold">আপনার রেফারেল কোড</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-2 rounded-xl bg-white text-[#0E7C3A] font-mono font-extrabold text-xl tracking-widest">{code || 'ABC123'}</span>
          <button onClick={async()=>{
            if(!code){
              const r=await fetch('/api/referral/create',{method:'POST',credentials:'include'}); const j=await r.json(); if(j.code){setCode(j.code); setLink(j.link)}
            }
          }} className="bangla text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-full">কোড তৈরি করুন</button>
        </div>
        <div className="mt-4">
          <div className="bangla text-xs text-white/80 mb-1">রেফারেল লিংক</div>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 px-3 py-2.5 rounded-xl bg-white text-zinc-800 text-sm font-mono truncate" />
            <button onClick={copy} className="px-4 py-2.5 rounded-xl bg-white text-[#0E7C3A] font-semibold text-sm flex items-center gap-1.5 hover:bg-zinc-50">
              {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>} {copied ? 'কপি হয়েছে' : 'কপি'}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-center text-sm font-medium flex items-center justify-center gap-1"><Share2 className="w-4 h-4"/> Facebook</a>
            <a href={`https://wa.me/?text=${encodeURIComponent('Hostamar এ জয়েন করুন — আমার রেফারেলে ৫০০ ক্রেডিট বোনাস! '+link)}`} target="_blank" className="flex-1 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-center text-sm font-medium">WhatsApp</a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 text-zinc-500 text-sm bangla"><Users className="w-4 h-4"/> মোট রেফারেল</div>
          <div className="text-3xl font-extrabold mt-1">{total}</div>
          <div className="text-xs text-zinc-500 bangla">{paid} টি পেইড • {pending} টি পেন্ডিং</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 text-zinc-500 text-sm bangla"><Trophy className="w-4 h-4 text-[#0E7C3A]"/> অর্জিত ক্রেডিট</div>
          <div className="text-3xl font-extrabold text-[#0E7C3A] mt-1">{earnedCr.toLocaleString('bn-BD')} ক্রেডিট</div>
          <div className="text-xs text-zinc-500">500cr × {paid} = {earnedCr}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 text-zinc-500 text-sm bangla"><Wallet className="w-4 h-4 text-amber-600"/> অর্জিত টাকা</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{earnedTk.toLocaleString('bn-BD')} টাকা</div>
          <div className="text-xs text-zinc-500">60৳ × {paid} (10% starter)</div>
        </div>
      </div>

      {/* Withdraw */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="bangla font-semibold">টাকা উত্তোলন</div>
          <div className="bangla text-sm text-zinc-500">bKash এর মাধ্যমে টাকা তুলুন — মিনিমাম ১০০ টাকা</div>
          {withdrawMsg && <div className="text-sm mt-1">{withdrawMsg}</div>}
        </div>
        <button onClick={withdraw} disabled={withdrawLoading || earnedTk < 100} className="bangla px-6 py-3 rounded-xl bg-[#0E7C3A] hover:bg-[#0a5a2b] disabled:bg-zinc-300 text-white font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4"/> {withdrawLoading ? 'প্রসেস হচ্ছে...' : 'bKash এ উত্তোলন করুন'}
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="bangla font-bold mb-2">কিভাবে কাজ করে?</h3>
        <ol className="bangla list-decimal list-inside space-y-1 text-sm text-zinc-600">
          <li>উপরে লিংক কপি করে বন্ধুকে পাঠান (https://hostamar.com/?ref=ABC123)</li>
          <li>বন্ধু আপনার লিংকে ক্লিক করে সাইনআপ করলে রেফারেল <b>pending</b> হবে (৬০ টাকা)</li>
          <li>বন্ধুর প্রথম পেমেন্ট (bKash/Stripe/PayPal) সফল হলে আপনি পাবেন <b>৫০০ ক্রেডিট + ৬০ টাকা</b> — স্ট্যাটাস <b>paid</b></li>
          <li>যেমন ৫ জন পেইড হলে ১৫০০ ক্রেডিট নয়, ৫×৫০০=২৫০০ ক্রেডিট; ৩ জন = ১৫০০ ক্রেডিট + ১৮০ টাকা (উদাহরণ)</li>
        </ol>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <span className="bangla font-semibold">আমার রেফারেল তালিকা</span>
          <span className="text-xs text-zinc-500">{rows.length} জন</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 bangla">এখনো কোনো রেফারেল নেই — লিংক শেয়ার করুন!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr><th className="text-left px-4 py-2 bangla">বন্ধু</th><th className="text-left px-4 py-2">ইমেইল</th><th className="text-left px-4 py-2 bangla">স্ট্যাটাস</th><th className="text-left px-4 py-2 bangla">বোনাস</th><th className="text-left px-4 py-2 bangla">তারিখ</th></tr>
              </thead>
              <tbody>
                {rows.map((r,i)=> (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-zinc-600">{r.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${['paid','PAID','COMPLETED','completed'].includes(r.status) ? 'bg-[#0E7C3A]/10 text-[#0E7C3A]' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2">{r.bonusAmount ?? 60}৳ + 500cr</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">{r.joinedAt ? new Date(r.joinedAt).toLocaleDateString('bn-BD') : r.createdAt ? new Date(r.createdAt).toLocaleDateString('bn-BD') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
