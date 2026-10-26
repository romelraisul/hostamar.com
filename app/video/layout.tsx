import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Video Generation - HunyuanVideo + WANGP GPU | Hostamar',
  description: '৩০ সেকেন্ডের AI ভিডিও বাংলা টেমপ্লেট থেকে, HunyuanVideo ও WANGP লোকাল GPU-তে — bKash/Nagad/Rocket পেমেন্ট।',
  alternates: { canonical: 'https://hostamar.com/video' },
}

const videoJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Hostamar 30-second AI video sample',
    description: 'A 30-second video generated from a scene description on EU/BD GPUs.',
    contentUrl: 'https://hostamar.com/demo-30s.mp4',
    thumbnailUrl: 'https://hostamar.com/opengraph-image.png',
    uploadDate: '2026-09-01',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Hostamar bKash checkout demo',
    description: 'Paying for AI video generation in BDT with bKash, no USD card required.',
    contentUrl: 'https://hostamar.com/ad-bkash-15s.mp4',
    thumbnailUrl: 'https://hostamar.com/opengraph-image.png',
    uploadDate: '2026-09-01',
  },
]

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {videoJsonLd.map((ld) => (
        <script key={ld.name} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      {children}
    </>
  )
}
