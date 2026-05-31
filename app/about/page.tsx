// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import AboutContent from './about-content'

export const metadata: Metadata = {
  title: 'About Hostamar — Our Story & Mission | Hostamar',
  description:
    'Learn about Hostamar — the all-in-one platform built in Bangladesh. Cloud hosting, AI marketing videos, LuckyStar gaming, AI browser, free AI chat, and cloud dev IDE for creators and businesses.',
  alternates: { canonical: 'https://hostamar.com/about' },
  openGraph: {
    title: 'About Hostamar — Our Story & Mission | Hostamar',
    description:
      'Learn about Hostamar — the all-in-one platform built in Bangladesh. Cloud hosting, AI marketing videos, gaming, AI browser, and developer tools.',
    url: 'https://hostamar.com/about',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'About Hostamar' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Hostamar — Our Story & Mission | Hostamar',
    description: 'Learn about Hostamar — the all-in-one platform built in Bangladesh.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['about hostamar', 'hostamar story', 'bangladesh tech startup', 'cloud hosting bangladesh', 'ai platform'],
}

export default function AboutPage() {
  return <AboutContent />
}
