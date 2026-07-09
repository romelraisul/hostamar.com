import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

export default function HeroSection() {
  const { t, locale } = useLocale()
  const isBengali = locale === 'bn'

  return (
    <>
      {/* Hero Section - New layout from paste_13 */}
      <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
        {/* BD Trust gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          {/* Top badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Hostamar = AI Marketing + Hosting for Bangladesh
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 items-center">
            {/* Left - Copy */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {isBengali ? 'AI দিয়ে মার্কেটিং ভিডিও' : 'AI Marketing Video'}
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                  {isBengali ? 'বানান ৩০ সেকেন্ডে' : 'in 30 Seconds'}
                </span>
                <br />
                <span className="text-xl font-medium text-zinc-400 sm:text-2xl lg:text-3xl">
                  {isBengali ? 'হোস্টিং সহ' : 'with Hosting'}
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:mx-0">
                {isBengali
                  ? 'HostSeba, ExonHost শুধু হোস্টিং দেয়। আমরা দিই '
                  : 'HostSeba and ExonHost only offer hosting. We offer '}
                <span className="font-semibold text-white">
                  {isBengali ? '50+ বাংলা টেমপ্লেট' : '50+ Bengali templates'}
                </span>
                {isBengali
                  ? ' (ঈদ, পহেলা বৈশাখ, ১১.১১) + হোস্টিং + bKash পেমেন্ট - সব এক জায়গায়।'
                  : ' (Eid, Boishakh, 11.11) + hosting + bKash payment - all in one place.'}
              </p>

              {/* Competitive pricing strip */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800">
                  <span className="text-xs text-zinc-500">HostSeba</span>
                  <span className="text-sm font-bold text-zinc-300">৳2200/yr</span>
                  <span className="text-[10px] text-red-400">No AI</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800">
                  <span className="text-xs text-zinc-500">ExonHost</span>
                  <span className="text-sm font-bold text-zinc-300">৳2699/yr</span>
                  <span className="text-[10px] text-red-400">No AI</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-900/30 px-3 py-2 border border-emerald-500/30">
                  <span className="text-xs text-emerald-300">Hostamar</span>
                  <span className="text-sm font-bold text-white">৳2000/yr</span>
                  <span className="text-[10px] text-emerald-300">+ AI Video</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/create"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-black hover:bg-zinc-200 transition"
                >
                  {isBengali ? 'ফ্রিতে ভিডিও বানান - ৳0' : 'Create Free Video - ৳0'}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-8 text-sm font-bold text-white hover:bg-zinc-800 transition"
                >
                  {isBengali ? 'হোস্টিং সহ শুরু করুন - ৳2000/yr' : 'Get Hosting - ৳2000/yr'}
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-zinc-500 lg:justify-start">
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> bKash/Nagad</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> BDIX</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> 500+ Creators</span>
              </div>
            </div>

            {/* Right - Visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 shadow-2xl lg:ml-auto">
                <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
                  <div className="p-4">
                    <div className="mb-3 flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 rounded-lg bg-emerald-500/20" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 rounded-lg bg-zinc-800" />
                        <div className="h-20 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                          {isBengali ? 'ঈদ অফার' : 'Eid Offer'}
                        </div>
                      </div>
                      <div className="h-32 rounded-lg bg-gradient-to-br from-emerald-900/50 to-zinc-800 flex items-center justify-center">
                        <span className="text-xs text-emerald-300">AI Video Preview</span>
                      </div>
                      <div className="h-10 rounded-lg bg-white text-black flex items-center justify-center text-xs font-bold">
                        {isBengali ? 'এখনই জেনারেট করুন' : 'Generate Now'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-3 -bottom-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
                  {isBengali ? '৳0 থেকে শুরু' : 'Start from ৳0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}