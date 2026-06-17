// File: /app/page.tsx (Landing page - public)

import Navbar from '@/components/home/Navbar'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import PricingSection from '@/components/home/PricingSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/home/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  )
}
