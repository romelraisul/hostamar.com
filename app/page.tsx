import { Metadata } from 'next'
import Navbar from '@/components/home/Navbar'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import OllamaFeaturesSection from '@/components/home/OllamaFeaturesSection'
import DemoVideosSection from '@/components/home/DemoVideosSection'
import PricingSection from '@/components/home/PricingSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/home/Footer'

export const metadata: Metadata = {
  title: 'Cloud Hosting, AI Marketing Videos & Gaming Platform | Hostamar',
  description:
    'Hostamar: Bangladesh\'s all-in-one platform. Cloud VPS hosting, AI-powered marketing video generation, LuckyStar social casino gaming, AI browser, free DuckAI chat, and cloud dev IDE. Start free.',
  alternates: { canonical: 'https://hostamar.com' },
  openGraph: {
    title: 'Cloud Hosting, AI Marketing Videos & Gaming Platform | Hostamar',
    description:
      'Bangladesh\'s all-in-one platform: Cloud VPS hosting, AI marketing videos, LuckyStar gaming, AI browser, free AI chat, and cloud dev IDE.',
    url: 'https://hostamar.com',
    siteName: 'Hostamar',
    images: [
      {
        url: 'https://hostamar.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Hostamar — All-in-One Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cloud Hosting, AI Marketing Videos & Gaming Platform | Hostamar',
    description:
      'Bangladesh\'s all-in-one platform: Cloud VPS hosting, AI marketing videos, LuckyStar gaming, AI browser, free AI chat, and cloud dev IDE.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: [
    'cloud hosting bangladesh',
    'ai video generation',
    'vps hosting',
    'ai marketing video',
    'hostamar',
    'bangladesh hosting',
    'luckystar game',
    'ai browser',
    'free ai chat',
    'cloud ide',
  ],
}

export default function LandingPage() {
  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
        <Navbar />
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <OllamaFeaturesSection />
        <DemoVideosSection />
        <PricingSection />
        <CTASection />
        <Footer />
      </div>
    )
}
