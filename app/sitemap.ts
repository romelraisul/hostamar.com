import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

// Curated public, indexable marketing/product routes only.
// Deliberately EXCLUDES: /admin/*, /dashboard/*, /api/*, auth pages
// (login, signup, signin, reset-password, forgot-password), payment
// result pages, and dynamic user-specific routes.
const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/ai-video', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/cloud-hosting', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/ai-chat', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/ai-browser', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/dev-ide', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/game', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/hosting', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/ai-chat', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/ai-browser', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/generate', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/game', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/gallery', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/prompts', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
  { path: '/payment', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/subscription', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/beta', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/ossu', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/ossu/curriculum', changeFrequency: 'weekly', priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
