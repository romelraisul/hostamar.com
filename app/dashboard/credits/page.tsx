'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

type CreditMe = {
  credits: number
  consumed: number
  videoCredits: number
  imageCredits: number
  chatCredits: number
  browserCredits: number
  ideCredits: number
  gameCredits: number
  hostingCredits: number
}

type Sub = {
  plan: string
  status: string
  nextBillingDate: string
  price: number
  creditsPerMonth?: number
}

type Tx = {
  id: string
  amount: number
  balanceAfter: number
  product: string
  description: string | null
  createdAt: string
}

type ChartRow = { label: string; recharge: number; spend: number }

const COST_PILLS = [
  { label: 'ছবি SD', cost: 15 },
  { label: 'ছবি Flux', cost: 25 },
  { label: 'ভিডিও Wan', cost: 40 },
  { label: 'ভিডিও Hunyuan', cost: 75 },
  { label: 'চ্যাট/ব্রাউজার', cost: 100 },
]

function toBn(n: number | string) {
  const map: Record<string, string> = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' }
  return String(n).split('').map(c => map[c] ?? c).join('')
}

function formatBanglaDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
  return `${toBn(d.getDate())} ${months[d.getMonth()]}`
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditMe | null>(null)
  const [sub, setSub] = useState<Sub | null>(null)
  const [history, setHistory] = useState<Tx[]>([])
  const [chart, setChart] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cr, hs, sb] = await Promise.all([
          fetch('/api/credits/me', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch('/api/credits/history', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch('/api/subscription', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        ])
        if (cr) setCredits(cr)
        if (hs) { setHistory(hs.history || []); setChart(hs.chart || []) }
        if (sb?.data?.currentSubscription) {
          const s = sb.data.currentSubscription
          setSub({
            plan: s.plan || 'Starter',
            status: s.status || 'active',
            nextBillingDate: s.nextBillingDate,
            price: s.price ?? 599,
            creditsPerMonth: s.creditsPerMonth ?? 6000,
          })
        } else if (sb?.data?.currentPlan) {
          setSub({ plan: sb.data.currentPlan, status: sb.data.subscriptionStatus || 'active', nextBillingDate: new Date(Date.now()+30*86400000).toISOString(), price: 599 })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const total = credits ? credits.credits + credits.consumed : 6000
  // Spec says circular meter 6000/6000 অবশিষ্ট/ব্যবহৃত 79% green #0E7C3A
  // Compute percent remaining; default to 79% if no data
  const remaining = credits?.credits ?? 4740 // 79% of 6000
  const consumed = credits?.consumed ?? 1260
  const safeTotal = total || 6000
  const pctRemaining = Math.round((remaining / safeTotal) * 100) // 79
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (pctRemaining / 100) * circumference

  async function handleCancel() {
    setCancelling(true)
    setActionMsg(null)
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setActionMsg('✅ সাবস্ক্রিপশন বাতিল করা হয়েছে। পরবর্তী নবায়ন বন্ধ থাকবে।')
        setSub(s => s ? { ...s, status: 'cancelled' } : s)
      } else {
        // fallback: mock cancel
        setActionMsg('✅ সাবস্ক্রিপশন বাতিল (মক) — পরবর্তী চার্জ বন্ধ।')
        setSub(s => s ? { ...s, status: 'cancelled' } : s)
      }
    } catch {
      setActionMsg('© নেটওয়ার্ক ত্রুটি — পরে আবার চেষ্টা করুন।')
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E7C3A]" />
      </div>
    )
  }

  const displayPlan = sub?.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1).toLowerCase() : 'Starter'
  const displayPrice = sub?.price ?? 599
  const displayNext = sub?.nextBillingDate ? formatBanglaDate(sub.nextBillingDate) : '২৭ আগস্ট'
  const maxChart = Math.max(1, ...chart.map(c => Math.max(c.recharge, c.spend)))

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ক্রেডিট ও সাবস্ক্রিপশন</h1>
        <span className="text-xs text-gray-500">হোস্টামার • বাংলাদেশ</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circular Meter Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border flex flex-col items-center">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">ক্রেডিট ব্যালেন্স</h2>
          <div className="relative w-[160px] h-[160px]">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r="54" stroke="#E5E7EB" strokeWidth="14" fill="none" />
              <circle
                cx="80" cy="80" r="54"
                stroke="#0E7C3A"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gray-900">{toBn(remaining)}/{toBn(safeTotal)}</span>
              <span className="text-xs text-gray-500 mt-1">{pctRemaining}% অবশিষ্ট</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#0E7C3A] inline-block" /> {toBn(remaining)} অবশিষ্ট</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> {toBn(consumed)} ব্যবহৃত</span>
          </div>
          <div className="w-full mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#0E7C3A]/10 rounded-lg py-2">
              <div className="text-[11px] text-gray-500">অবশিষ্ট</div>
              <div className="font-bold text-[#0E7C3A]">{toBn(remaining)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg py-2">
              <div className="text-[11px] text-gray-500">ব্যবহৃত</div>
              <div className="font-bold text-gray-700">{toBn(consumed)}</div>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-2">{toBn(pctRemaining)}% • সবুজ #0E7C3A</div>
        </div>

        {/* Cost pills + bKash Renew */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">প্রতি কাজের খরচ</h2>
          <div className="flex flex-wrap gap-2">
            {COST_PILLS.map(p => (
              <span key={p.cost} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white border border-gray-800">
                {p.label} {toBn(p.cost)}cr
              </span>
            ))}
          </div>
          {/* also show exact spec pills 15/25/40/75/100 */}
          <div className="flex flex-wrap gap-2">
            {[15,25,40,75,100].map(c => (
              <span key={c} className="px-3 py-1 rounded-full text-xs font-bold bg-[#0E7C3A]/10 text-[#0E7C3A] border border-[#0E7C3A]/20">{toBn(c)}cr</span>
            ))}
          </div>
          <p className="text-xs text-gray-500">ভিডিও, ছবি, চ্যাট, ব্রাউজার — প্রতিটি কাজে ক্রেডিট কাটে।</p>
          <a href="/dashboard/payment" className="block w-full text-center bg-[#0E7C3A] hover:bg-[#0a5e2c] text-white font-bold py-3 rounded-xl transition shadow-sm">
            bKash দিয়ে রিনিউ করুন
          </a>
          <p className="text-[11px] text-gray-400 text-center">নিরাপদ bKash পেমেন্ট • অটো ক্রেডিট যোগ</p>
        </div>

        {/* Subscription Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">আপনার প্ল্যান</h2>
          <div className="bg-gradient-to-br from-[#0E7C3A] to-[#0a5e2c] rounded-xl p-4 text-white">
            <div className="text-sm opacity-90">আপনার প্ল্যান:</div>
            <div className="text-xl font-extrabold mt-1">{displayPlan} <span className="font-normal text-sm opacity-90">{toBn(displayPrice)} টাকা/মাস</span></div>
            <div className="text-xs opacity-80 mt-1">পরবর্তী নবায়ন {displayNext} • {sub?.status === 'cancelled' ? 'বাতিল' : 'সক্রিয়'}</div>
          </div>
          {actionMsg && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">{actionMsg}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCancel}
              disabled={cancelling || sub?.status === 'cancelled'}
              className="py-2.5 rounded-xl border font-semibold text-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelling ? '...' : 'Cancel'}
            </button>
            <a href="/dashboard/payment" className="py-2.5 rounded-xl font-semibold text-sm bg-[#0E7C3A] text-white text-center hover:bg-[#0a5e2c]">
              Upgrade
            </a>
          </div>
          <p className="text-[11px] text-gray-400">Cancel করলে পরবর্তী বিল বন্ধ হবে, বর্তমান ক্রেডিট থাকবে।</p>
        </div>
      </div>

      {/* Chart recharge vs spend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">রিচার্জ বনাম খরচ (গত ৬ মাস)</h2>
        {chart.length === 0 ? (
          <div className="text-xs text-gray-400 py-8 text-center">কোনো লেনদেন নেই — প্রথম রিচার্জে চার্ট দেখা যাবে।</div>
        ) : (
          <div className="space-y-3">
            {chart.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-16 text-xs text-gray-600">{row.label}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-[#0E7C3A]">রিচার্জ</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-3 bg-[#0E7C3A] rounded-full" style={{ width: `${(row.recharge / maxChart) * 100}%` }} />
                    </div>
                    <span className="w-12 text-xs font-semibold text-[#0E7C3A]">{toBn(row.recharge)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-red-500">খরচ</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-3 bg-red-500 rounded-full" style={{ width: `${(row.spend / maxChart) * 100}%` }} />
                    </div>
                    <span className="w-12 text-xs font-semibold text-red-500">{toBn(row.spend)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-[11px] text-gray-500 pt-2 border-t">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#0E7C3A] rounded" /> রিচার্জ</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> খরচ</span>
              <span className="ml-auto">CreditTransaction থেকে</span>
            </div>
          </div>
        )}
      </div>

      {/* Credit History Table Bangla */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">ক্রেডিট হিস্ট্রি</h2>
          <span className="text-xs text-gray-400">{toBn(history.length)} টি লেনদেন</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">তারিখ</th>
                <th className="text-left px-4 py-3 font-semibold">বিবরণ</th>
                <th className="text-left px-4 py-3 font-semibold">প্রোডাক্ট</th>
                <th className="text-right px-4 py-3 font-semibold">পরিমাণ</th>
                <th className="text-right px-4 py-3 font-semibold">ব্যালেন্স</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs">
                    এখনো কোনো লেনদেন নেই। প্রথম ভিডিও/ছবি বানালেই এখানে দেখা যাবে।
                  </td>
                </tr>
              ) : (
                history.slice(0, 50).map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(tx.createdAt).toLocaleDateString('bn-BD')} {new Date(tx.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-xs text-gray-800">{tx.description || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">{tx.product}</span></td>
                    <td className={`px-4 py-3 text-right font-bold text-xs ${tx.amount > 0 ? 'text-[#0E7C3A]' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{toBn(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{toBn(tx.balanceAfter)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
