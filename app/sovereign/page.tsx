// app/sovereign/page.tsx — Sovereign GPU Cloud EU+BD positioning page
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hostamar Sovereign GPU Cloud — EU + BD residency for AI video teams',
  description: 'Sovereign GPU cloud for AI voice/video teams: EU + Bangladesh data residency, OpenAI-compatible /v1/generate, bKash/Nagad/Rocket payments. HunyuanVideo 1.5, ACE-Step, 646-language voice clone.',
  alternates: { canonical: 'https://hostamar.com/sovereign' },
  openGraph: {
    title: 'Hostamar Sovereign GPU Cloud — EU + BD',
    description: 'Your models, our GPUs, your data residency. OpenAI-compatible /v1/generate.',
    url: 'https://hostamar.com/sovereign',
    type: 'website',
  },
}

const FEATURES = [
  { h: 'EU + BD data residency', p: 'Pick where your renders and voice data live. GDPR for EU clients, BD data-locality for local teams.' },
  { h: 'OpenAI-compatible API', p: 'POST /v1/generate — swap the base URL, keep your SDK. No lock-in, no custom client.' },
  { h: 'Video + voice + music stack', p: 'HunyuanVideo 1.5, ACE-Step music gen, 646-language voice clone — one endpoint.' },
  { h: 'Local payments', p: 'bKash, Nagad, Rocket. No card required — pay in BDT, invoice in BD.' },
  { h: 'White-label render API', p: '$0.10/min. Your brand, our GPUs. For agencies and SaaS builders.' },
  { h: 'No cold-start surprise', p: 'Warm GPU pools per region. First token in seconds, not minutes.' },
]

export default function SovereignPage() {
  return (
    <main className="bg-[#FFFFFF] text-[#0F172A]">
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-10 sm:py-14">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0E7C3A]">Sovereign GPU Cloud</p>
        <h1 className="mt-2 text-[28px] sm:text-[36px] md:text-[44px] font-bold leading-[1.1] tracking-[-0.02em] max-w-[24ch]">
          Your models. Our GPUs. Your data residency.
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.7] text-[#475569] max-w-[60ch]">
          Hostamar runs the AI video stack — HunyuanVideo 1.5, ACE-Step, 646-language voice clone — on sovereign GPU
          pools in the EU and Bangladesh. OpenAI-compatible API, local payments, zero data leaving your chosen region.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" data-track="sovereign-pricing" className="rounded-lg bg-[#0E7C3A] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[#0A6330]">
            See pricing — from ৳990/mo
          </Link>
          <Link href="/generate" data-track="sovereign-try" className="rounded-lg border border-[#E2E8F0] px-5 py-3 text-[14px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC]">
            Try a free render
          </Link>
        </div>
      </section>
      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.h} className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <h2 className="text-[15px] font-bold">{f.h}</h2>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-[#475569]">{f.p}</p>
            </div>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Service',
        name: 'Hostamar Sovereign GPU Cloud', areaServed: ['EU', 'BD'],
        provider: { '@type': 'Organization', name: 'Hostamar', url: 'https://hostamar.com' },
        serviceType: 'GPU cloud for AI video generation',
        offers: { '@type': 'Offer', priceCurrency: 'BDT', description: 'AI Video Ads ৳2,900 | AI Dubbing ৳1,900 | AI Music ৳990 (BDT/month)' },
      }) }} />
    </main>
  )
}
