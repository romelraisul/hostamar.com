import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import WatchPlayer from './player'

export const revalidate = 3600 // ISR: new videos appear without a full rebuild

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const HLS_LIVE = 'https://tv.hostamar.com/hls/tv/index.m3u8'

type SeoRow = {
  id: string
  videoSourceId: string
  slug: string
  titleBn: string
  metaDescription: string
  keywords: string[]
  transcriptBn: string | null
  schemaJson: unknown
  ogImage: string | null
  canonicalUrl: string
  product: string
  viralScore: number | null
  views: number
  createdAt: Date
  updatedAt: Date
}

async function getSeo(slug: string): Promise<SeoRow | null> {
  try {
    await ensureSchema()
    return await (prisma as any).tvVideoSeo.findUnique({ where: { slug } })
  } catch {
    return null
  }
}

async function getRelated(product: string, excludeSlug: string): Promise<SeoRow[]> {
  try {
    const same = await (prisma as any).tvVideoSeo.findMany({
      where: { product, slug: { not: excludeSlug } },
      take: 3,
      orderBy: { updatedAt: 'desc' },
    })
    if (same.length >= 3) return same
    const rest = await (prisma as any).tvVideoSeo.findMany({
      where: { product: { not: product }, slug: { not: excludeSlug } },
      take: 3 - same.length,
      orderBy: { updatedAt: 'desc' },
    })
    return [...same, ...rest]
  } catch {
    return []
  }
}

// Build-time: prerender every known slug. The Vercel build sandbox cannot reach
// the DB, so this degrades to [] and pages render on-demand (ISR) instead.
export async function generateStaticParams() {
  try {
    await ensureSchema()
    const rows = await (prisma as any).tvVideoSeo.findMany({ select: { slug: true } })
    return rows.map((r: { slug: string }) => ({ slug: r.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = await getSeo(params.slug)
  if (!seo) return { title: 'Hostamar TV — ভিডিয়ো' }
  const schema = (seo.schemaJson || {}) as Record<string, unknown>
  return {
    title: seo.titleBn,
    description: seo.metaDescription,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonicalUrl },
    openGraph: {
      title: seo.titleBn,
      description: seo.metaDescription,
      url: seo.canonicalUrl,
      siteName: 'Hostamar',
      type: 'video.other',
      locale: 'bn_BD',
      images: seo.ogImage
        ? [{ url: `${SITE_URL}${seo.ogImage}`, width: 1200, height: 630, alt: seo.titleBn }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.titleBn,
      description: seo.metaDescription,
      images: seo.ogImage ? [`${SITE_URL}${seo.ogImage}`] : undefined,
    },
    other: {
      'video:duration': typeof schema.duration === 'string' ? schema.duration : undefined as unknown as string,
    },
  }
}

const PRODUCT_BADGE: Record<string, string> = {
  Video: 'AI ভিডিয়ো মেকার',
  Hosting: 'হোস্টিং BDIX',
  Chat: 'AI চ্যাট বানলা',
  Browser: 'AI ব্রাউজার',
  IDE: 'ডেভ IDE ফ্রি',
  Gaming: 'গেম টুর্নামেন্ট',
}

export default async function WatchPage({ params }: { params: { slug: string } }) {
  const seo = await getSeo(params.slug)
  if (!seo) notFound()

  const schema = (seo.schemaJson || {}) as Record<string, unknown>
  const mp4Url = typeof schema.contentUrl === 'string' && schema.contentUrl.includes('/videos/')
    ? schema.contentUrl
    : null
  const related = await getRelated(seo.product, seo.slug)
  const jsonLd = { ...(seo.schemaJson as object), embedUrl: seo.canonicalUrl }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-[980px] px-4 md:px-6 py-8">
        {/* breadcrumb */}
        <div className="mb-4 text-[13px] text-zinc-400">
          <Link href="/" className="hover:text-white">হোম</Link>
          <span className="mx-1.5">›</span>
          <Link href="/tv" className="hover:text-white">TV</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-200">{seo.product}</span>
        </div>

        {/* player */}
        <WatchPlayer
          mp4Url={mp4Url}
          hlsUrl={HLS_LIVE}
          poster={seo.ogImage ? `${SITE_URL}${seo.ogImage}` : undefined}
          title={seo.titleBn}
        />

        {/* title + badges */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#0E7C3A] px-3 py-1 text-[13px] font-bold">
            {PRODUCT_BADGE[seo.product] || seo.product}
          </span>
          {seo.viralScore != null && seo.viralScore > 0 && (
            <span className="rounded-full bg-red-600/90 px-3 py-1 text-[13px] font-bold">
              🔥 Viral {seo.viralScore}
            </span>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-[13px]">📺 Hostamar TV</span>
        </div>

        <h1 className="mt-3 text-[26px] md:text-[34px] font-bold leading-[1.25]">{seo.titleBn}</h1>
        <p className="mt-3 text-[15px] text-zinc-300 leading-relaxed">{seo.metaDescription}</p>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/video/create?template=${seo.slug}`}
            className="rounded-lg bg-[#0E7C3A] hover:bg-[#0c6b32] px-5 py-2.5 text-[15px] font-bold"
          >
            এই ভিডিয়োর মতো নিজের ভিডিয়ো বানান — 100 ক্রেডিট
          </Link>
          <Link href="/tv" className="rounded-lg bg-white/10 hover:bg-white/20 px-5 py-2.5 text-[15px] font-semibold">
            ▶ লাইভ TV দেখুন
          </Link>
        </div>

        {/* transcript (collapsible, indexable) */}
        {seo.transcriptBn && (
          <details className="mt-8 rounded-xl bg-white/5 p-5" open>
            <summary className="cursor-pointer text-[16px] font-bold text-zinc-100">
              📝 ভিডিয়োর ট্রান্সক্রিপ্ট (বানলা)
            </summary>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-zinc-300">
              {seo.transcriptBn}
            </p>
          </details>
        )}

        {/* keyword tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {seo.keywords.map((k) => (
            <span key={k} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-zinc-300">
              #{k}
            </span>
          ))}
        </div>

        {/* IPTV */}
        <p className="mt-6 text-[13px] text-zinc-400">
          📺 TV-তে দেখুন: <a className="text-[#4ade80] hover:underline" href="https://hostamar.com/api/tv/iptv.m3u">hostamar.com/api/tv/iptv.m3u</a> (VLC / Smart TV)
        </p>

        {/* related */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-[20px] font-bold mb-4">আরও ভিডিয়ো</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/tv/watch/${r.slug}`}
                  className="group rounded-xl bg-white/5 overflow-hidden hover:bg-white/10 transition"
                >
                  {r.ogImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${SITE_URL}${r.ogImage}`} alt={r.titleBn} className="w-full aspect-video object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <div className="text-[11px] font-bold text-[#4ade80]">{PRODUCT_BADGE[r.product] || r.product}</div>
                    <div className="mt-1 text-[13px] font-semibold leading-snug line-clamp-2 group-hover:text-white">
                      {r.titleBn}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
