import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ServicesNewPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">নতুন সার্ভিস অর্ডার</h1>
      <p className="mt-1 text-sm text-zinc-500">VPS / RDP / Game / IDE / Video — যেকোনো সার্ভিস অর্ডার করুন bKash দিয়ে</p>
      <form action="/api/services/orders" method="POST" className="mt-6 space-y-6">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-lg">১. সার্ভিস টাইপ বেছে নিন</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              {v:'VPS',n:'VPS সার্ভার',d:'ফুল কন্ট্রোল KVM',p:'৳৫৯৯'},
              {v:'RDP',n:'RDP ডেস্কটপ',d:'উইন্ডোজ ফুল সিপিইউ',p:'৳৭৯৯'},
              {v:'Game',n:'গেম সার্ভার',d:'Minecraft CS2 Valorant',p:'৳৯৯৯'},
              {v:'IDE',n:'ব্রাউজার IDE',d:'VS Code অনলাইন',p:'৳১০/ঘণ্টা'},
              {v:'Video',n:'AI ভিডিও',d:'৯০ সেকেন্ড ভিডিও',p:'৳১০০'},
            ].map(t=>(
              <label key={t.v} className="flex cursor-pointer flex-col rounded-lg border p-3 hover:border-[#0E7C3A] has-[:checked]:border-[#0E7C3A] has-[:checked]:bg-[#ECFDF5]">
                <input type="radio" name="type" value={t.v} className="sr-only" required/>
                <span className="font-medium">{t.n}</span>
                <span className="text-xs text-zinc-500">{t.d}</span>
                <span className="mt-1 text-sm font-bold text-[#0E7C3A]">{t.p}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-lg">২. প্ল্যান বেছে নিন</h2>
          <select name="plan" className="mt-3 w-full rounded-lg border p-3 text-sm" required>
            <option value="starter">Starter — ৳৫৯৯/মাস</option>
            <option value="pro">Pro — ৳১,২৯৯/মাস</option>
            <option value="business">Business — ৳২,৯৯৯/মাস</option>
          </select>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-lg">৩. পেমেন্ট — bKash</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>bKash নাম্বার: <strong className="text-[#0E7C3A]">01822417463</strong></p>
            <p>Send Money করুন, TrxID নিচে দিন</p>
            <input name="trxid" placeholder="TrxID (যেমন: 8K7J9L2M)" className="w-full rounded-lg border p-3 text-sm" required/>
          </div>
          <div className="mt-4 rounded-lg bg-[#ECFDF5] p-3 text-xs text-[#0E7C3A]">✅ অ্যাডমিন verify করার পর সার্ভিস অ্যাক্টিভ হবে (সর্বোচ্চ ১ ঘণ্টা)</div>
        </div>
        <button type="submit" className="w-full rounded-lg bg-[#0E7C3A] py-3 text-sm font-semibold text-white hover:bg-[#0c6a32]">অর্ডার করুন →</button>
      </form>
      <div className="mt-6 rounded-xl border bg-[#F8FAFC] p-4 text-center text-xs text-zinc-500">৬০০০ FREE credits • B2 স্টোরেজ s3.us-east-005 • TV 50 চ্যানেল • 120 AI মডেল</div>
    </div>
  )
}
