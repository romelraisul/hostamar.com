// components/home/HeroC.tsx — Unified bundle hero, mobile-first 320px, single CTA
// Locked brand: Base #FFFFFF/#F8FAFC, Text #0F172A, Primary #0E7C3A, Accent #F59E0B
// Gradient allowed 1x per page — used only on final CTA, NOT here.
import Link from 'next/link'

const GREEN = '#0E7C3A' // keep for bKash badge compatibility, not used as primary

export default function HeroC() {
  return (
    <section className="bg-[#FFFFFF] border-b border-[#E2E8F0]">
      {/* Hero core */}
      <div className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0">
        <div className="py-8 sm:py-12 md:py-16">
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6 sm:gap-8 md:gap-10 items-center min-w-0">
            {/* LEFT: copy */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[11px] sm:text-[12px] font-medium text-[#475569]">
                <span className="h-2 w-2 rounded-full bg-[#0E7C3A] animate-pulse" />
                <span>বাংলাদেশি SME দের জন্য তৈরি</span>
                <span className="hidden sm:inline text-[#CBD5E1]">|</span>
                <span className="hidden sm:inline">Made for Bangladesh</span>
              </div>

              <h1 className="mt-4 text-[28px] sm:text-[32px] md:text-[48px] font-bold leading-[1.05] tracking-[-0.03em] text-[#0F172A] max-w-[22ch]">
                AI দিয়ে মার্কেটিং ভিডিও বানান{' '}
                <span className="text-[#2563EB]">৩০ সেকেন্ডে</span>, হোস্টিং সহ
              </h1>

              <p className="mt-3 sm:mt-4 text-[14px] sm:text-[16px] leading-[1.65] text-[#475569] max-w-[52ch]">
                পণ্যের ছবি দিন, AI বাকিটা সামলাবে — বাংলা ভয়েসওভার, সাবটাইটেল, ব্র্যান্ড লোগো সহ প্রফেশনাল ভিডিও। কোডিং লাগবে না।
                <span className="text-[#0F172A] font-medium"> HostSeba/ExonHost শুধু হোস্টিং দেয়, Hostamar দেয় AI সহ।</span>
              </p>

              {/* Single CTA per viewport — mobile-first */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/generate"
                  data-ga="hero_cta_click"
                  aria-label="ফ্রিতে ভিডিও বানান - ৳0"
                  className="inline-flex h-[46px] sm:h-[48px] items-center justify-center rounded-full bg-[#0E7C3A] px-6 text-[14px] sm:text-[15px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)] hover:bg-[#0c6a32] hover:translate-y-[-1px] transition min-w-0"
                >
                  ফ্রিতে ভিডিও বানান - ৳0
                </Link>
                <span className="inline-flex items-center justify-center gap-2 text-[12px] text-[#64748B] px-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  ক্রেডিট কার্ড লাগবে না • bKash এ পেমেন্ট
                </span>
              </div>

              {/* Micro trust */}
              <p className="mt-3 text-[11px] text-[#94A3B8]">৳০ থেকে শুরু • ৭ দিন মানি-ব্যাক • ৫০+ বাংলা টেমপ্লেট</p>
            </div>

            {/* RIGHT: exactly 2 cards — AI Video (70%) + Hosting (20%) visual */}
            <div className="min-w-0 grid grid-cols-1 gap-3 sm:gap-4">
              {/* Card 1 — AI Video (hero) */}
              <div className="rounded-[20px] sm:rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[16px]">🎬</div>
                    <div>
                      <div className="text-[13px] sm:text-[14px] font-semibold text-[#0F172A]">AI ভিডিও জেনারেটর</div>
                      <div className="text-[11px] text-[#64748B]">ঈদ • বৈশাখ • 11.11 • ৫০+ টেমপ্লেট</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#0E7C3A] text-white text-[10px] font-bold px-2 py-1">70% HERO</span>
                </div>
                {/* mock preview */}
                <div className="mt-3 sm:mt-4 rounded-[16px] bg-[#0F172A] p-2 sm:p-3 flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white flex items-center justify-center text-[18px] shrink-0">▶</div>
                  <div className="min-w-0 flex-1">
                    <div className="h-2.5 w-24 bg-white/90 rounded" />
                    <div className="mt-1.5 h-2 w-32 bg-white/30 rounded" />
                    <div className="mt-2 h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full w-[68%] bg-[#0E7C3A] rounded-full" />
                    </div>
                  </div>
                  <div className="hidden sm:flex h-7 px-2.5 rounded-full bg-white text-[#0F172A] text-[11px] font-semibold items-center shrink-0">Buy Now</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                  {[
                    { l: 'ঈদ অফার', e: '🌙' },
                    { l: 'পহেলা বৈশাখ', e: '🌸' },
                    { l: '11.11 Sale', e: '🛍️' },
                  ].map((c) => (
                    <span key={c.l} className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155]">
                      <span>{c.e}</span> {c.l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 2 — Hosting */}
              <div className="rounded-[20px] sm:rounded-[24px] border border-[#E2E8F0] bg-white p-3 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[18px] shrink-0">🌐</div>
                  <div className="min-w-0">
                    <div className="text-[13px] sm:text-[14px] font-semibold text-[#0F172A]">BDIX হোস্টিং + ফ্রি ডোমেইন</div>
                    <div className="text-[11px] sm:text-[12px] text-[#64748B] truncate">১ ক্লিকে ডোমেইন কানেক্ট • bKash • SSL</div>
                  </div>
                </div>
                <span className="hidden sm:inline-flex rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#334155] shrink-0">২০% CORE</span>
              </div>

              <p className="text-center text-[11px] text-[#94A3B8]">
                + Tools: AI Browser • AI Chat • Dev IDE • Gaming — <Link href="/tools" className="underline decoration-dotted hover:text-[#0E7C3A]">Lab tools</Link> (10%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar — below hero, still part of HeroC */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A]">
              <span className="h-6 px-2 rounded-full bg-white border border-[#E2E8F0] inline-flex items-center text-[11px]">bKash</span>
              <span className="h-6 px-2 rounded-full bg-white border border-[#E2E8F0] inline-flex items-center text-[11px]">Nagad</span>
              <span className="h-6 px-2 rounded-full bg-white border border-[#E2E8F0] inline-flex items-center text-[11px]">Rocket</span>
            </span>
            <span className="hidden sm:inline h-4 w-px bg-[#E2E8F0]" />
            <span className="inline-flex items-center gap-1.5 text-[#334155]">
              <span className="h-5 px-2 rounded-full bg-white border border-[#E2E8F0] inline-flex items-center text-[10px] font-bold">BDIX</span> ঢাকা CDN
            </span>
            <span className="hidden sm:inline h-4 w-px bg-[#E2E8F0]" />
            <span className="text-[#475569]">
              <span className="font-bold text-[#0F172A]">500+</span> ক্রিয়েটর • <span className="text-[#F59E0B]">★★★★★</span> 4.8 (212)
            </span>
          </div>
          <div className="text-[11px] text-[#64748B] text-center sm:text-right">
            ৳২২০০ No AI (HostSeba) vs <span className="font-semibold text-[#0F172A]">৳২,০০০ AI সহ</span> — ৩× ভ্যালু
          </div>
        </div>
      </div>
    </section>
  )
}
