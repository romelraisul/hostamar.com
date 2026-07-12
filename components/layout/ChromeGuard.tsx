'use client'

import { usePathname } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import AppFooter from '@/components/layout/AppFooter'

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

export default function ChromeGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const isAppShell = APP_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  if (isAppShell) {
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
