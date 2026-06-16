import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, TrendingUp, Users, Video, BarChart3, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'কেস স্টাডি — Hostamar',
  description: 'দেখুন কিভাবে বাংলাদেশের ব্যবসাগুলো Hostamar দিয়ে সফলভাবে AI ভিডিও মার্কেটিং শুরু করেছে।',
}

const CASE_STUDIES = [
  {
    id: 'techstore-bd',
    company: 'TechStore Bangladesh',
    industry: 'ই-কমার্স / ইলেকট্রনিক্স',
    location: 'ঢাকা, বাংলাদেশ',
    emoji: '🛒',
    gradient: 'from-blue-500 to-purple-600',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    challenge: 'নতুন প্রোডাক্ট লঞ্চের সময় প্রতিটি পণ্যের জন্য প্রফেশনাল ভিডিও তৈরি করা অনেক সময়সাপেক্ষ এবং ব্যয়বহুল ছিল। একটি ভিডিও প্রোডাকশন হাউসে ৳১৫,০০০-৳৩০,০০০ খরচ হতো এবং সময় লাগত ৩-৫ দিন।',
    solution: 'Hostamar-এর AI ভিডিও জেনারেটর ব্যবহার করে টিমটি প্রতিদিন ১০+ প্রোডাক্ট ভিডিও তৈরি করতে শুরু করল। বাংলা প্রম্পটে সরাসরি ভিডিও জেনারেশন এবং একাধিক আউটপুট স্টাইল সাপোর্ট তাদের কনটেন্ট প্রডাকশন স্পিড ১০ গুণ বাড়িয়ে দিল।',
    results: [
      { metric: '১০ গুণ', label: 'দ্রুত ভিডিও প্রোডাকশন' },
      { metric: '৳২০,০০০', label: 'মাসিক সঞ্চয় (প্রতি মাসে)' },
      { metric: '১৫০%', label: 'অর্গানিক ট্রাফিক বৃদ্ধি' },
      { metric: '৩.৫×', label: 'রিটার্ন অন অ্যাড স্পেন্ড (ROAS)' },
    ],
    quote: '"Hostamar AI ভিডিওতে আমাদের প্রোডাক্ট লঞ্চ টাইম ৫ দিন থেকে ৪ ঘণ্টায় নেমে এসেছে। এটা আমাদের সোশ্যাল মিডিয়া স্ট্র্যাটেজি সম্পূর্ণ বদলে দিয়েছে!"',
    author: 'রাকিব চৌধুরী',
    role: 'মার্কেটিং ম্যানেজার, TechStore Bangladesh',
    since: 'জুন ২০২৫ থেকে ব্যবহারকারী',
    tags: ['ই-কমার্স', 'সোশ্যাল মিডিয়া', 'প্রোডাক্ট ভিডিও'],
    featured: true,
  },
  {
    id: 'dharma-consulting',
    company: 'ধর্মা কনসাল্টিং',
    industry: 'কর্পোরেট কনসাল্টিং',
    location: 'চট্টগ্রাম, বাংলাদেশ',
    emoji: '💼',
    gradient: 'from-emerald-500 to-teal-500',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    challenge: 'কর্পোরেট ক্লায়েন্টদের জন্য প্রেজেন্টেশন এবং ট্রেনিং ভিডিও তৈরি করতে বড় বাজেট এবং প্রোডাকশন টিম দরকার ছিল। প্রতিটি ট্রেনিং মডিউল তৈরিতে ৳৫০,০০০+ খরচ এবং ২ সপ্তাহ সময় লাগত।',
    solution: 'Hostamar-এর AI ভিডিও প্ল্যাটফর্ম ব্যবহার করে ধর্মা টিম একটি সম্পূর্ণ ট্রেনিং লাইব্রেরি তৈরি করল — কোম্পানির ব্র্যান্ড গাইডলাইন অনুযায়ী কাস্টম স্টাইল এবং একাধিক ভাষায় (বাংলা + ইংরেজি)।',
    results: [
      { metric: '৯০%', label: 'প্রোডাকশন খরচ কমেছে' },
      { metric: '২ সপ্তাহ → ২ দিন', label: 'প্রতিটি মডিউল তৈরির সময়' },
      { metric: '৫০+', label: 'ট্রেনিং ভিডিও তৈরি' },
      { metric: '৯৮%', label: 'ক্লায়েন্ট স্যাটিসফ্যাকশন' },
    ],
    quote: '"AI ভিডিওতে আমরা এখন ক্লায়েন্টদের জন্য কাস্টমাইজড ট্রেনিং ম্যাটেরিয়াল তৈরি করি মাত্র কয়েক ঘণ্টায় — যা আগে সপ্তাহ লাগত। এটা আমাদের কনসালটিং অফারিংয়ে একটি গেম-চেঞ্জার।"',
    author: 'ফারজানা ইসলাম',
    role: 'পার্টনার, ধর্মা কনসাল্টিং',
    since: 'সেপ্টেম্বর ২০২৫ থেকে ব্যবহারকারী',
    tags: ['কর্পোরেট', 'ট্রেনিং', 'ব্র্যান্ডিং'],
    featured: true,
  },
  {
    id: 'bhasha-digital',
    company: 'ভাষা ডিজিটাল',
    industry: 'ডিজিটাল এজেন্সি',
    location: 'সিলেট, বাংলাদেশ',
    emoji: '🎨',
    gradient: 'from-orange-500 to-red-500',
    thumbnail: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
    challenge: 'একটি ছোট ডিজিটাল এজেন্সি হিসেবে বড় ক্লায়েন্টদের ভিডিও কনটেন্ট দিতে পারছিল না — প্রোডাকশন কস্ট এবং টার্নঅ্যারাউন্ড টাইম দুটোই বড় বাধা ছিল।',
    solution: 'Hostamar-এর প্ল্যান বেছে নিয়ে এজেন্সি এখন ১৫+ ক্লায়েন্টকে মাসিক ভিডিও কনটেন্ট সার্ভিস দিচ্ছে। মাল্টি-টেনান্ট সাপোর্ট এবং ব্র্যান্ড কিট ফিচার প্রতিটি ক্লায়েন্টের জন্য আলাদা ব্র্যান্ডেড ভিডিও তৈরি সহজ করেছে।',
    results: [
      { metric: '১৫+', label: 'মাসিক ক্লায়েন্ট' },
      { metric: '৫×', label: 'রেভিনিউ গ্রোথ' },
      { metric: '১০০%', label: 'ক্লায়েন্ট রিটেনশন' },
      { metric: '৳১.৫L', label: 'মাসিক আয় বৃদ্ধি' },
    ],
    quote: '"Hostamar আমাদের ছোট এজেন্সিকে বড় প্লেয়ারদের সাথে প্রতিযোগিতা করার সামর্থ্য দিয়েছে। এখন আমরা যেকোনো ক্লায়েন্টকে প্রফেশনাল ভিডিও কনটেন্ট দিতে পারি — আগে যা অসম্ভব ছিল।"',
    author: 'আরিফ রহমান',
    role: 'সিইও, ভাষা ডিজিটাল',
    since: 'আগস্ট ২০২৫ থেকে ব্যবহারকারী',
    tags: ['এজেন্সি', 'মাল্টি-ক্লায়েন্ট', 'স্কেলিং'],
    featured: false,
  },
  {
    id: 'shishu-academy',
    company: 'শিশু অ্যাকাডেমি',
    industry: 'এডুকেশন / অনলাইন লার্নিং',
    location: 'ঢাকা, বাংলাদেশ',
    emoji: '📚',
    gradient: 'from-violet-500 to-purple-600',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    challenge: 'অনলাইন কোর্স তৈরির জন্য প্রফেশনাল ভিডিও লেকচার দরকার ছিল কিন্তু স্টুডিও ভাড়া, এডিটিং এবং হোস্টিং খরচে মাসিক খরচ ৳৫০,০০০+ হয়ে যাচ্ছিল।',
    solution: 'Hostamar-এ AI ভিডিও তৈরির পাশাপাশি হোস্টিং এবং ডোমেইন সার্ভিসও ব্যবহার করে সম্পূর্ণ অনলাইন লার্নিং প্ল্যাটফর্ম তৈরি করল। একই প্ল্যাটফর্মে কোর্স, কমিউনিটি এবং ভিডিও — সব এক জায়গায়।',
    results: [
      { metric: '৫০০+', label: 'নিবন্ধিত শিক্ষার্থী' },
      { metric: '৳৪০,০০০', label: 'মাসিক রেভিনিউ' },
      { metric: '৪.৮/৫', label: 'কোর্স রেটিং' },
      { metric: '৩০+', label: 'ভিডিও লেসন' },
    ],
    quote: '"AI ভিডিও এবং ক্লাউড হোস্টিং — দুটোই এক জায়গায় পাওয়া যায় বলে আমাদের টেকনিক্যাল ঝামেলা শূন্যে নেমে এসেছে। এখন শুধু কনটেন্ট তৈরিতে মনোযোগ দিই, বাকি সব Hostamar সামলায়।"',
    author: 'ড. নাজমা সুলতানা',
    role: 'প্রতিষ্ঠাতা, শিশু অ্যাকাডেমি',
    since: 'অক্টোবর ২০২৫ থেকে ব্যবহারকারী',
    tags: ['এডুকেশন', 'অনলাইন কোর্স', 'কমিউনিটি'],
    featured: false,
  },
]

const STATS = [
  { value: '৫০০+', label: 'সক্রিয় ব্যবহারকারী', icon: <Users className="w-5 h-5" /> },
  { value: '১০,০০০+', label: 'AI ভিডিও জেনারেট', icon: <Video className="w-5 h-5" /> },
  { value: '৯৮%', label: 'ক্লায়েন্ট স্যাটিসফ্যাকশন', icon: <Star className="w-5 h-5" /> },
  { value: '৩×', label: 'গড় ROAS বৃদ্ধি', icon: <TrendingUp className="w-5 h-5" /> },
]

export default function CaseStudiesPage() {
  const featuredStudies = CASE_STUDIES.filter(s => s.featured)

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">

      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            ← হোস্টামার
          </Link>
          <Link href="/try-now" className="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
            ফ্রি ট্রায়াল
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-sm font-semibold text-orange-400">
          🏆 Real Success Stories
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          তারা যা অর্জন করেছে <br />
          <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
            আপনিও পারবেন
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          বাংলাদেশের রিয়েল ব্যবসাগুলো কিভাবে Hostamar-এর AI ভিডিও এবং ক্লাউড হোস্টিং দিয়ে তাদের ব্যবসা ট্রান্সফর্ম করেছে — তাদের গল্প পড়ুন।
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {STATS.map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 text-orange-400">
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Case Studies */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-white mb-8">বৈশিষ্ট্যযুক্ত কেস স্টাডি</h2>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {featuredStudies.map((study) => (
            <Link
              key={study.id}
              href={`#${study.id}`}
              className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={study.thumbnail}
                  alt={study.company}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${study.gradient} opacity-40`} />
                <div className="absolute top-4 left-4">
                  <span className="text-4xl">{study.emoji}</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2">
                    {study.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white">{study.company}</h3>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-sm text-gray-400">{study.industry}</span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{study.challenge}</p>

                {/* Results */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {study.results.slice(0, 2).map((r) => (
                    <div key={r.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-orange-400">{r.metric}</div>
                      <div className="text-xs text-gray-500">{r.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-sm text-orange-400 font-medium">
                  <span>পুরো গল্প পড়ুন</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full Case Studies */}
      <section className="max-w-4xl mx-auto px-4 pb-20 space-y-16">
        {CASE_STUDIES.map((study) => (
          <article key={study.id} id={study.id} className="scroll-mt-20">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Hero */}
              <div className="relative h-56">
                <img src={study.thumbnail} alt={study.company} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-br ${study.gradient} opacity-60`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-3">{study.emoji}</div>
                    <h2 className="text-3xl font-bold text-white">{study.company}</h2>
                    <p className="text-white/80 mt-1">{study.industry} · {study.location}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8">
                {/* Quote */}
                <blockquote className="relative mb-8 p-6 bg-white/5 rounded-2xl border-l-4 border-orange-500">
                  <p className="text-lg text-white/90 italic leading-relaxed mb-3">
                    "{study.quote}"
                  </p>
                  <footer className="text-sm">
                    <span className="font-semibold text-white">{study.author}</span>
                    <span className="text-gray-500"> — {study.role}</span>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-orange-400">
                      <Clock className="w-3 h-3" />
                      {study.since}
                    </div>
                  </footer>
                </blockquote>

                {/* Challenge / Solution */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
                    <h3 className="font-bold text-red-400 mb-3">🔴 চ্যালেঞ্জ</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{study.challenge}</p>
                  </div>
                  <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-5">
                    <h3 className="font-bold text-green-400 mb-3">🟢 সলিউশন</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{study.solution}</p>
                  </div>
                </div>

                {/* Results */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">📊 ফলাফল</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {study.results.map((r) => (
                      <div key={r.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                          {r.metric}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {study.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            আপনার সাফল্যের গল্প শুরু করুন
          </h2>
          <p className="text-lg text-white/90 mb-8">
            এই ব্যবসাগুলোর মতো আপনার ব্র্যান্ডও Hostamar-এর AI ভিডিও এবং ক্লাউড হোস্টিং দিয়ে ট্রান্সফর্ম হতে পারে।<br />
            ৭ দিন ফ্রি ট্রায়াল — কোনো ক্রেডিট কার্ড ছাড়াই।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-orange-600 font-bold rounded-xl text-lg hover:bg-orange-50 transition"
            >
              ফ্রি ট্রায়াল শুরু করুন →
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl text-lg hover:bg-white/20 transition"
            >
              বিক্রয় টিমের সাথে কথা বলুন
            </Link>
          </div>
        </div>
      </section>

      {/* Submit Your Story */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">আপনার গল্প জমা দিন</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Hostamar-এর সাথে আপনার সাফল্যের গল্প শেয়ার করুন এবং আমাদের নেক্সট কেস স্টাডিতে স্থান পান।
            ausgewählte ব্যবহারকারীরা বিশেষ সুবিধা পান!
          </p>
          <button className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition">
            সাবমিট করুন →
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-gray-600">
        <p>© 2026 Hostamar.com — AI Video Marketing + Cloud Hosting Platform</p>
      </footer>
    </main>
  )
}
