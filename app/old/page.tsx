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
  title: 'Hostamar (archive) — previous landing',
  description: 'Archived version of the Hostamar homepage prior to the 2026 single-product redesign.',
  robots: { index: false, follow: false },
}

// Archived pre-redesign landing page. Kept for reference; not linked from the new nav.
export default function OldLandingPage() {
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
