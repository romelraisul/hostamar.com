// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import AnalyticsDashboard from './page.client'

export const metadata: Metadata = {
  title: 'Analytics Dashboard | Hostamar',
  description:
    'Detailed video analytics: view counts, downloads, shares, monthly revenue trends, engagement rates, and top-performing videos. Data-driven insights for your content.',
  alternates: { canonical: 'https://hostamar.com/analytics' },
  openGraph: {
    title: 'Analytics Dashboard | Hostamar',
    description:
      'Detailed video analytics: view counts, downloads, shares, monthly revenue trends, engagement rates, and top-performing videos.',
    url: 'https://hostamar.com/analytics',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Analytics Dashboard | Hostamar',
    description:
      'Detailed video analytics: view counts, downloads, shares, monthly revenue trends, and engagement rates.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  robots: { index: false, follow: false },
  keywords: ['video analytics dashboard', 'content performance', 'video metrics bangladesh', 'ai video analytics', 'hostamar'],
}

export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}
