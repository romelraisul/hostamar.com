'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'

// AppHeader stays STATIC: it sits at the top of the document flow, and a
// next/dynamic boundary tears the SSR header out during hydration until the
// chunk lands — that flash scored CLS 0.103 on /pricing (LH 2026-10-20).
// Its chunk is small now (the i18n dictionary was split out to lib/i18n-dict).
// AppFooter is bottom-of-flow: the lazy-hydration flash there moves nothing
// measurable, so it stays dynamic and keeps its chunk off self-chromed routes.
const AppFooter = dynamic(() => import('@/components/layout/AppFooter'))

// Route groups would be the "textbook" Next 14 fix, but moving 83 pages into
// (marketing)/(app) groups is high-risk on a live site. ChromeGuard achieves
// the same outcome with zero file moves: app-shell routes render their own
// chrome only; everything else (marketing + product pages) gets the unified
// AppHeader/AppFooter. usePathname() makes this a client boundary — cheap.
const APP_SHELL_PREFIXES = [
  '/dashboard',
  '/admin',
  '/editor',
  '/studio',
  '/collab',
  '/ossu',
]

// Routes that render their OWN full chrome (BazaarNav + BazaarFooter, or the
// Docs shell). Without this exemption the root layout ALSO wrapped them in
// AppHeader/AppFooter, so each shipped TWO headers + TWO footers.
// IMPORTANT: these are EXACT matches only. Nested routes under them (e.g.
// /blog/[slug], /products/ai-video) do NOT self-chrome and must keep the app
// shell — so /blog and /products must never be treated as prefixes. Likewise
// "/" as a prefix would startsWith("/") and strip the shell site-wide.
// NOVA 2026-10-09.
const SELF_CHROMED_ROUTES = new Set([
  '/',
  '/about',
  '/blog',
  '/contact',
  '/faq',
  '/features',
  '/hosting',
  '/products',
  '/docs',
  '/docs/bn',
])

function norm(p: string) {
  if (!p) return '/'
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

export default function ChromeGuard({ children }: { children: React.ReactNode }) {
  const pathname = norm(usePathname() || '/')

  const isAppShell = APP_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  const isSelfChromed = SELF_CHROMED_ROUTES.has(pathname)

  if (isAppShell || isSelfChromed) {
    return <>{children}</>
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-[60vh]">{children}</main>
      <AppFooter />
    </>
  )
}
