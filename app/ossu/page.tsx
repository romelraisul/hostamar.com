// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import OSSUPageClient from './page.client'

export const metadata: Metadata = {
  title: 'OSSU Academy — Learn Computer Science in Bengali | Hostamar',
  description:
    'Free computer science education in Bengali. Follow the OSSU curriculum with Bangla translations. Learn programming, algorithms, data structures, and more in your native language.',
  alternates: { canonical: 'https://hostamar.com/ossu' },
  openGraph: {
    title: 'OSSU Academy — Learn Computer Science in Bengali | Hostamar',
    description:
      'Free computer science education in Bengali following the OSSU curriculum. Learn programming and CS in Bangla.',
    url: 'https://hostamar.com/ossu',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OSSU Academy — Learn Computer Science in Bengali | Hostamar',
    description: 'Free CS education in Bengali. OSSU curriculum in Bangla.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['ossu bangla', 'computer science bangladesh', 'cs education bengali', 'free programming course bangla', 'ossu curriculum bengali'],
}

export default function OSSUPage() {
  return <OSSUPageClient />
}
