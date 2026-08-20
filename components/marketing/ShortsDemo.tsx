'use client'
import Link from 'next/link'

export default function ShortsDemo() {
  return (
    <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-8">
      <div className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="h-[280px] w-[160px] shrink-0 rounded-[16px] bg-[#0F172A] flex flex-col items-center justify-center gap-3 text-white">
          <div className="h-10 w-10 rounded-full bg-white text-[#0F172A] flex items-center justify-center">▶</div>
          <div className="text-[11px] opacity-70">30s • 9:16 • বাংলা VO</div>
          <div className="text-[12px] font-semibold">ঈদ অফার ডেমো</div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-bold text-[#0F172A]">30 সেকেন্ডে ভিডিও — দেখুন ডেমো</h3>
          <p className="mt-2 text-[13px] leading-6 text-[#475569]">CapCut এ 30 মিনিট, Hostamar এ 30 সেকেন্ড। ঈদ, বৈশাখ, 11.11 — ৫০+ বাংলা টেমপ্লেট।</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/generate" data-ga="hero_cta_click" className="inline-flex h-10 items-center justify-center rounded-full bg-[#2563EB] px-5 text-[14px] font-semibold text-white">ফ্রিতে ভিডিও বানান - ৳0</Link>
            <Link href="/pricing" className="inline-flex h-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-5 text-[14px] font-medium">Pricing দেখুন</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
