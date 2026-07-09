'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

const DEMOS = [
  { id: 'islamic-new-year', url: '/demo/islamic-new-year-demo.mp4', thumb: '/demo/islamic-new-year-demo-thumb.jpg', titleBn: 'ইসলামিক নতুন বছর', titleEn: 'Islamic New Year' },
  { id: 'eid-celebration', url: '/demo/eid-celebration-demo.mp4', thumb: '/demo/eid-celebration-demo-thumb.jpg', titleBn: 'ঈদ উদযাপন', titleEn: 'Eid Celebration' },
  { id: 'business-promo', url: '/demo/business-promo-demo.mp4', thumb: '/demo/business-promo-demo-thumb.jpg', titleBn: 'ব্যবসা প্রোমোশন', titleEn: 'Business Promotion' },
]

export default function DemoVideosSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const [playing, setPlaying] = useState<string | null>(null)

  return (
    <section className="bg-[#FCFCF9] px-5 py-16">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-10 text-center">
          <h2 className="font-hind text-3xl font-bold tracking-tight text-[#18181B]">
            {isBengali ? 'নিজে দেখুন, ৩০ সেকেন্ডে কি হয়' : 'See it yourself — 30 seconds'}
          </h2>
          <p className="mt-2 text-zinc-500">
            {isBengali
              ? 'আসল AI-জেনারেটেড স্যাম্পল — বাংলা স্ক্রিপ্ট থেকে ভিডিও'
              : 'Real AI-generated samples — Bangla script to video'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {DEMOS.map((d) => (
            <div key={d.id} className="group">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                {playing === d.id ? (
                  <video
                    src={d.url}
                    controls
                    autoPlay
                    className="h-full w-full object-cover"
                    onEnded={() => setPlaying(null)}
                  />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.thumb}
                      alt={d.titleEn}
                      className="h-full w-full object-cover opacity-90 transition group-hover:opacity-70"
                    />
                    <button
                      type="button"
                      aria-label={`Play ${d.titleEn}`}
                      className="absolute inset-0 flex items-center justify-center"
                      onClick={() => setPlaying(d.id)}
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0E7C3A] shadow-lg transition group-hover:scale-110">
                        <svg className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </button>
                  </>
                )}
              </div>
              <h3 className="mt-3 text-center font-semibold text-[#18181B]">
                {isBengali ? d.titleBn : d.titleEn}
              </h3>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-full bg-[#0E7C3A] px-6 py-3 font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            {isBengali ? 'নিজের ভিডিও বানান' : 'Make your own video'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
