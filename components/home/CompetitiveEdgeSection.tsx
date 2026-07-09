'use client'

import { useLocale } from '@/lib/locale-context'

const FEATURES_BN = [
  { title: 'বাংলা সাপোর্ট', desc: 'স্ক্রিপ্ট, ভয়েস, ক্যাপশন — সব বাংলায় অটো', emoji: '🇧🇩', bg: 'bg-[#F0FDF4]' },
  { title: 'ফাস্ট এক্সপোর্ট', desc: '৩০ সেকেন্ডে রেডি, ১ ক্লিক এক্সপোর্ট', emoji: '⚡', bg: 'bg-[#FFF7ED]' },
  { title: '৫০+ টেমপ্লেট', desc: 'ঈদ, বৈশাখ, ১১.১১ — ফেস্টিভাল রেডি', emoji: '🎬', bg: 'bg-[#EFF6FF]' },
  { title: 'সিকিউর', desc: 'bKash দিয়ে পেমেন্ট, ডেটা নিরাপদ', emoji: '🔒', bg: 'bg-[#FDF2F8]' },
]
const FEATURES_EN = [
  { title: 'Bangla support', desc: 'Script, voice, captions — auto in Bangla', emoji: '🇧🇩', bg: 'bg-[#F0FDF4]' },
  { title: 'Fast export', desc: 'Ready in 30s, 1-click export', emoji: '⚡', bg: 'bg-[#FFF7ED]' },
  { title: '50+ templates', desc: 'Eid, Boishakh, 11.11 — festival ready', emoji: '🎬', bg: 'bg-[#EFF6FF]' },
  { title: 'Secure', desc: 'bKash payments, data safe', emoji: '🔒', bg: 'bg-[#FDF2F8]' },
]

export default function BentoFeaturesSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const features = isBengali ? FEATURES_BN : FEATURES_EN

  return (
    <section className="bg-[#FCFCF9] px-5 py-16">
      {/* Proof bar — one line */}
      <div className="mx-auto mb-12 flex max-w-[1120px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
        {[
          ['500+', isBengali ? 'অ্যাকটিভ ক্রিয়েটর' : 'Active Creators'],
          ['10K+', isBengali ? 'ভিডিও' : 'Videos'],
          ['50+', isBengali ? 'টেমপ্লেট' : 'Templates'],
          ['99%', isBengali ? 'সাফল্য' : 'Success'],
        ].map(([n, l]) => (
          <div key={l} className="flex items-baseline gap-2">
            <span className="font-hind text-2xl font-bold text-[#0E7C3A]">{n}</span>
            <span className="text-sm text-zinc-500">{l}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-[1120px]">
        <h2 className="mb-8 text-center font-hind text-3xl font-bold tracking-tight text-[#18181B]">
          {isBengali ? 'ভিডিও বানাতে যা যা লাগে' : 'Everything you need to create'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border border-zinc-200 p-5 ${f.bg} transition hover:shadow-lg`}
            >
              <div className="mb-3 text-3xl">{f.emoji}</div>
              <h3 className="font-hind text-lg font-bold text-[#18181B]">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
