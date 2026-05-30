import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

type Route = {
  url: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

const staticRoutes: Route[] = [
  { url: '', lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: 1 },
  { url: '/login', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
  { url: '/signup', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.8 },
  { url: '/about', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.6 },
  { url: '/contact', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.5 },
  { url: '/pricing', lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: 0.7 },
  { url: '/terms', lastModified: new Date().toISOString(), changeFrequency: 'yearly', priority: 0.3 },
  { url: '/privacy', lastModified: new Date().toISOString(), changeFrequency: 'yearly', priority: 0.3 },
]

const serviceRoutes: Route[] = [
  { url: '/game/', lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: 0.8 },
  { url: '/browser/', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
  { url: '/ai-chat/', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
  { url: '/dev/', lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: 0.7 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.url}`,
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...serviceRoutes.map((route) => ({
      url: `${SITE_URL}${route.url}`,
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  ]

  return routes
}
