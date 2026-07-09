'use client'

import { useLocale } from '@/lib/locale-context'

const faqsEn = [
  {
    q: 'Is Hostamar like ExonHost or HostSeba?',
    a: 'Partly. We offer hosting, but also bundle AI video, chat, browser, IDE and games on one bill. ExonHost only does hosting — you’d pay $20+ for a separate video tool.',
  },
  {
    q: 'Are bKash payments automatic?',
    a: 'Yes. bKash, Nagad and Rocket are all automatic. After payment, your invoice PDF is emailed to you.',
  },
  {
    q: 'Will the free plan have a watermark?',
    a: 'Yes — a small watermark at 720p. Starter removes it and gives you 1080p.',
  },
  {
    q: 'Do I need to know English to make videos?',
    a: 'No. Write in Bangla — e.g. “সুতি পাঞ্জাবি for summer” — and AI generates a Bangla voiceover for you.',
  },
  {
    q: 'How fast is the hosting?',
    a: 'Dhaka Edge + BDIX means 2-3x faster for Bangladeshi visitors than US servers. LiteSpeed + NVMe.',
  },
  {
    q: 'Do I get a refund if I cancel?',
    a: '30-day money-back guarantee, refunded to bKash within 24 hours.',
  },
]

const faqsBn = [
  {
    q: 'Hostamar কি ExonHost বা HostSeba এর মতো?',
    a: 'আংশিক। আমরা হোস্টিং দিই, কিন্তু সাথে AI ভিডিও, চ্যাট, ব্রাউজার, IDE, গেম — একই বিলে। ExonHost শুধু হোস্টিং দেয়, ভিডিওর জন্য আলাদা $২০+ টুল কিনতে হয়।',
  },
  {
    q: 'bKash দিয়ে পেমেন্ট অটো হবে?',
    a: 'হ্যাঁ। bKash, Nagad, Rocket তিনটাই অটো। পেমেন্ট করলেই ইনভয়েস PDF মেইলে যাবে।',
  },
  {
    q: 'ফ্রি প্ল্যানে ওয়াটারমার্ক থাকবে?',
    a: 'হ্যাঁ, ৭২০p তে ছোট ওয়াটারমার্ক। স্টার্টারে নেই, ১০৮০p।',
  },
  {
    q: 'ভিডিও বানাতে ইংরেজি জানতে হবে?',
    a: 'না। বাংলায় লিখুন "গরমের জন্য সুতি পাঞ্জাবি" — AI বাংলা ভয়েস বানিয়ে দেবে।',
  },
  {
    q: 'হোস্টিং কত ফাস্ট?',
    a: 'Dhaka Edge + BDIX, বাংলাদেশের ভিজিটরের জন্য US এর চেয়ে ২-৩ গুণ ফাস্ট। LiteSpeed + NVMe।',
  },
  {
    q: 'বাতিল করলে টাকা ফেরত?',
    a: '৩০ দিন মানি-ব্যাক, bKash এ ২৪ ঘণ্টায় রিফান্ড।',
  },
]

export default function FAQSection() {
  const { t, locale } = useLocale()
  const isBengali = locale === 'bn'
  const faqs = isBengali ? faqsBn : faqsEn

  return (
    <section className="bg-surface-light dark:bg-slate-900 px-4 py-20 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {isBengali ? 'সচরাচর জিজ্ঞাসা' : 'Frequently Asked Questions'}
        </h2>
        <div className="mt-8 space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none justify-between font-semibold text-gray-900 dark:text-white">
                {f.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
