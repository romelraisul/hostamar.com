// app/bkash/page.tsx — bKash/Nagad/Rocket payments for AI video teams
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'bKash payment for AI video — Hostamar accepts bKash, Nagad, Rocket',
  description: 'Pay for AI video generation with bKash, Nagad or Rocket. BDT pricing, no card needed, invoice in Bangladesh. AI Video Ads ৳2,900/mo, AI Dubbing ৳1,900/mo, AI Music ৳990/mo.',
  alternates: { canonical: 'https://hostamar.com/bkash' },
  openGraph: {
    title: 'bKash/Nagad/Rocket for AI video teams',
    description: 'BDT pricing, local payments, no card required.',
    url: 'https://hostamar.com/bkash',
    type: 'website',
  },
}

const PLANS = [
  { name: 'AI Music', price: '৳990', per: 'BDT/month', feat: ['ACE-Step music generation', 'Royalty-free output', 'MP3/WAV export'] },
  { name: 'AI Dubbing', price: '৳1,900', per: 'BDT/month', feat: ['646-language voice clone', 'Subtitle sync', 'Per-scene voice pick'] },
  { name: 'AI Video Ads', price: '৳2,900', per: 'BDT/month', feat: ['HunyuanVideo 1.5 renders', 'bKash/Nagad/Rocket billing', 'Hosting included'] },
]

export default function BkashPage() {
  return (
    <main className="bg-[#FFFFFF] text-[#0F172A]">
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-10 sm:py-14">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#E2136E]">Pay in BDT — no card needed</p>
        <h1 className="mt-2 text-[28px] sm:text-[36px] md:text-[44px] font-bold leading-[1.1] tracking-[-0.02em] max-w-[26ch]">
          bKash, Nagad, Rocket — AI video without a credit card
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.7] text-[#475569] max-w-[60ch]">
          Every Hostamar plan bills in BDT through the payment rails Bangladeshi teams already use. Pick a plan,
          pay from your bKash app, render in minutes. Invoice issued in Bangladesh.
        </p>
      </section>
      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-10 grid sm:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div key={p.name} className="rounded-xl border border-[#E2E8F0] bg-white p-5 flex flex-col">
              <h2 className="text-[15px] font-bold">{p.name}</h2>
              <p className="mt-2 text-[24px] font-bold text-[#0E7C3A]">{p.price} <span className="text-[12px] font-medium text-[#475569]">{p.per}</span></p>
              <ul className="mt-3 text-[13px] leading-[1.6] text-[#475569] list-disc pl-4">
                {p.feat.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link href="/pricing" data-track="bkash-plan" className="mt-4 rounded-lg bg-[#0E7C3A] px-4 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-[#0A6330]">
                Choose {p.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
