import Link from 'next/link'

export const metadata = {
  title: 'Hostamar Labs — AI Desk, Token Safety, BTC Monitor & More',
  description:
    'Hostamar Labs — AI দিয়ে স্ক্যাম থেকে বাঁচুন, টোকেন সেফটি মনিটর, BTC Up/Down প্রেডিকশন, পেপার ট্রেডিং — ৮টি এজেন্ট, ০ টাকা। Paper Trading Only, কোনো Private Key লাগে না।',
  keywords: ['Hostamar Labs', 'AI Desk', 'token safety', 'BTC monitor', 'paper trading', 'crypto scam detection'],
  openGraph: {
    title: 'Hostamar Labs — AI Desk & Token Safety',
    description: '৮ AI এজেন্ট — Search, Risk, Rug, Whale, Shill, Sniper, Safety, Exit। Paper Trading Only, no Private Key.',
  },
}

const GREEN = '#0E7C3A'

const AGENTS = [
  { icon: '🔍', name: 'Search', desc: 'টোকেন খুঁজুন — নাম, সিম্বল, কন্ট্রাক্ট দিয়ে', color: 'bg-blue-50 border-blue-200' },
  { icon: '⚠️', name: 'Risk', desc: 'হোয়াইটপেপার + অডিট + সেন্ট্রালাইজেশন স্কোর', color: 'bg-yellow-50 border-yellow-200' },
  { icon: '🪤', name: 'Rug', desc: 'Rug-pull চেক — লিকুইডিটি লক, ওয়ালেট কনসনট্রেশন', color: 'bg-red-50 border-red-200' },
  { icon: '🐋', name: 'Whale', desc: 'বড় ওয়ালেট মুভমেন্ট ট্র্যাক', color: 'bg-purple-50 border-purple-200' },
  { icon: '📢', name: 'Shill', desc: 'সোশ্যাল মিডিয়া শিল ডিটেকশন', color: 'bg-orange-50 border-orange-200' },
  { icon: '🎯', name: 'Sniper', desc: 'নতুন লঞ্চ অ্যালার্ট — আগে শুনুন', color: 'bg-pink-50 border-pink-200' },
  { icon: '🛡️', name: 'Safety Mode', desc: 'সব এজেন্ট একসাথে — সেফটি স্কোর তৈরি করুন', color: 'bg-green-50 border-green-200' },
  { icon: '🚪', name: 'Exit', desc: 'কখন বের হবেন — প্রফিট টার্গেট + স্টপ লস', color: 'bg-zinc-50 border-zinc-200' },
]

const PRICING = [
  { tier: 'Public', price: '০', desc: 'সবার জন্য — বেসিক স্ক্যাম চেক', features: ['টোকেন সার্চ', 'রিস্ক স্কোর', 'বেসিক রিপোর্ট'] },
  { tier: 'Premium', price: '২,০০০', desc: 'প্রফেশনাল — ফুল এজেন্ট স্যুইট', features: ['সব ৮ এজেন্ট', 'রিয়েলটাইম অ্যালার্ট', 'DuckAI Chat', 'BTC মনিটর'] },
  { tier: 'Enterprise', price: '৩,৫০০', desc: 'প্রুফ অফ কনসেপ্ট — API + হোয়াইটলেবেল', features: ['সব Premium', 'API অ্যাক্সেস', 'হোয়াইটলেবেল', 'ডেডিকেটেড সাপোর্ট'] },
]

export default function LabsPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      {/* HERO */}
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>HOSTAMAR LABS — AI DESK</div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-2">
            AI দিয়ে স্ক্যাম থেকে <span style={{ color: GREEN }}>বাঁচুন</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl">
            লাভের গ্যারান্টি নয় — বরং ধোঁকা থেকে বাচার টুল। ৮টি AI এজেন্ট একসাথে কাজ করে টোকেন সেফটি স্কোর তৈরি করে।
            bKash / Nagad / Rocket দিয়ে পেমেন্ট করুন।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/labs/token-safety" className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-5 py-2.5 text-sm font-bold">
              টোকেন সেফটি চেক করুন →
            </Link>
            <Link href="/labs/btc-monitor" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              BTC মনিটর দেখুন
            </Link>
            <Link href="/store" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              AI Store
            </Link>
          </div>
        </div>
      </div>

      {/* 8 AGENTS GRID */}
      <h2 className="text-xl font-bold mt-10 mb-4">৮টি AI এজেন্ট</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTS.map((a) => (
          <div key={a.name} className={`rounded-2xl border p-5 ${a.color}`}>
            <div className="text-2xl">{a.icon}</div>
            <div className="font-bold mt-2">{a.name}</div>
            <p className="text-sm text-zinc-600 mt-1">{a.desc}</p>
          </div>
        ))}
      </div>

      {/* LIVE SAFETY MONITOR DEMO */}
      <h2 className="text-xl font-bold mt-10 mb-4">লাইভ সেফটি মনিটর (ডেমো)</h2>
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-5 py-3 bg-[#F8FAFC] border-b flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest text-zinc-500">SAFETY MODE: DISABLED → ENABLED</span>
          <span className="text-xs rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-bold">⚠️ Critical/High Risk</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b">
              <tr>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Flag</th>
                <th className="px-4 py-3 text-left">DuckAI Summary</th>
                <th className="px-4 py-3 text-left">DM BOT</th>
                <th className="px-4 py-3 text-left">Hostamar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono text-xs">$PEPE9</td>
                <td className="px-4 py-3"><span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">Critical</span></td>
                <td className="px-4 py-3">Rug + Whale</td>
                <td className="px-4 py-3 text-zinc-500">লিকুইডিটি আনলক, ফাউন্ডার ওয়ালেট ৪০%</td>
                <td className="px-4 py-3"><span className="text-red-600">🔴 Red flag</span></td>
                <td className="px-4 py-3"><span className="text-green-600">🟢 Avoid</span></td>
              </tr>
              <tr className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono text-xs">$WOJAK</td>
                <td className="px-4 py-3"><span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-bold">High</span></td>
                <td className="px-4 py-3">Shill + Sniper</td>
                <td className="px-4 py-3 text-zinc-500">ফেসবুক/টুইটারে শিল বাজিমাত</td>
                <td className="px-4 py-3"><span className="text-red-600">🔴 Red flag</span></td>
                <td className="px-4 py-3"><span className="text-green-600">🟢 Caution</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BTC MONITOR */}
      <h2 className="text-xl font-bold mt-10 mb-4">BTC Up/Down মনিটর</h2>
      <div className="rounded-2xl border bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[#F8FAFC] border p-4 text-center">
            <div className="text-xs text-zinc-500">Binance</div>
            <div className="text-lg font-bold mt-1">↑ Up</div>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border p-4 text-center">
            <div className="text-xs text-zinc-500">Polymarket</div>
            <div className="text-lg font-bold mt-1">↑ 62%</div>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border p-4 text-center">
            <div className="text-xs text-zinc-500">True Probability</div>
            <div className="text-lg font-bold mt-1">↑ 58%</div>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-3">১০০% Paper Trading Only — কোনো Private Key লাগে না, কোনো আসল টাকা লাগে না। নিজের দায়িত্বে গবেষণা করুন।</p>
      </div>

      {/* PRICING */}
      <h2 className="text-xl font-bold mt-10 mb-4">প্রাইসিং</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PRICING.map((p) => (
          <div key={p.tier} className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">{p.tier}</div>
            <div className="text-2xl font-bold mt-1">{p.price} <span className="text-sm font-normal text-zinc-500">cr / month</span></div>
            <p className="text-sm text-zinc-600 mt-1">{p.desc}</p>
            <ul className="mt-3 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="text-sm text-zinc-700 flex gap-2"><span style={{ color: GREEN }}>▸</span>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* LEGAL */}
      <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-5 mt-6">
        <p className="text-sm text-red-800">
          ⚠️ <b>আইনগত সতর্কতা:</b> এটি শুধু গবেষণা ও শিক্ষামূলক টুল। কোনো বিনিয়োগ পরামর্শ নয়।
          ১০০% Paper Trading Only — কোনো Private Key লাগে না। বাংলাদেশ ব্যাংক ক্রিপ্টোকারেন্সি ট্রেডিং অনুমোদন করে না।
          নিজ দায়িত্বে গবেষণা করুন (DYOR)।
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full border bg-white px-5 py-2.5 text-sm">← Home</Link>
        <Link href="/store" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">AI Store →</Link>
      </div>
    </div>
  )
}
