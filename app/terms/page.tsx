// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import TermsContent from './terms-content'

export const metadata: Metadata = {
  title: 'Terms of Service | Hostamar',
  description:
    'Hostamar Terms of Service in plain language for Bangladeshi SME — 7-day free trial, 30-day money-back, bKash/Nagad/Rocket billing, content ownership, BD law. Bangla summaries included.',
  alternates: { canonical: 'https://hostamar.com/terms' },
  openGraph: {
    title: 'Terms of Service | Hostamar',
    description: 'পরিষ্কার ভাষায় টার্মস — ৭ দিন ফ্রি ট্রায়াল, ৩০ দিন মানি-ব্যাক, bKash পেমেন্ট, কন্টেন্ট আপনার।',
    url: 'https://hostamar.com/terms',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'Terms of Service' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | Hostamar',
    description: 'পরিষ্কার ভাষায় টার্মস — ৭ দিন ফ্রি ট্রায়াল, ৩০ দিন মানি-ব্যাক, bKash পেমেন্ট।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['hostamar terms', 'terms of service bangladesh', 'bkash terms', 'money back guarantee bangladesh', 'hostamar legal'],
}

export default function TermsPage() {
  return <TermsContent />
}
