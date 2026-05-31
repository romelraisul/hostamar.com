import { Metadata } from 'next'
import BlogPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Blog — Hostamar Tips, Guides & Platform Updates',
  description:
    'Read the latest tips, tutorials, and product updates from Hostamar. AI video creation guides, hosting best practices, and platform news for Bangladeshi creators.',
  alternates: { canonical: 'https://hostamar.com/blog' },
  openGraph: {
    title: 'Blog — Hostamar Tips, Guides & Platform Updates',
    description:
      'AI video creation guides, hosting best practices, and platform news for Bangladeshi creators.',
    url: 'https://hostamar.com/blog',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Hostamar Tips, Guides & Platform Updates',
    description: 'AI video creation guides, hosting best practices, and platform news.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['hostamar blog', 'ai video tutorial', 'bangladesh tech blog', 'video creation tips', 'hostamar updates'],
}

export default function BlogPage() {
  return <BlogPageClient />
}
