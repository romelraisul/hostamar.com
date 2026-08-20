import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'AI Dev IDE - ৳0 - Hostamar',
  description: 'AI Dev IDE — ৳0 থেকে শুরু। Replit $25 Core vs Hostamar ৳0, Cursor $20 vs bKash ৳1000/mo bundle। StackBlitz WebContainers live।',
  robots: 'index, follow',
  alternates: { canonical: 'https://hostamar.com/dev' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
