import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'AI চ্যাট উইজেট - ৳0 100msg/day - Messenger till 11pm',
  description: 'বাংলা AI চ্যাট — ৳0 তে 100msg/day, Tawk.to FREE vs Hostamar FREE। Messenger till 11pm, বাংলা ভয়েস ইনপুট।',
  robots: 'index, follow',
  alternates: { canonical: 'https://hostamar.com/chat' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
