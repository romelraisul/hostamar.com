import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app/',
        '/api/',
        '/auth/',
        '/payment/',
        '/monitor/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
