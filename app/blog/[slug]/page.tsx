import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Eye, Clock, Calendar } from 'lucide-react'
import { POSTS, getPost, FEATURED, GRID, formatViews } from '@/lib/blog'

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return { title: 'Blog — Hostamar' }
  return {
    title: `${post.title} — Hostamar ব্লগ`,
    description: post.excerpt,
    alternates: { canonical: `https://hostamar.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://hostamar.com/blog/${post.slug}`,
      siteName: 'Hostamar',
      type: 'article',
      locale: 'bn_BD',
    },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author || 'Hostamar Team' },
    publisher: { '@type': 'Organization', name: 'Hostamar' },
    mainEntityOfPage: `https://hostamar.com/blog/${post.slug}`,
    keywords: post.tags.join(', '),
  }
  const related = (post.slug === FEATURED.slug ? GRID : [FEATURED, ...GRID.filter((g) => g.slug !== post.slug)]).slice(0, 3)

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-[760px] px-4 md:px-6 py-10">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-500 hover:text-[#0E7C3A]">
          <ArrowLeft className="h-4 w-4" /> ব্লগে ফিরুন
        </Link>

        <div className="mt-5 flex items-center gap-2 text-[13px]">
          <span className="rounded-full bg-[#0E7C3A]/10 px-3 py-1 font-semibold text-[#0E7C3A]">{post.category}</span>
          {post.badge && <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-600">{post.badge}</span>}
        </div>

        <h1 className="mt-4 text-[28px] md:text-[38px] font-bold leading-[1.15] tracking-[-0.02em]">
          {post.icon} {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-zinc-500">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {post.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatViews(post.views)} views</span>
          <span>· {post.author}</span>
        </div>

        <div className="mt-6 space-y-5 text-[16px] leading-7 text-zinc-700">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-[#0E7C3A]/8 px-2.5 py-1 text-[12px] font-medium text-[#0E7C3A]">{t}</span>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#0E7C3A]/30 bg-[#0E7C3A]/5 p-5 text-center">
          <p className="text-[15px] font-semibold text-[#0E7C3A]">এই পোস্ট পছন্দ হলে, এবার ভিডিও বানান</p>
          <Link href="/video" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0E7C3A] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#0c6c33]">
            ফ্রিতে স্টুর্ট করুন
          </Link>
        </div>
      </article>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pb-16">
        <h2 className="text-[20px] font-bold">আরও পড়ুন</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {related.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:border-[#0E7C3A]/40 hover:shadow-lg">
              <div className="grid h-28 place-items-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-4xl">{p.icon}</div>
              <div className="p-4">
                <h3 className="text-[15px] font-bold leading-snug group-hover:text-[#0E7C3A]">{p.title}</h3>
                <p className="mt-1 text-[12.5px] text-zinc-500">{p.readTime} · {formatViews(p.views)} views</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
