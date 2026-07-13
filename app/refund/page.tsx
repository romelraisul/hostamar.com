// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import RefundContent from './refund-content'

export const metadata: Metadata = {
  title: 'Refund Policy | Hostamar',
  description:
    'Hostamar refund policy in plain Bangla — 7-day free trial, 30-day money-back on first payment, bKash/Nagad refunds in 24h, gaming entry refundable before start. TrxID-based, no panic.',
  alternates: { canonical: 'https://hostamar.com/refund' },
  openGraph: {
    title: 'Refund Policy | Hostamar',
    description: 'আপনার টাকা নিরাপদ — ৭ দিন ফ্রি, ৩০ দিন মানি-ব্যাক, bKash ২৪ঘ ফেরত।',
    url: 'https://hostamar.com/refund',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'Refund Policy' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Refund Policy | Hostamar',
    description: 'আপনার টাকা নিরাপদ — ৭ দিন ফ্রি, ৩০ দিন মানি-ব্যাক, bKash ২৪ঘ ফেরত।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['hostamar refund', 'refund policy bangladesh', 'bkash refund', 'money back guarantee bangladesh', 'hostamar তাকা ফেরত'],
}

export default function RefundPage() {
  return <RefundContent />
}
