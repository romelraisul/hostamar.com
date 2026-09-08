import Link from 'next/link'
import StoreCatalog from '@/components/store/StoreCatalog'

export const metadata = {
  title: 'Store — Hostamar-এর সব ১০৬+ সার্ভিস | 1cr=1TK',
  description:
    'Hostamar Store — সব AI সার্ভিস এক জায়গায়: 106 ক্যাটালগ সার্ভিস (লাইভ) + CoinLab BD ক্রিপ্টো রিসার্চ হাব (#107)। সাইনআপে 6000 ক্রেডিট ফ্রি, 1 ক্রেডিট = 1 টাকা।',
  keywords: ['Hostamar store', 'AI services Bangladesh', '১০৬ সার্ভিস', 'AI service price Bangladesh'],
  openGraph: {
    title: 'Hostamar Store — 106+ AI সার্ভিস, 1cr=1TK',
    description: 'সব সার্ভিস পাবলিক — দেখুন, তুলনা করুন, সাইনআপ করে অর্ডার করুন।',
  },
}

const GREEN = '#0E7C3A'

export default function StorePage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>HOSTAMAR STORE — পাবলিক</div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-2">
            সব সার্ভিস <span style={{ color: GREEN }}>এক জায়গায়</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl">
            106টি AI সার্ভিস (লাইভ ক্যাটালগ) + CoinLab BD রিসার্চ হাব। সাইনআপ করলেই 6000 ক্রেডিট ফ্রি —
            1 ক্রেডিট = 1 টাকা। সার্ভিস কার্ডে মূল্য দেখে ড্যাশবোর্ড থেকে সরাসরি অর্ডার করুন।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-5 py-2.5 text-sm font-bold">
              ফ্রি সাইনআপ — 6000cr
            </Link>
            <Link href="/pricing" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              প্যাকেজ দেখুন
            </Link>
            <Link href="/docs" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              সম্পূর্ণ ডকস
            </Link>
          </div>
        </div>
      </div>

      {/* CoinLab feature banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Link href="/coinlab" className="rounded-2xl border-2 bg-white p-5 hover:border-[#0E7C3A] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold rounded-full bg-[#F8FAFC] border px-3 py-1" style={{ color: GREEN }}>নতুন — সার্ভিস #107</span>
            <span className="text-xs font-bold rounded-full bg-[#0E7C3A] text-white px-3 py-1">ফ্রি রিসার্চ</span>
          </div>
          <div className="font-bold mt-2">CoinLab BD — বাংলায় ক্রিপ্টো রিসার্চ</div>
          <p className="text-sm text-zinc-600 mt-1">
            ৪ পিলার (Research Hub • Earn Lab • Build Lab • Community), ৭-সেকশন টেমপ্লেট, Top-100 টার্গেট, নিজের কয়েন বানানোর Build Lab।
          </p>
        </Link>
        <div className="rounded-2xl border bg-[#F8FAFC] p-5">
          <div className="text-xs font-semibold tracking-widest text-zinc-500">কিভাবে কাজ করে</div>
          <ol className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>1. সাইনআপ — 6000 ক্রেডিট ফ্রি (1cr = 1TK)</li>
            <li>2. সার্ভিস বাছুন — নিচের কার্ডে দাম ক্রেডিটে দেখানো</li>
            <li>3. ড্যাশবোর্ড → সার্ভিস → অর্ডার → ডেলিভারি ড্যাশবোর্ডে</li>
          </ol>
        </div>
      </div>

      {/* Live catalog grid (client component, public API) */}
      <StoreCatalog />

      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full border bg-white px-5 py-2.5 text-sm">← Home</Link>
        <Link href="/pricing" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">প্যাকেজ →</Link>
      </div>
    </div>
  )
}
