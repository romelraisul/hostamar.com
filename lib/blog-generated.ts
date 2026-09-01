/**
 * V21: server-only generated-blog lookup. BlogPost rows are created by the
 * seo-auto-post cron (auto-blog per new AI service). This module MUST stay
 * server-only (imports prisma → dns-bootstrap → node:dns) — lib/blog.ts is
 * client-bundled by app/blog/page.client.tsx and must never import prisma.
 */
import type { Post } from './blog'

export async function getGeneratedPost(slug: string): Promise<Post | undefined> {
  try {
    const prisma = (await import('./prisma')).default
    const b = await (prisma as any).blogPost.findUnique({ where: { slug } }).catch(() => null)
    if (!b) return undefined
    return {
      slug: b.slug,
      title: b.title,
      excerpt: String(b.excerpt || b.metaDescription || '').slice(0, 160),
      category: 'আপডেট',
      readTime: '৫ মিনিট',
      date: String(b.createdAt).slice(0, 10),
      views: 0,
      tags: (b.keywords as string[]) || [],
      icon: '🤖',
      author: 'Hostamar AI',
      badge: 'AI Generated',
      body: String(b.content || '').split('\n').slice(0, 200),
    }
  } catch { return undefined }
}

export async function listGeneratedPosts(): Promise<Post[]> {
  try {
    const prisma = (await import('./prisma')).default
    const rows = await (prisma as any).blogPost.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }).catch(() => [])
    return (rows || []).map((b: any) => ({
      slug: b.slug, title: b.title, excerpt: String(b.excerpt || '').slice(0, 160),
      category: 'আপডেট', readTime: '৫ মিনিট', date: String(b.createdAt).slice(0, 10),
      views: 0, tags: (b.keywords as string[]) || [], icon: '🤖', author: 'Hostamar AI',
      badge: 'AI Generated', body: [],
    }))
  } catch { return [] }
}
