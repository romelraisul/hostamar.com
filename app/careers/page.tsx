// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import CareersContent from './careers-content'

export const metadata: Metadata = {
  title: 'Careers at Hostamar — বাংলাদেশের জন্য বানান | Hostamar',
  description:
    'Hostamar এ ক্যারিয়ার: Frontend, Backend/GPU, Bangla NLP, DevOps, Growth, Support — বাংলাদেশের জন্য global product বানান। ১০০% রিমোট, bKash salary, Bogura HQ।',
  alternates: { canonical: 'https://hostamar.com/careers' },
  openGraph: {
    title: 'Careers at Hostamar — বাংলাদেশের জন্য বানান | Hostamar',
    description: 'Next.js, ComfyUI, Bangla NLP — বাংলাদেশের জন্য global product। ১০০% রিমোট, bKash salary।',
    url: 'https://hostamar.com/careers',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'Careers at Hostamar' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers at Hostamar — বাংলাদেশের জন্য বানান | Hostamar',
    description: 'বাংলাদেশের জন্য global product বানান — ১০০% রিমোট, bKash salary।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['hostamar careers', 'next.js jobs bangladesh', 'remote jobs bangladesh', 'bogura jobs', 'bangla nlp engineer'],
}

export default function CareersPage() {
  return <CareersContent />
}
