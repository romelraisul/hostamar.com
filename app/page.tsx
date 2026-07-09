import { Metadata } from 'next'
import Navbar from '@/components/home/Navbar'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import OllamaFeaturesSection from '@/components/home/OllamaFeaturesSection'
import DemoVideosSection from '@/components/home/DemoVideosSection'
import ProductsSection from '@/components/home/ProductsSection'
import CompetitiveEdgeSection from '@/components/home/CompetitiveEdgeSection'
import PricingSection from '@/components/home/PricingSection'
import FAQSection from '@/components/home/FAQSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/home/Footer'

export const metadata: Metadata = {
  title: 'Hostamar — Cloud Hosting, AI Video, AI Chat, AI Browser, Gaming & Dev IDE | All-in-One Bangladesh Platform',
  description:
    'Hostamar: Bangladesh\'s all-in-one platform. 6 products, 1 account. Cloud VPS hosting, AI marketing videos, AI chat assistant, AI browser, browser games, cloud dev IDE. Bengali-first, bKash payments, free tier available.',
  alternates: { canonical: 'https://hostamar.com' },
  openGraph: {
    title: 'Hostamar — 6 Products, 1 Platform for Bangladesh',
    description:
      'Bangladesh\'s all-in-one platform: Cloud VPS hosting, AI marketing videos, AI chat, AI browser, gaming, cloud IDE. Bengali-first, free tier, bKash payments.',
    url: 'https://hostamar.com',
    siteName: 'Hostamar',
    images: [
      {
        url: 'https://hostamar.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Hostamar — All-in-One Bangladesh Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hostamar — Cloud Hosting, AI Video, AI Chat & More',
    description:
      'Bangladesh\'s all-in-one platform: Cloud VPS, AI video generation, AI marketing videos, AI chat, AI browser, games, cloud IDE. Start free.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: [
    'cloud hosting bangladesh',
    'ai video generation bangladesh',
    'vps hosting bangladesh',
    'ai marketing video',
    'hostamar',
    'bangladesh hosting',
    'ai chat bangladesh',
    'ai browser bangladesh',
    'browser games bangladesh',
    'cloud ide bangladesh',
    'bkash hosting',
    'bangla ai tools',
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
        <StatsSection />
        <FeaturesSection />
        <OllamaFeaturesSection />
        <DemoVideosSection />
        <ProductsSection />
                <CompetitiveEdgeSection />
                <PricingSection />
                <FAQSection />
                <CTASection />
                <Footer />
      </div>
    )
}