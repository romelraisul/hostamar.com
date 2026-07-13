// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import AboutContent from './about-content'

export const metadata: Metadata = {
  title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
  description:
    'Hostamar এর গল্প: Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। ৫০০+ SME এর ভিডিও, হোস্টিং, চ্যাট এক জায়গায় — Silicon Valley এর জন্য নয়, বাংলাদেশের জন্য।',
  alternates: { canonical: 'https://hostamar.com/about' },
  openGraph: {
    title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
    description:
      'Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। বাংলা First • bKash First • Simple First — ৫০০+ SME এর অল-ইন-ওয়ান OS।',
    url: 'https://hostamar.com/about',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'About Hostamar' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
    description: 'Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড — বাংলাদেশের জন্য অল-ইন-ওয়ান OS।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['about hostamar', 'hostamar story', 'bangladesh startup', 'bogura', 'bdix hosting', 'bangla ai platform'],
}

export default function AboutPage() {
  return <AboutContent />
}
