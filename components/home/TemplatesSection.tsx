'use client'
import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

type Tpl = { emoji: string; bn: string; en: string }

const TEMPLATES: Tpl[] = [
  { emoji: '🌙', bn: 'ঈদ মোবারক', en: 'Eid Mubarak' },
  { emoji: '🌞', bn: 'পহেলা বৈশাখ', en: 'Bengali New Year' },
  { emoji: '🔥', bn: '১১.১১ সেল', en: '11.11 Sale' },
  { emoji: '🇧🇩', bn: '২৬ মার্চ', en: 'Independence Day' },
  { emoji: '💝', bn: 'ভ্যালেন্টাইন', en: 'Valentine' },
  { emoji: '🪔', bn: 'দুর্গা পূজা', en: 'Durga Puja' },
  { emoji: '💍', bn: 'বিয়ে', en: 'Wedding' },
  { emoji: '🌟', bn: 'ইসলামিক নতুন বছর', en: 'Islamic New Year' },
]

export default function TemplatesSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'

  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-block mb-4 px-4 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-semibold">
            {isBengali ? '৫০+ বাংলা টেমপ্লেট' : '50+ Bengali Templates'}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {isBengali ? 'প্রতিটি উৎসবের জন্য রেডি' : 'Ready for every festival'}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {isBengali
              ? 'ঈদ থেকে পূজা — সব সিজনের জন্য প্রি-মেড টেমপ্লেট। এক ক্লিকে ব্যবহার করুন।'
              : 'From Eid to Puja — pre-made templates for every season. Use them with one click.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <Link
              key={t.en}
              href="/create"
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-6 text-center transition-all duration-300 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1"
            >
              <span className="text-3xl transition-transform group-hover:scale-110">{t.emoji}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{t.bn}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t.en}</span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            {isBengali ? 'সব টেমপ্লেট দেখুন' : 'See all templates'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
