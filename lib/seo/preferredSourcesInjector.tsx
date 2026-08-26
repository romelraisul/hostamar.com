/**
 * Preferred Sources auto-injection rules for Hostamar CMS.
 * WordPress-style filter: injects the badge on all blog single posts unless a
 * post opts out via `preferredSource: false`.
 * Server-side helper consumed by app/blog/[slug]/page.tsx.
 */
import PreferredSourceBadge from '@/components/seo/PreferredSourceBadge'
import { POSTS } from '@/lib/blog'

type PostLike = { slug: string; preferredSource?: boolean }

export function shouldInjectBadge(slug: string): boolean {
  const post = POSTS.find((p) => p.slug === slug) as PostLike | undefined
  if (!post) return false
  return post.preferredSource !== false
}

/**
 * Returns the rendered badge element for a blog post, or null when opted out.
 * Theme follows the site's zinc/dark palette; pass theme="dark" inside dark
 * sections if needed.
 */
export function injectPreferredSourceBadge(slug: string, theme: 'light' | 'dark' = 'light') {
  if (!shouldInjectBadge(slug)) return null
  return <PreferredSourceBadge variant="custom" theme={theme} lang="auto" />
}
