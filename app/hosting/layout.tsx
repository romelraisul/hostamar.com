import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'BDIX হোস্টিং - bKash অটো পেমেন্ট | 5GB ফ্রি - Hostamar',
  description: 'BDIX Dhaka PoP • 20ms ping • 99.9% SLA • LiteSpeed + LSCache + JetBackup • bKash/Nagad/Rocket অটো পেমেন্ট। 5GB ফ্রি থেকে শুরু, ExonHost ৳834/mo vs Hostamar ৳0 bundle।',
  robots: 'index, follow',
  alternates: { canonical: 'https://hostamar.com/hosting' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
