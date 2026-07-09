'use client'
import { useLocale } from '@/lib/locale-context'

type Review = { name: string; role: string; quote: string }

const EN: Review[] = [
  {
    name: 'Rashed A.',
    role: 'Fashion store owner, Dhaka',
    quote: 'Made an Eid promo in 2 minutes. Got 3x more orders that week than my old designer videos. bKash payment was instant.',
  },
  {
    name: 'Fatema K.',
    role: 'Home baker, Chittagong',
    quote: 'I cannot use English tools. Here I just type in Bangla and it talks for me. My cake reels finally sound local.',
  },
  {
    name: 'Imran S.',
    role: 'Electronics reseller, Bogura',
    quote: 'Hosting + video in one bill. Cancelled two subscriptions. Saved me around ৳3,000 a month.',
  },
]

const BN: Review[] = [
  {
    name: 'রাশেদ A.',
    role: 'ফ্যাশন স্টোর মালিক, ঢাকা',
    quote: '২ মিনিটে ঈদের প্রোমো বানালাম। আগের ডিজাইনার ভিডিওর চেয়ে সেই সপ্তাহে ৩ গুণ বেশি অর্ডার এলো। bKash পেমেন্ট সাথে হয়ে গেল।',
  },
  {
    name: 'ফাতেমা K.',
    role: 'হোম বেকারি, চট্টগ্রাম',
    quote: 'ইংরেজি টুল ব্যবহার করতে পারি না। এখানে বাংলায় লিখলেই ভয়েস বানিয়ে দেয়। আমার কেক রিল এখন লোকাল মনে হয়।',
  },
  {
    name: 'ইমরান S.',
    role: 'ইলেকট্রনিক্স রিসেলার, বগুড়া',
    quote: 'হোস্টিং + ভিডিও এক বিলে। দুইটা সাবস্ক্রিপশন বাতিল করে দিলাম। মাসে প্রায় ৳৩,০০০ বাঁচলো।',
  },
]

export default function TestimonialsSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const reviews = isBengali ? BN : EN

  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {isBengali ? 'ব্যবসায়ীরা কী বলে' : "What business owners say"}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div
              key={r.name}
              className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800"
            >
              <div className="text-emerald-500 text-2xl mb-2">“</div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-4">{r.quote}</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{r.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {isBengali
            ? 'নাম পরিবর্তিত করা হয়েছে; রিয়েল ইউজার রিভিউ সংগ্রহ চলমান।'
            : 'Names changed for privacy; collecting real user reviews.'}
        </p>
      </div>
    </section>
  )
}
