import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const SITE_NAME = 'Hostamar'

type SeoOptions = {
  title: string
  description: string
  path?: string
  image?: string
  noindex?: boolean
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

export function generateSeoMetadata({
  title,
  description,
  path = '',
  image,
  noindex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
}: SeoOptions): Metadata {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
  const url = `${SITE_URL}${path}`
  const defaultImage = `${SITE_URL}/opengraph-image`
  const ogImage = image || defaultImage

  const metadata: Metadata = {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: type as 'website' | 'article',
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(tags && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }

  return metadata
}

export const defaultSeo: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Cloud Hosting, AI Marketing, Gaming, AI Browser & Dev IDE`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Your all-in-one platform: Cloud hosting, AI marketing videos, LuckyStar gaming, AI-powered browser, free AI chat, and cloud development environment',
  keywords: [
    'cloud hosting',
    'AI marketing videos',
    'gaming platform',
    'AI browser',
    'free AI chat',
    'cloud IDE',
    'VPS hosting',
    'video generation',
    'DuckAI chat',
    'LuckyStar game',
  ],
  authors: [{ name: 'Hostamar' }],
  creator: 'Hostamar',
  publisher: 'Hostamar',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Cloud Hosting, AI Marketing, Gaming, AI Browser & Dev IDE`,
    description:
      'Your all-in-one platform: Cloud hosting, AI marketing videos, LuckyStar gaming, AI-powered browser, free AI chat, and cloud development environment',
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Cloud Hosting, AI Marketing, Gaming, AI Browser & Dev IDE`,
    description:
      'Your all-in-one platform: Cloud hosting, AI marketing videos, LuckyStar gaming, AI-powered browser, free AI chat, and cloud development environment',
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
}
