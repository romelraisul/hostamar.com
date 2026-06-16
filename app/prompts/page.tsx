import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Video Prompts in Bangla — Hostamar',
  description:
    '১০০+ বাংলা AI ভিডিও প্রম্পট টেমপ্লেট — কপি করে আজই হোস্টামারে পেস্ট করুন, ৯০ সেকেন্ডে ভিডিও পান।',
}

const CATEGORIES = [
  {
    icon: '🛍️',
    name: 'ফেসবুক শপ বিজ্ঞাপন',
    desc: '৩০ সেকেন্ডের হুক + প্রোডাক্ট শোকেস',
    prompts: [
      {
        title: 'কাপড়ের প্রমো ভিডিও',
        prompt:
          'একজন তরুণী ঢাকার একটি গলিতে হাঁটছে, পরনে জামদানি শাড়ি, ক্যামেরা ধীরে ধীরে কাপড়ের ডিজাইন দেখাচ্ছে। ব্যাকগ্রাউন্ডে বাংলা পপ মিউজিক।',
      },
      {
        title: 'ই-কমার্স রিভিউ',
        prompt:
          'একজন গ্রাহক বাক্স খুলছে, প্রোডাক্ট ধরে হাসিমুখে ক্যামেরার দিকে তাকাচ্ছে। টেক্সট অন-স্ক্রিন: "সারপ্রাইজ উপহার!"',
      },
      {
        title: 'সেল অফার ভিডিও',
        prompt:
          'স্ট্রিট ভিউ, বড় ব্যানার: "৫০% ছাড়", তারিখ গণনা উল্টো কাউন্টডাউন। বাংলা ভয়েসওভার জরুরি টোন।',
      },
    ],
  },
  {
    icon: '📚',
    name: 'শিক্ষা কন্টেন্ট',
    desc: 'রিলস ও ইউটিউব শর্টসের জন্য',
    prompts: [
      {
        title: 'ইংরেজি শব্দ শেখা',
        prompt:
          'সাদা বোর্ডে বাংলা অর্থসহ ইংরেজি শব্দ দেখাচ্ছে, ক্যারেক্টার উচ্চারণ করছে, প্রতিটি শব্দ ২ সেকেন্ড।',
      },
      {
        title: 'গণিত সমস্যা সমাধান',
        prompt:
          'স্ক্রিন রেকর্ডিং স্টাইল: একটা গাণিতিক সমস্যার ধাপে ধাপে সমাধান। বাংলা ভয়েসওভার ব্যাখ্যা দিচ্ছে।',
      },
    ],
  },
  {
    icon: '🕌',
    name: 'ধর্মীয় ও আধ্যাত্মিক',
    desc: 'রমজান, ঈদ, পূজা কন্টেন্ট',
    prompts: [
      {
        title: 'সূরা তিলাওয়াত',
        prompt:
          'গাঢ় সবুজ ব্যাকগ্রাউন্ডে আরবি আয়াত, নিচে বাংলা অনুবাদ, নরম নাশিদ ব্যাকগ্রাউন্ড। ৬০ সেকেন্ড।',
      },
      {
        title: 'ঈদ শুভেচ্ছা',
        prompt:
          'চাঁদের ছবি, ফুলের অ্যানিমেশন, হাতে লেখা বাংলায় "ঈদ মুবারক", বাংলা সুরে শুভেচ্ছা।',
      },
    ],
  },
  {
    icon: '🍳',
    name: 'রেসিপি ও ফুড',
    desc: 'শর্ট রেসিপি, রেস্তোরাঁ মার্কেটিং',
    prompts: [
      {
        title: '১ মিনিটের নাস্তা',
        prompt:
          'ওভেন-টপ শট, স্টিলের থালায় গরম গরম সিঙ্গারা, সস ঢালছে, ক্লোজ-আপ। বাংলা টেক্সট: "১০ মিনিটে বানানো!"',
      },
      {
        title: 'চায়ের দোকান রিল',
        prompt:
          'ফুটপাতের চায়ের দোকান, কাপে চা ঢালা, কাপের ধোঁয়া উঠছে, বাংলা গান পটভূমিতে। ৩০ সেকেন্ড।',
      },
    ],
  },
  {
    icon: '💼',
    name: 'ব্যবসা ও মার্কেটিং',
    desc: 'ব্র্যান্ড পরিচিতি, অফার',
    prompts: [
      {
        title: 'রেস্তোরাঁ পরিচিতি',
        prompt:
          'ড্রোন শট — গুলশানের রেস্তোরাঁ, ভেতরে ক্লায়েন্ট খাচ্ছে, বাংলা ভয়েসওভার: "২০ বছরের স্বাদ, এখন আপনার দোরগোড়ায়।"',
      },
      {
        title: 'স্টার্টআপ পিচ',
        prompt:
          'প্রফেশনাল ফন্ট, বাংলা + ইংরেজি টেক্সট, ৩টা স্লাইড: সমস্যা → সমাধান → যোগাযোগ। ১ মিনিট।',
      },
    ],
  },
]

export default function PromptsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">← হোস্টামার</Link>
          <Link href="/signup?ref=prompts" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">ফ্রি ট্রায়াল</Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            কপি-পেস্ট বাংলা প্রম্পট
          </h1>
          <p className="text-lg text-gray-600">
            নিচের যেকোনো প্রম্পট কপি করে হোস্টামারে পেস্ট করুন — ৯০ সেকেন্ডে ভিডিও রেডি।
          </p>
        </div>
      </header>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{cat.name}</h2>
                <p className="text-sm text-gray-500">{cat.desc}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.prompts.map((p) => (
                <article
                  key={p.title}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all"
                >
                  <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{p.prompt}</p>
                  <Link
                    href={`/signup?ref=prompts&prompt=${encodeURIComponent(p.prompt)}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    এই প্রম্পট দিয়ে ভিডিও বানান →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">এই প্রম্পটগুলো আপনারও হোক</h2>
          <p className="text-lg opacity-90 mb-6">৭ দিন ফ্রি। ক্রেডিট কার্ড লাগে না।</p>
          <Link href="/signup?ref=prompts" className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-gray-100">
            এখনই শুরু করুন →
          </Link>
        </div>
      </section>
    </main>
  )
}
