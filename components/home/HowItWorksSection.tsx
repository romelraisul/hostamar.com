'use client'
import { useLocale } from '@/lib/locale-context'

const STEPS_EN = [
  {
    n: '1',
    title: 'Pick a template or product',
    desc: 'Choose from 50+ Bengali festival templates (Eid, Boishakh, 11.11) or start from your product.',
  },
  {
    n: '2',
    title: 'Write in Bangla',
    desc: 'Type your offer in Bangla — AI writes the script and generates a natural Bangla voiceover for you.',
  },
  {
    n: '3',
    title: 'Ready in 30 seconds',
    desc: 'Download your video and pay with bKash, Nagad or Rocket. No credit card, no USD needed.',
  },
]

const STEPS_BN = [
  {
    n: '1',
    title: 'টেমপ্লেট বা পণ্য বাছাই করুন',
    desc: '৫০+ বাংলা ফেস্টিভ্যাল টেমপ্লেট (ঈদ, বৈশাখ, ১১.১১) থেকে বেছে নিন অথবা আপনার পণ্য দিয়ে শুরু করুন।',
  },
  {
    n: '2',
    title: 'বাংলায় লিখুন',
    desc: 'আপনার অফার বাংলায় লিখুন — AI স্ক্রিপ্ট লিখে দেবে আর স্বাভাবিক বাংলা ভয়েসওভার বানাবে।',
  },
  {
    n: '3',
    title: '৩০ সেকেন্ডে রেডি',
    desc: 'ভিডিও ডাউনলোড করুন আর bKash, Nagad বা Rocket দিয়ে পেমেন্ট করুন। ক্রেডিট কার্ড লাগে না।',
  },
]

export default function HowItWorksSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const steps = isBengali ? STEPS_BN : STEPS_EN

  return (
    <section className="py-20 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-semibold">
            {isBengali ? 'কীভাবে কাজ করে' : 'How It Works'}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {isBengali ? 'মাত্র ৩ ধাপে ভাইরাল ভিডিও' : 'Viral video in just 3 steps'}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white text-xl font-bold">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
