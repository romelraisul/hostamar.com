'use client'

// components/pricing/ROICalculator.tsx
// Client-only ROI calculator for the /pricing page. No API — pure math.
// Anchors Hostamar Business (৳3500/mo) against the pain of paying an agency
// per reel. All numbers render in Bangla digits via Intl.NumberFormat('bn-BD').
import { useState } from 'react'

const HOSTAMAR_MONTHLY = 3500

// Bangla-digit currency + number formatters.
const bnCurrency = (n: number) =>
  '৳' + new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(Math.round(n))
const bnNumber = (n: number) =>
  new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(Math.round(n))

export default function ROICalculator() {
  const [reels, setReels] = useState(30)
  const [agencyCost, setAgencyCost] = useState(500)
  const [hoursPerReel, setHoursPerReel] = useState(2)

  const agencySpend = reels * agencyCost
  const savings = agencySpend - HOSTAMAR_MONTHLY
  const hoursSaved = reels * hoursPerReel
  // Payback in days: how fast the ৳3500 is recovered from agency spend.
  const paybackDays = agencySpend > 0 ? Math.max(1, Math.round((HOSTAMAR_MONTHLY / agencySpend) * 30)) : 0

  return (
    <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="bangla text-[28px] md:text-[36px] font-bold tracking-[-0.02em] leading-tight">
          আপনি কত টাকা বাঁচাবেন?
        </h2>
        <p className="bangla mt-3 text-zinc-600">
          এজেন্সিকে রিল প্রতি টাকা দেওয়ার বদলে Hostamar Business — মাসে মাত্র {bnCurrency(HOSTAMAR_MONTHLY)}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Inputs */}
        <div className="rounded-[24px] border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="space-y-7">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="reels" className="bangla text-[14px] font-medium text-zinc-700">
                  মাসে কতটি রিল?
                </label>
                <span className="text-[15px] font-bold text-[#0E7C3A]">{bnNumber(reels)}টি</span>
              </div>
              <input
                id="reels"
                type="range"
                min={10}
                max={100}
                step={5}
                value={reels}
                onChange={(e) => setReels(Number(e.target.value))}
                className="mt-3 w-full accent-[#0E7C3A]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                <span>{bnNumber(10)}</span>
                <span>{bnNumber(100)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="agencyCost" className="bangla text-[14px] font-medium text-zinc-700">
                  এজেন্সি রিল প্রতি নেয়
                </label>
                <span className="text-[15px] font-bold text-[#0E7C3A]">{bnCurrency(agencyCost)}</span>
              </div>
              <input
                id="agencyCost"
                type="range"
                min={300}
                max={800}
                step={50}
                value={agencyCost}
                onChange={(e) => setAgencyCost(Number(e.target.value))}
                className="mt-3 w-full accent-[#0E7C3A]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                <span>{bnCurrency(300)}</span>
                <span>{bnCurrency(800)}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="hours" className="bangla text-[14px] font-medium text-zinc-700">
                  রিল প্রতি সময় বাঁচে (ঘণ্টা)
                </label>
                <span className="text-[15px] font-bold text-[#0E7C3A]">{bnNumber(hoursPerReel)} ঘণ্টা</span>
              </div>
              <input
                id="hours"
                type="range"
                min={1}
                max={3}
                step={1}
                value={hoursPerReel}
                onChange={(e) => setHoursPerReel(Number(e.target.value))}
                className="mt-3 w-full accent-[#0E7C3A]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                <span>{bnNumber(1)}</span>
                <span>{bnNumber(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col justify-center rounded-[24px] border border-[#0E7C3A] bg-[#0E7C3A] p-6 md:p-8 text-white shadow-[0_20px_60px_-20px_rgba(14,124,58,0.5)]">
          <div className="bangla text-[13px] font-medium uppercase tracking-wide text-white/70">
            মাসিক সাশ্রয়
          </div>
          <div className="mt-2 text-[44px] md:text-[56px] font-bold leading-none tracking-[-0.03em]">
            {savings >= 0 ? bnCurrency(savings) : '৳০'}
          </div>
          <div className="bangla mt-1 text-[14px] text-white/80">
            এজেন্সি খরচ {bnCurrency(agencySpend)} − Hostamar {bnCurrency(HOSTAMAR_MONTHLY)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="bangla text-[12px] text-white/70">সময় বাঁচবে</div>
              <div className="mt-1 text-[24px] font-bold">{bnNumber(hoursSaved)} ঘণ্টা</div>
              <div className="bangla text-[11px] text-white/60">প্রতি মাসে</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="bangla text-[12px] text-white/70">খরচ উঠে আসবে</div>
              <div className="mt-1 text-[24px] font-bold">{bnNumber(paybackDays)} দিনে</div>
              <div className="bangla text-[11px] text-white/60">payback</div>
            </div>
          </div>

          <a
            href="/signup?plan=business"
            className="bangla mt-7 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-[15px] font-semibold text-[#0E7C3A] transition hover:bg-white/90"
          >
            ফ্রি শুরু করুন — লিমিটে পৌঁছালে আপগ্রেড
          </a>
        </div>
      </div>
    </section>
  )
}
