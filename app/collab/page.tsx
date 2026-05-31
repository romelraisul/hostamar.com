// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import CollabPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Collab — Real-Time Video Collaboration | Hostamar',
  description:
    'Collaborate on video projects in real time. Create collaboration sessions, share codes, and work together with your team on Hostamar.',
  alternates: { canonical: 'https://hostamar.com/collab' },
  openGraph: {
    title: 'Collab — Real-Time Video Collaboration | Hostamar',
    description:
      'Collaborate on video projects in real time. Create collab sessions, share codes, and work together with your team.',
    url: 'https://hostamar.com/collab',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Collab — Real-Time Video Collaboration | Hostamar',
    description: 'Collaborate on video projects in real time with your team on Hostamar.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  robots: { index: true, follow: true },
  keywords: ['video collaboration', 'team video editing', 'real-time collab bangladesh', 'hostamar collab'],
}

export default function CollabPage() {
  return <CollabPageClient />
}
