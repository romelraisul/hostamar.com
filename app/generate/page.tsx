'use client'

import { useState, useCallback } from 'react'
import Script from 'next/script'
import GenerateHero from '@/components/generate/GenerateHero'
import TemplateSelector from '@/components/generate/TemplateSelector'
import VideoPreview from '@/components/generate/VideoPreview'
import PricingPlans from '@/components/generate/PricingPlans'

// Prompts for AI video generation
const promptTemplates = [
  { id: 'product', label: 'Product Demo', icon: '📦', prompt: 'Create a professional product demonstration video showcasing features, benefits, and use cases with smooth transitions and modern typography.' },
  { id: 'social', label: 'Social Media Ad', icon: '📱', prompt: 'Generate an eye-catching social media advertisement video with dynamic text animations, vibrant colors, and engaging call-to-action elements.' },
  { id: 'explainer', label: 'Explainer Video', icon: '🎯', prompt: 'Create an educational explainer video with clear narration, animated graphics, and step-by-step visual breakdown of complex concepts.' },
  { id: 'testimonial', label: 'Testimonial', icon: '⭐', prompt: 'Design a customer testimonial video with photo placeholders, quote animations, and trust-building visual elements.' },
  { id: 'promo', label: 'Promotional', icon: '🎬', prompt: 'Generate a promotional video with cinematic transitions, dramatic music cues, and compelling storytelling structure.' },
  { id: 'tutorial', label: 'Tutorial', icon: '📚', prompt: 'Create a step-by-step tutorial video with screen recording placeholders, annotations, and clear instructional pacing.' },
]

const pricingTiers = [
  { name: 'Free', price: '৳0', videos: 2, quality: '720p', watermark: true, icon: '🆓' },
  { name: 'Starter', price: '৳500/mo', videos: 20, quality: '1080p', watermark: false, icon: '🚀' },
  { name: 'Pro', price: '৳2,000/mo', videos: 'Unlimited', quality: '4K', watermark: false, icon: '⚡' },
  { name: 'Business', price: '৳5,000/mo', videos: 'Unlimited', quality: '4K', watermark: false, custom: true, icon: '🏢' },
]

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState('generate')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) { alert('আপনাকে একটি টেমপ্লেট বেছে নিতে হবে!'); return }
    setIsGenerating(true)
    setProgress(0)
    setGeneratedUrl(null)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          setTimeout(() => { setProgress(100); setIsGenerating(false); setGeneratedUrl('/videos/vid_' + Date.now() + '.mp4') }, 1500)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 500)
  }, [selectedTemplate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <GenerateHero onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {activeTab === 'generate' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Template Selection */}
            <div>
              <TemplateSelector
                templates={promptTemplates}
                selectedTemplate={selectedTemplate}
                onSelect={setSelectedTemplate}
              />

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">আপনার প্রম্পট লিখুন</label>
                <textarea className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-800 dark:text-white min-h-[120px]"
                  placeholder="আপনার ব্যবসার বিষয়বস্তু লিখুন..." rows={4} />
              </div>

              <button onClick={handleGenerate} disabled={isGenerating}
                className={`mt-4 w-full py-4 px-8 rounded-xl font-bold text-lg transition-all ${
                  isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02]'
                }`}>
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI ভিডিও তৈরি হচ্ছে...
                  </span>
                ) : '🎬 AI দিয়ে ভিডিও তৈরি করুন'}
              </button>
            </div>

            {/* Right: Preview / Result */}
            <div>
              <VideoPreview
                isGenerating={isGenerating}
                generatedUrl={generatedUrl}
                progress={progress}
              />
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <PricingPlans
            tiers={pricingTiers}
            onSelectTier={(tier) => { setSelectedTier(tier); setShowPayment(true) }}
            showPayment={showPayment}
            selectedTier={selectedTier}
            onClosePayment={() => { setShowPayment(false); setSelectedTier(null) }}
          />
        )}
      </div>
    </div>
  )
}
