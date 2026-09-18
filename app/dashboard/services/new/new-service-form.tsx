'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

const TYPES = [
  { v: 'hosting', n: 'ক্লাউড হোস্টিং', d: 'ওয়েবসাইট B2 + CDN', p: '৳৫৯৯' },
  { v: 'vps', n: 'VPS সার্ভার', d: 'ফুল কন্ট্রোল KVM', p: '৳৫৯৯' },
  { v: 'rdp', n: 'RDP ডেস্কটপ', d: 'উইন্ডোজ ফুল সিপিইউ', p: '৳৭৯৯' },
  { v: 'game', n: 'গেম সার্ভার', d: 'Minecraft CS2 Valorant', p: '৳৯৯৯' },
  { v: 'ide', n: 'ব্রাউজার IDE', d: 'VS Code অনলাইন', p: '৳১০/ঘণ্টা' },
  { v: 'browser', n: 'AI ব্রাউজার', d: 'ক্লাউড সেশন', p: '৳৫/ঘণ্টা' },
  { v: 'video', n: 'AI ভিডিও', d: '৯০ সেকেন্ড ভিডিও', p: 'ক্রেডিটে' },
]

export default function ServicesNewForm() {
  const params = useSearchParams()
  const [type, setType] = useState(params.get('type')?.toLowerCase() || 'hosting')
  const [plan, setPlan] = useState('starter')
  const [location, setLocation] = useState('bd')
  const [trxId, setTrxId] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<any>(null)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setDone(null)
    try {
      const res = await fetch('/api/services/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, plan, location, trxId, senderNumber }),
      })
      const data = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok || !data.success) { setError(data.error || 'অর্ডার ব্যর্থ হয়েছে'); setBusy(false); return }
      setDone(data)
    } catch { setError('নেটওয়ার্ক সমস্যা') }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">নতুন সার্ভিস অর্ডার</h1>
      <p className="mt-1 text-sm text-zinc-500">VPS / RDP / Game / IDE / Hosting — bKash দিয়ে অর্ডার করুন</p>

      {done ? (
        <div className="mt-6 rounded-xl border border-[#0E7C3A] bg-[#ECFDF5] p-6">
          <h2 className="text-lg font-bold text-[#0E7C3A]">✅ অর্ডার জমা হয়েছে</h2>
          <p className="mt-2 text-sm">{done.message}</p>
          <p className="mt-2 text-xs text-zinc-600">Transaction: {done.transaction?.id} • ৳{done.transaction?.amount} • স্ট্যাটাস: {done.transaction?.status}</p>
          <div className="mt-4 flex gap-2">
            <a href="/dashboard/services" className="rounded-lg bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white">আমার সার্ভিস</a>
            <a href="/dashboard/payment" className="rounded-lg border px-4 py-2 text-sm">পেমেন্ট হিস্ট্রি</a>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold text-lg">১. সার্ভিস টাইপ</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TYPES.map(t => (
                <label key={t.v} className={`flex cursor-pointer flex-col rounded-lg border p-3 hover:border-[#0E7C3A] ${type === t.v ? 'border-[#0E7C3A] bg-[#ECFDF5]' : ''}`}>
                  <input type="radio" name="type" value={t.v} checked={type === t.v} onChange={() => setType(t.v)} className="sr-only" />
                  <span className="font-medium">{t.n}</span>
                  <span className="text-xs text-zinc-500">{t.d}</span>
                  <span className="mt-1 text-sm font-bold text-[#0E7C3A]">{t.p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold text-lg">২. প্ল্যান</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { v: 'starter', n: 'Starter', p: '৳৫৯৯/মাস', d: '1GB RAM • 1 vCPU • 10GB' },
                { v: 'pro', n: 'Pro', p: '৳১,২৯৯/মাস', d: '4GB RAM • 2 vCPU • 40GB' },
                { v: 'business', n: 'Business', p: '৳২,৯৯৯/মাস', d: '8GB RAM • 4 vCPU • 100GB' },
              ].map(pl => (
                <label key={pl.v} className={`flex cursor-pointer flex-col rounded-lg border p-4 hover:border-[#0E7C3A] ${plan === pl.v ? 'border-[#0E7C3A] bg-[#ECFDF5]' : ''}`}>
                  <input type="radio" name="plan" value={pl.v} checked={plan === pl.v} onChange={() => setPlan(pl.v)} className="sr-only" />
                  <span className="font-bold">{pl.n}</span>
                  <span className="text-sm font-semibold text-[#0E7C3A]">{pl.p}</span>
                  <span className="mt-1 text-xs text-zinc-500">{pl.d}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">লোকেশন</label>
              <select value={location} onChange={e => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border p-3 text-sm">
                <option value="bd">বাংলাদেশ (Dhaka)</option>
                <option value="sg">সিঙ্গাপুর</option>
                <option value="us">USA</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold text-lg">৩. পেমেন্ট — bKash</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p>bKash (Send Money): <strong className="text-[#0E7C3A]">01822417463</strong> <button type="button" onClick={() => navigator.clipboard.writeText('01822417463')} className="ml-1 rounded border px-1.5 text-xs">কপি</button></p>
              <p className="text-xs text-zinc-500">Send Money করুন, তারপর TrxID নিচে দিন</p>
              <input value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="TrxID (যেমন: 8K7J9L2M)" className="w-full rounded-lg border p-3 text-sm" required />
              <input value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="যে নাম্বার থেকে পাঠিয়েছেন (ঐচ্ছিক)" className="w-full rounded-lg border p-3 text-sm" />
            </div>
            <div className="mt-4 rounded-lg bg-[#ECFDF5] p-3 text-xs text-[#0E7C3A]">✅ অ্যাডমিন verify করার পর সার্ভিস অ্যাক্টিভ হবে (সর্বোচ্চ ১ ঘণ্টা)</div>
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={busy || !trxId.trim()} className="w-full rounded-lg bg-[#0E7C3A] py-3 text-sm font-semibold text-white hover:bg-[#0c6a32] disabled:bg-zinc-300">{busy ? 'জমা হচ্ছে...' : 'অর্ডার করুন →'}</button>
        </form>
      )}
      <div className="mt-6 rounded-xl border bg-[#F8FAFC] p-4 text-center text-xs text-zinc-500">৬০০০ FREE credits • B2 স্টোরেজ s3.us-east-005 • TV 50 চ্যানেল • 120 AI মডেল</div>
    </div>
  )
}
