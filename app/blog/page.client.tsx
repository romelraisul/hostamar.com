'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Eye, Clock, Calendar, ArrowRight, Mail, Sparkles } from 'lucide-react'
import {
  POSTS, BLOG_CATS, FEATURED, GRID, POPULAR, formatViews,
  type BlogCat,
} from '@/lib/blog'

const GREEN = '#0E7C3A'

export default function BlogPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'all' | BlogCat>('all')
  const [subbed, setSubbed] = useState(false)
  const [email, setEmail] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POSTS.filter((p) => {
      const catOk = cat === 'all' || p.category === cat
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      return catOk && qOk
    }).sort((a, b) => b.views - a.views)
  }, [query, cat])

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      {/* trust banner */}
      <div className="w-full bg-[#0E7C3A] text-white text-[12px] md:text-[13px] leading-none">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 md:gap-6 font-medium">
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 opacity-90" /> বাংলায় AI টিপস</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">সাপ্তাহিক ১ ইমেইল</span>
            <span className="inline-flex items-center gap-1.5">৪.৮ রেটিং</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-semibold tracking-wide">🇧🇩 Made for Bangladesh</span>
        </div>
      </div>

      {/* hero */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-12 md:pt-16 pb-6 text-center">
        <h1 className="text-[34px] md:text-[48px] font-bold tracking-[-0.03em] leading-[1.05]">
          হোস্টামার <span style={{ color: GREEN }}>ব্লগ</span>
        </h1>
        <p className="mt-3 text-[15px] md:text-[17px] text-zinc-500 max-w-[640px] mx-auto">
          AI ভিডিও, ব্যবসা, মার্কেটিং ও টেকনোলজি — বাংলায়
        </p>
      </section>

      {/* search + pills */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ব্লগ খুঁজুন... যেমন bKash পেমেন্ট"
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-12 pr-4 text-[15px] outline-none focus:border-[#0E7C3A] focus:ring-2 focus:ring-[#0E7C3A]/20"
          />
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {BLOG_CATS.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition ${cat === c.key ? 'bg-[#0E7C3A] text-white shadow' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* featured + grid + sidebar */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* featured */}
            {query.trim() === '' && cat === 'all' && (
              <Link href={`/blog/${FEATURED.slug}`} className="group block overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#0c6c33] to-[#0E7C3A] text-white shadow-sm transition hover:shadow-lg">
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/15 text-4xl md:h-24 md:w-24">{FEATURED.icon}</div>
                  <div className="min-w-0">
                    {FEATURED.badge && (
                      <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold">{FEATURED.badge}</span>
                    )}
                    <h2 className="mt-3 text-[22px] md:text-[26px] font-bold leading-tight">{FEATURED.title}</h2>
                    <p className="mt-2 text-[14px] text-white/85 line-clamp-2">{FEATURED.excerpt}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-white/80">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {FEATURED.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {FEATURED.readTime}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatViews(FEATURED.views)} views</span>
                      <span>· {FEATURED.author}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* grid */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-[15px] text-zinc-500">
                কোনো আর্টিকেল পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {filtered.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:border-[#0E7C3A]/40 hover:shadow-lg">
                    <div className="relative grid h-36 place-items-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-5xl">
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">{p.category}</span>
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white"><Eye className="h-3 w-3" /> {formatViews(p.views)}</span>
                      {p.icon}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-[16px] font-bold leading-snug text-zinc-900 group-hover:text-[#0E7C3A]">{p.title}</h3>
                      <p className="mt-2 line-clamp-2 text-[13.5px] text-zinc-500">{p.excerpt}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readTime}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.tags.map((t) => (
                          <span key={t} className="rounded-full bg-[#0E7C3A]/8 px-2 py-0.5 text-[11px] font-medium text-[#0E7C3A]">{t}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-[15px] font-bold">বাংলায় AI টিপস পান</p>
                <p className="mt-1 text-[13px] text-zinc-500">সাপ্তাহিক ১ ইমেইল, কোনো স্প্যাম নয়। ৳২,০০০ আপসেলের জন্য লিস্ট বাড়ান।</p>
                {subbed ? (
                  <p className="mt-4 rounded-xl bg-[#0E7C3A]/8 px-4 py-3 text-[14px] font-semibold text-[#0E7C3A]">✓ সাবস্ক্রাইব করা হয়েছে!</p>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setSubbed(true) }} className="mt-4 space-y-2">
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="আপনার ইমেইল"
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-[14px] outline-none focus:border-[#0E7C3A]" />
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E7C3A] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0c6c33]">
                      <Mail className="h-4 w-4" /> সাবস্ক্রাইব
                    </button>
                  </form>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-[15px] font-bold">জনপ্রিয়</p>
                <ul className="mt-3 space-y-3">
                  {POPULAR.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}`} className="flex items-start gap-3">
                        <span className="text-[18px]">{p.icon}</span>
                        <span className="text-[13.5px] font-medium leading-snug text-zinc-700 hover:text-[#0E7C3A]">{p.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-[15px] font-bold">ক্যাটাগরি</p>
                <ul className="mt-3 space-y-2 text-[14px]">
                  {BLOG_CATS.filter((c) => c.key !== 'all').map((c) => {
                    const n = POSTS.filter((p) => p.category === c.key).length
                    return (
                      <li key={c.key} className="flex items-center justify-between text-zinc-600">
                        <button onClick={() => setCat(c.key as BlogCat)} className="hover:text-[#0E7C3A]">{c.label}</button>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] text-zinc-500">{n}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* bottom CTA -> convert to trial */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pb-16">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#0E7C3A] to-[#0c6c33] p-8 text-center text-white md:p-10">
          <h2 className="text-[22px] md:text-[28px] font-bold">ব্লগ পড়লেন, এবার ভিডিও বানান</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[14px] text-white/85">
            ফ্রি দিয়ে শুরু করুন — ক্রেডিট কার্ড লাগে না। ১০ মিনিটে প্রথম রিল তৈরি করুন।
          </p>
          <Link href="/video"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-bold text-[#0E7C3A] transition hover:bg-zinc-100">
            স্টুডিওতে যান <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
