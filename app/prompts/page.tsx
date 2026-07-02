'use client'

import { useLocale } from '@/lib/locale-context'

const PROMPTS = [
  {
    cat: 'video',
    title: 'Eid Mubarak Promo',
    body: 'একটি ৩০-সেকেন্ডের ঈদ মোবারক ভিডিও বানান। চাঁদ, মসজিদ, ফুলের অ্যানিমেশন + বাংলা ভয়েসওভার যোগ করুন।',
    bodyEn: 'Create a 30-second Eid Mubarak video. Add crescent moon, mosque, flowers animation + Bengali voiceover.',
  },
  {
    cat: 'video',
    title: 'Business Promo',
    body: 'আমার ব্যবসার জন্য ১৫-সেকেন্ডের একটি প্রমোশন ভিডিও বানান। লোগো, অফার, ফোন নম্বর দেখান। মডার্ন স্টাইল।',
    bodyEn: 'Create a 15-second promo for my business. Show logo, offer, phone number. Modern style.',
  },
  {
    cat: 'chat',
    title: 'Bengali Email Drafter',
    body: 'আমাকে এই ইমেইলের একটি পেশাদার বাংলা উত্তর লিখে দিন। আনুষ্ঠানিক কিন্তু বন্ধুসুলভ টোন।',
    bodyEn: 'Write a professional Bengali reply to this email. Formal but friendly tone.',
  },
  {
    cat: 'chat',
    title: 'Code Explainer',
    body: 'এই কোডটি আমাকে বাংলায় সহজ ভাষায় ব্যাখ্যা করুন। শুরু থেকে কী হচ্ছে, তারপর কী হবে — ধাপে ধাপে।',
    bodyEn: 'Explain this code to me in simple Bengali. Step-by-step, what happens first, what happens next.',
  },
  {
    cat: 'business',
    title: 'Sales Copy',
    body: 'এই পণ্যের জন্য একটি কনভার্টিং সেলস কপি লিখুন। বাংলায়, মোবাইল-ফার্স্ট ফরম্যাটে। ১৫০ শব্দের মধ্যে।',
    bodyEn: 'Write a converting sales copy for this product. In Bengali, mobile-first format. Within 150 words.',
  },
  {
    cat: 'business',
    title: 'WhatsApp Customer Reply',
    body: 'একজন গ্রাহক দাম জানতে চাইছে। তাকে একটি বন্ধুসুলভ, পেশাদার বাংলা উত্তর দিন।',
    bodyEn: 'A customer is asking the price. Give them a friendly, professional Bengali reply.',
  },
]

export default function PromptsPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('prompts.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('prompts.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PROMPTS.map((p, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {t(`prompts.category.${p.cat}`)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {p.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                {p.body}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {p.bodyEn}
              </p>
              <button
                className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(p.bodyEn)
                  }
                }}
              >
                Copy English
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(JSON.stringify(PROMPTS, null, 2))
              }
            }}
          >
            Copy All Prompts (JSON)
          </button>
        </div>
      </div>
    </div>
  )
}
