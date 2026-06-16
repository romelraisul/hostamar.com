import { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Shield, Clock, ArrowRight, Star, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: '7 দিন ফ্রি — hostamar',
  description:
    'কোনো কার্ড লাগবে না। প্রম্পট দিন, ৯০ সেকেন্ডে ভিডিও পান। বাংলায় AI ভিডিও — মাসে ৳১,০০০ থেকে (EARLY50 দিয়ে ৫০% ছাড়)।',
}

const FEATURES = [
  { icon: '🎬', titleBn: 'বাংলায় প্রম্পট → ভিডিও', bodyBn: 'একটা লাইন লিখুন, ৯০ সেকেন্ডে ভিডিও রেডি। বাংলা স্ক্রিপ্ট, ভয়েস, ক্যাপশন অটো।' },
  { icon: '⚡', titleBn: '৯০ সেকেন্ডে রেজাল্ট', bodyBn: 'ফ্রি এডিটরের জন্য ১-২ দিন অপেক্ষা করতে হবে না। সকালে বানিয়ে দুপুরে পোস্ট করুন।' },
  { icon: '💰', titleBn: 'মাসে ৳৬,০০০+ সাশ্রয়', bodyBn: 'ফ্রিল্যান্স এডিটরের বদলে — মাসে ১০টা ভিডিওতে ৬ হাজার থেকে ১৩ হাজার টাকা বাঁচবে।' },
]

const TESTIMONIALS = [
  { name: 'সাবরিনা', role: 'ফেসবুক শপ মালিক, ঢাকা', text: '৫ দিনে ২০টা প্রোডাক্ট ভিডিও — সেল ৩ গুণ।' },
  { name: 'রাকিব', role: 'ইউটিউব ক্রিয়েটর, ২৪K সাবস্ক্রাইবার', text: 'আমার ২০টা রিলের স্ক্রিপ্ট + ভিডিও এখন ১ ঘণ্টায় হয়।' },
  { name: 'তানভীর', role: 'ডিজিটাল মার্কেটার', text: 'ক্লায়েন্ট প্রেজেন্টেশনের আগে কনসেপ্ট ১০ মিনিটে রেডি করি।' },
]

export default function FunnelPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* ---------- HERO / primary CTA ---------- */}
      <header className="px-4 py-12 md:py-20 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full text-sm font-semibold text-green-700">
          <Sparkles className="w-4 h-4" />
          ৭ দিন — সম্পূর্ণ ফ্রি, কোনো কার্ড নেই
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
          একটা প্রম্পট দিন —<br />
          <span className="text-blue-600">৯০ সেকেন্ডে ভিডিও পান</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
          বাংলায় AI ভিডিও বানানোর সবচেয়ে সস্তা ও দ্রুত উপায়। মাসে ১০টা ভিডিও মাত্র <b>৳২,০০০</b>।
        </p>

        {/* PRIMARY CTA — single, big, above the fold */}
        <Link
          href="/signup?ref=funnel-hero"
          className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-blue-600 text-white text-xl font-bold rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all transform hover:scale-105"
        >
          🚀 ৭ দিন ফ্রি ট্রায়াল শুরু করুন
          <ArrowRight className="w-6 h-6" />
        </Link>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-600" /> ক্রেডিট কার্ড লাগে না</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-600" /> ৯০ সেকেন্ডে রেজাল্ট</span>
          <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-purple-600" /> যেকোনো সময় বাতিল</span>
        </div>
      </header>

      {/* ---------- 3 FEATURES ---------- */}
      <section className="bg-white py-12 border-y">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.titleBn} className="text-center">
              <div className="text-5xl mb-3">{f.icon}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{f.titleBn}</h2>
              <p className="text-gray-600">{f.bodyBn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">৩টা সহজ ধাপ</h2>
          <ol className="space-y-4">
            {[
              { n: 1, t: 'সাইন আপ করুন',  d: 'ইমেইল + পাসওয়ার্ড দিয়ে ৩০ সেকেন্ডে সাইন আপ।' },
              { n: 2, t: 'প্রম্পট লিখুন',  d: 'যা চান তা ১-২ লাইনে লিখুন — বাংলায়।' },
              { n: 3, t: 'ভিডিও ডাউনলোড',  d: '৯০ সেকেন্ডে MP4 রেডি — সরাসরি ফেসবুক, ইনস্টা, ইউটিউবে পোস্ট।' },
            ].map((s) => (
              <li key={s.n} className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold flex items-center justify-center">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{s.t}</h3>
                  <p className="text-gray-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- PROMO CODE STRIP ---------- */}
      <section className="bg-gradient-to-r from-yellow-50 to-orange-50 border-y border-orange-200 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            প্রথম ১০০ জন সাবস্ক্রাইবারের জন্য <span className="text-orange-600">৫০% লাইফটাইম ডিসকাউন্ট</span>
          </div>
          <p className="text-gray-700 mb-4">
            সাইন আপ করার সময় কোড <code className="font-mono bg-white px-2 py-1 rounded border text-blue-600 font-bold">EARLY50</code> দিন — প্রতি মাসে ৳১,০০০
          </p>
          <div className="line-through text-gray-500">৳২,০০০/মাস</div>
          <div className="text-4xl font-bold text-blue-600">৳১,০০০/মাস</div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS (3 social-proof cards) ---------- */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">যারা ব্যবহার করছেন</h2>
          <p className="text-center text-gray-600 mb-8">৫০০+ বাংলাদেশি ক্রিয়েটর প্রতিদিন</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 text-yellow-500 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-500" />)}
                </div>
                <p className="text-gray-800 italic mb-4">"{t.text}"</p>
                <div className="text-sm">
                  <div className="font-bold text-gray-900">{t.name}</div>
                  <div className="text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FOOTER CTA (mirrored at bottom) ---------- */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            এই মুহূর্তে ৫০০+ ক্রিয়েটর ভিডিও বানাচ্ছেন
          </h2>
          <p className="text-lg opacity-95 mb-6">৭ দিন ফ্রি — যেকোনো সময় বাতিল করা যায়</p>
          <Link
            href="/signup?ref=funnel-bottom"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-blue-600 text-xl font-bold rounded-2xl hover:bg-gray-100 shadow-2xl"
          >
            🚀 আর দেরি না — ৭ দিন ফ্রি
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="text-xs opacity-75 mt-4">EARLY50 কোড ৭ দিনের মধ্যে ব্যবহার করলে ৫০% ছাড় — লাইফটাইম</p>
        </div>
      </section>
    </main>
  )
}
