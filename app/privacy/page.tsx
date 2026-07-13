// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import PrivacyContent from './privacy-content'

export const metadata: Metadata = {
  title: 'Privacy Policy | Hostamar',
  description:
    'Hostamar Privacy Policy in plain Bangla — your videos are not sold, bKash PIN is never stored, private browser runs on-device, delete your data anytime. BDIX Dhaka hosting.',
  alternates: { canonical: 'https://hostamar.com/privacy' },
  openGraph: {
    title: 'Privacy Policy | Hostamar',
    description: 'আপনার ডাটা আপনারই — ভিডিও বিক্রি নয়, bKash পিন আমরা দেখি না, ডাটা ডিলিট যেকোনো সময়।',
    url: 'https://hostamar.com/privacy',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'Privacy Policy' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Hostamar',
    description: 'আপনার ডাটা আপনারই — ভিডিও বিক্রি নয়, bKash পিন আমরা দেখি না।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['hostamar privacy', 'privacy policy bangladesh', 'bkash privacy', 'data protection bangladesh', 'hostamar data'],
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
