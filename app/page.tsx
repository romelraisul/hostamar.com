import { Metadata } from 'next'
import Navbar from '@/components/home/Navbar'
import HeroSection from '@/components/home/HeroSection'
import BentoFeaturesSection from '@/components/home/CompetitiveEdgeSection'
import TemplatesSection from '@/components/home/TemplatesSection'
import PricingSection from '@/components/home/PricingSection'
import FAQSection from '@/components/home/FAQSection'
import Footer from '@/components/home/Footer'

export const metadata: Metadata = {
  title: 'Hostamar - বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার',
  description:
    'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার। ৩০ সেকেন্ডে ভিডিও, ৫০+ বাংলা টেমপ্লেট, bKash দিয়ে পেমেন্ট — শুরু ৳0 থেকে।',
  alternates: { canonical: 'https://hostamar.com' },
  openGraph: {
    title: 'Hostamar - বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার',
    description:
      'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার। ৩০ সেকেন্ডে ভিডিও, ৫০+ বাংলা টেমপ্লেট, bKash দিয়ে পেমেন্ট।',
    url: 'https://hostamar.com',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'Hostamar' }],
    locale: 'bn_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hostamar - বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার',
    description: '৩০ সেকেন্ডে AI ভিডিও, ৫০+ বাংলা টেমপ্লেট, bKash পেমেন্ট। শুরু ৳0।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: [
    'ai marketing video bangladesh',
    'বাংলা ভিডিও মেকার',
    'eid offer video',
    'hostamar',
    'bangla ai tools',
    'viral video maker bd',
  ],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
}

// 2026 single-product redesign — 8 sections: Hero, Bento/Features, Templates, Pricing, FAQ, Footer.
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FCFCF9] text-[#18181B]">
      <Navbar />
      <HeroSection />
      <BentoFeaturesSection />
      <TemplatesSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  )
}
