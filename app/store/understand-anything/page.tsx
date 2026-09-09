import Link from 'next/link'

export const metadata = {
  title: 'Understand Anything — সার্ভিস #109 | Hostamar',
  description:
    'Understand Anything (#109): যেকোনো বিষয়, লিংক বা টেক্সট সহজ বাংলায় ব্যাখ্যা — শিশু থেকে এক্সপার্ট লেভেল। লাইট মডেলে চলে, পুরনো মোবাইলেও দ্রুত।',
  keywords: ['Understand Anything', 'Bangla explain', 'ELI5 Bangla', 'Hostamar service 109'],
  openGraph: {
    title: 'Understand Anything — Hostamar সার্ভিস #109',
    description: 'যেকোনো বিষয় সহজ বাংলায় — এক ক্লিকে।',
  },
}

const GREEN = '#0E7C3A'

const levels = [
  { n: '১', title: 'শিশু (ELI5)', body: '৫ বছরের বাচ্চাও বুঝবে — গল্প আর দৈনন্দিন উদাহরণে।' },
  { n: '২', title: 'স্কুল / কলেজ', body: 'পরীক্ষার পড়া — সংজ্ঞা, পার্থক্য, মনে রাখার কৌশলসহ।' },
  { n: '৩', title: 'এক্সপার্ট', body: 'গভীর ডাইভ — টেকনিক্যাল টার্ম, ট্রেড-অফ, পরের ধাপ।' },
]

export default function UnderstandAnythingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold rounded-full bg-[#F8FAFC] border px-3 py-1" style={{ color: GREEN }}>সার্ভিস #109</span>
            <span className="text-xs font-bold rounded-full bg-[#0E7C3A] text-white px-3 py-1">১০cr — সবচেয়ে সস্তা</span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-3">
            Understand <span style={{ color: GREEN }}>Anything</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
            যেকোনো বিষয়, লিংক বা টেক্সট পেস্ট করো — সহজ বাংলায় ব্যাখ্যা পাও, সাথে ইংরেজি টার্ম।
            লাইট মডেলে (hostamar-lite) চলে বলে পুরনো মোবাইলেও সেকেন্ডে উত্তর।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex rounded-full text-white px-5 py-2.5 text-sm font-bold" style={{ background: GREEN }}>
              অর্ডার করো — 10cr
            </Link>
            <Link href="/store" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              ← সব সার্ভিস
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>৩টা লেভেল — তোমার মত করে</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {levels.map((f) => (
            <div key={f.n} className="rounded-2xl border bg-white p-5">
              <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ background: GREEN }}>
                {f.n}
              </div>
              <div className="font-bold mt-3">{f.title}</div>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border-2 bg-[#F8FAFC] p-6">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>প্রতিটি উত্তরের ফরম্যাট</div>
        <ol className="mt-3 space-y-2 text-sm text-zinc-700 list-decimal list-inside">
          <li>১-লাইনে উত্তর</li>
          <li>দৈনন্দিন উদাহরণ (বাংলাদেশ থেকে)</li>
          <li>৩টা মূল পয়েন্ট</li>
          <li>ইংরেজি টার্ম + এরপর কী শিখবে</li>
        </ol>
      </div>
    </div>
  )
}
