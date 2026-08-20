import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'AI Browser Lab - Hostamar',
  description: 'AI Browser lab — পরীক্ষামূলক। Opera Aria/Brave Leo FREE — Hostamar lab।',
  robots: 'noindex, nofollow',
  alternates: { canonical: 'https://hostamar.com/browser' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
