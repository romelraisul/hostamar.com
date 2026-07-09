import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/dashboard',
          '/dashboard/',
          '/api/',
          '/login',
          '/signin',
          '/signup',
          '/reset-password',
          '/forgot-password',
          '/payment/success',
          '/payment/fail',
          '/payment/cancel',
          '/setup',
          '/monitor',
          '/hostamar-ceo',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
