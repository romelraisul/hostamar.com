import AdminShell from './AdminShell'

// Route-segment config MUST live in a server file: 'use client' layouts/pages
// have their config exports ignored, so force-dynamic here is what keeps the
// whole /admin segment out of static prerender (client pages with
// useSearchParams break the build otherwise).
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
