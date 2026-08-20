import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Playground - Hostamar',
  description: 'Playground — Hostamar lab: Slot/Roulette demo। Scenario $15 vs Hostamar playground।',
  robots: 'noindex, nofollow',
  alternates: { canonical: 'https://hostamar.com/game' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
