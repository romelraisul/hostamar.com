'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Demo {
  id: string
  title: string
  bnTitle: string
  url: string
  thumbnail: string
}

const DEMOS: Demo[] = [
  { id: 'islamic-new-year', title: 'Islamic New Year Demo', bnTitle: 'ইসলামিক নতুন বছর', url: '/demo/islamic-new-year-demo.mp4', thumbnail: '/demo/islamic-new-year-demo-thumb.jpg' },
  { id: 'eid-celebration', title: 'Eid Celebration Demo', bnTitle: 'ঈদ উদযাপন', url: '/demo/eid-celebration-demo.mp4', thumbnail: '/demo/eid-celebration-demo-thumb.jpg' },
  { id: 'business-promo', title: 'Business Promotion Demo', bnTitle: 'ব্যবসা প্রোমোশন', url: '/demo/business-promo-demo.mp4', thumbnail: '/demo/business-promo-demo-thumb.jpg' },
]

export default function DemoVideosSection() {
  const [playing, setPlaying] = useState<string | null>(null)
  const [broken, setBroken] = useState<Record<string, boolean>>({})

  return (
    <section className="py-20 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            AI Studio Demo Videos
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Real AI-generated samples — watch how Hostamar creates professional videos in 30 seconds
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {DEMOS.map((demo) => (
            <div key={demo.id} className="group">
              <div className="aspect-video bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-4 relative">
                {playing === demo.id && !broken[demo.id] ? (
                  <video
                    src={demo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                    onError={() => setBroken((b) => ({ ...b, [demo.id]: true }))}
                    onEnded={() => setPlaying(null)}
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Play ${demo.title}`}
                      className="absolute inset-0 flex items-center justify-center"
                      onClick={() => setPlaying(demo.id)}
                    >
                      <span className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </button>
                    {broken[demo.id] || !demo.thumbnail ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/40 to-slate-800">
                        <span className="text-xs text-emerald-300">{demo.bnTitle}</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={demo.thumbnail}
                        alt={demo.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
                        onError={() => setBroken((b) => ({ ...b, [demo.id]: true }))}
                      />
                    )}
                  </>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-center">{demo.bnTitle}</h3>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            Create Your Own Video
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
