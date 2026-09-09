import Link from 'next/link'

export const metadata = {
  title: 'OpenSEO Audit — সার্ভিস #110 | Hostamar',
  description:
    'OpenSEO Audit (#110): যেকোনো সাইটের ফ্রি SEO অডিট — মেটা ট্যাগ, স্পিড, সাইটম্যাপ, বাংলা-কীওয়ার্ড সুযোগ + বাংলাদেশি দোকানের Google Business Profile টিপস।',
  keywords: ['OpenSEO', 'SEO audit Bangladesh', 'Bangla SEO', 'Hostamar service 110', 'free SEO check'],
  openGraph: {
    title: 'OpenSEO Audit — Hostamar সার্ভিস #110',
    description: 'তোমার সাইটের SEO চেকআপ — পাস/ফেল চেকলিস্টে।',
  },
}

const GREEN = '#0E7C3A'

const checks = [
  { icon: '🏷️', title: 'মেটা ও হেডিং', body: 'Title/meta দৈর্ঘ্য, H1–H3 গঠন, image alt কভারেজ — পাস/ফেল।' },
  { icon: '⚡', title: 'স্পিড সন্দেহভাজন', body: 'ধীর পেজের কারণ — বড় ছবি, ভারী স্ক্রিপ্ট, সার্ভার রেসপন্স।' },
  { icon: '🗺️', title: 'টেকনিক্যাল বেস', body: 'sitemap.xml, robots.txt, মোবাইল-ফ্রেন্ডলি, HTTPS।' },
  { icon: '🇧🇩', title: 'বাংলা-SEO সুযোগ', body: 'বাংলা কীওয়ার্ড, Google Business Profile, লোকাল সার্চ টিপস।' },
]

export default function OpenSEOPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold rounded-full bg-[#F8FAFC] border px-3 py-1" style={{ color: GREEN }}>সার্ভিস #110</span>
            <span className="text-xs font-bold rounded-full bg-[#0E7C3A] text-white px-3 py-1">দোকানদার স্পেশাল</span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-3">
            OpenSEO <span style={{ color: GREEN }}>Audit</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
            তোমার ওয়েবসাইটের URL দাও — সম্পূর্ণ SEO চেকআপ পাও: কী ঠিক আছে, কী ভাঙা, আগে কোনটা ঠিক করবে।
            কম্পিটিটর URL দিলে তুলনাও পাবে।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex rounded-full text-white px-5 py-2.5 text-sm font-bold" style={{ background: GREEN }}>
              অডিট করাও — 30cr
            </Link>
            <Link href="/store" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              ← সব সার্ভিস
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold">৪টা চেক-গ্রুপ</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {checks.map((u) => (
            <div key={u.title} className="rounded-2xl border-2 bg-white p-5 hover:border-[#0E7C3A] transition-colors">
              <div className="text-2xl">{u.icon}</div>
              <div className="font-bold mt-2">{u.title}</div>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border-2 bg-[#F8FAFC] p-6">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>আউটপুট</div>
        <p className="text-sm text-zinc-700 mt-2 leading-relaxed">
          ইমপ্যাক্ট-অনুযায়ী সাজানো টপ-৫ ফিক্স + প্রতিটি আইটেমে পাস/ফেল। ডেভেলপার না থাকলেও বুঝবে — প্রতিটি ফিক্সে কী করতে হবে বাংলায় লেখা থাকে।
        </p>
      </div>
    </div>
  )
}
