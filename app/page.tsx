import { Metadata } from 'next'
import Navbar from '@/components/home/Navbar'
import HeroSection from '@/components/home/HeroSection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import DemoVideosSection from '@/components/home/DemoVideosSection'
import TemplatesSection from '@/components/home/TemplatesSection'
import ProductsSection from '@/components/home/ProductsSection'
import CompetitiveEdgeSection from '@/components/home/CompetitiveEdgeSection'
import PricingSection from '@/components/home/PricingSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import FAQSection from '@/components/home/FAQSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/home/Footer'

export const metadata: Metadata = {
  title: 'Hostamar — AI Marketing Video + Hosting for Bangladesh | Create Viral Videos in 30s',
  description:
    'Turn your product into a viral AI marketing video in 30 seconds. Bengali-first, 50+ festival templates, bKash/Nagad/Rocket payment, BDIX-fast hosting. Start free from ৳0.',
  alternates: { canonical: 'https://hostamar.com' },
  openGraph: {
    title: 'Hostamar — AI Marketing Video for Bangladeshi Business',
    description:
      'Create viral AI marketing videos in 30 seconds. Bengali-first, bKash payment, free tier. Plus hosting, AI chat, browser, games and cloud IDE.',
    url: 'https://hostamar.com',
    siteName: 'Hostamar',
    images: [
      {
        url: 'https://hostamar.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Hostamar — AI Marketing Video for Bangladesh',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hostamar — AI Marketing Video for Bangladesh',
    description:
      'Create viral AI marketing videos in 30 seconds. Bengali-first, bKash payment, free tier. Start now.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: [
    'ai marketing video bangladesh',
    'বাংলা ভিডিও মেকার',
    'eid offer video',
    'hosting bangladesh bkash',
    'hostamar',
    'bangla ai tools',
    'viral video maker bd',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <DemoVideosSection />
      <TemplatesSection />
      <ProductsSection />
      <CompetitiveEdgeSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
