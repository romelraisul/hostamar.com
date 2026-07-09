'use client'

import { useLocale } from '@/lib/locale-context'

const faqsEn = [
  {
    q: 'How does the bKash refund work?',
    a: 'Cancel within 30 days and the refund goes straight back to your bKash number within 24 hours — no card or bank needed.',
  },
  {
    q: 'Will my video have a watermark?',
    a: 'The free plan adds a small watermark. Starter (৳2,000/mo) and above export clean 1080p with no watermark.',
  },
  {
    q: 'Do I need to know English to make videos?',
    a: 'No. Write in Bangla — e.g. "সুতি পাঞ্জাবি for summer" — and AI generates a Bangla voiceover and captions for you.',
  },
]

const faqsBn = [
  {
    q: 'bKash এ রিফান্ড কিভাবে হয়?',
    a: '৩০ দিনের মধ্যে বাতিল করলে রিফান্ড সরাসরি আপনার bKash নাম্বারে ২৪ ঘণ্টার মধ্যে চলে যায় — কার্ড বা ব্যাংক লাগে না।',
  },
  {
    q: 'ভিডিওতে ওয়াটারমার্ক থাকবে?',
    a: 'ফ্রি প্ল্যানে ছোট ওয়াটারমার্ক থাকে। Starter (৳২,০০০/মাস) ও তার ওপরে ১০৮০p ক্লিন এক্সপোর্ট, কোনো ওয়াটারমার্ক নয়।',
  },
  {
    q: 'ভিডিও বানাতে ইংরেজি জানতে হবে?',
    a: 'না। বাংলায় লিখুন "গরমের জন্য সুতি পাঞ্জাবি" — AI বাংলা ভয়েস আর ক্যাপশন বানিয়ে দেবে।',
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
