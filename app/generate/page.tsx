'use client'

import { useState, useCallback, useEffect } from 'react'
import Script from 'next/script'
import { useLocale } from '@/lib/locale-context'
import GenerateHero from '@/components/generate/GenerateHero'
import TemplateSelector from '@/components/generate/TemplateSelector'
import VideoPreview from '@/components/generate/VideoPreview'
import PricingPlans from '@/components/generate/PricingPlans'

const promptTemplates = [
  { id: 'product', label: 'Product Demo', icon: '📦', prompt: 'Create a professional product demonstration video showcasing features, benefits, and use cases with smooth transitions and modern typography.', style: 'modern' },
  { id: 'social', label: 'Social Media Ad', icon: '📱', prompt: 'Generate an eye-catching social media advertisement video with dynamic text animations, vibrant colors, and engaging call-to-action elements.', style: 'cinematic' },
  { id: 'explainer', label: 'Explainer Video', icon: '🎯', prompt: 'Create an educational explainer video with clear narration, animated graphics, and step-by-step visual breakdown of complex concepts.', style: 'modern' },
  { id: 'testimonial', label: 'Testimonial', icon: '⭐', prompt: 'Design a customer testimonial video with photo placeholders, quote animations, and trust-building visual elements.', style: 'minimalist' },
  { id: 'promo', label: 'Promotional', icon: '🎬', prompt: 'Generate a promotional video with cinematic transitions, dramatic music cues, and compelling storytelling structure.', style: 'cinematic' },
  { id: 'tutorial', label: 'Tutorial', icon: '📚', prompt: 'Create a step-by-step tutorial video with screen recording placeholders, annotations, and clear instructional pacing.', style: 'vintage' },
]

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: '🎥' },
  { id: 'modern', label: 'Modern', icon: '✨' },
  { id: 'vintage', label: 'Vintage', icon: '📽️' },
  { id: 'minimalist', label: 'Minimalist', icon: '🎨' },
]

const pricingTiers = [
  { name: 'Free', price: '৳0', videos: 2, quality: '720p', watermark: true, icon: '🆓' },
  { name: 'Starter', price: '৳500/mo', videos: 20, quality: '1080p', watermark: false, icon: '🚀' },
  { name: 'Pro', price: '৳2,000/mo', videos: 'Unlimited', quality: '4K', watermark: false, icon: '⚡' },
  { name: 'Business', price: '৳5,000/mo', videos: 'Unlimited', quality: '4K', watermark: false, custom: true, icon: '🏢' },
]

export default function GeneratePage() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState('generate')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string>('modern')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const selectedPrompt = promptTemplates.find(p => p.id === selectedTemplate)?.prompt || ''

  // Poll video status endpoint
  useEffect(() => {
    if (!videoId || !isGenerating) return

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/video/status/${videoId}`)
        if (res.ok) {
          const data = await res.json()
          if (cancelled) return
          const p = data.progress || 0
          setProgress(p)
          if (data.videoUrl) {
            setGeneratedUrl(data.videoUrl)
            setIsGenerating(false)
            setProgress(100)
            setStatusText('')
          } else if (data.error) {
            setError(data.error)
            setIsGenerating(false)
            setStatusText('')
          } else {
            setStatusText(data.status || 'processing')
          }
        }
      } catch {
        // ignore transient poll errors
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [videoId, isGenerating])

  const handleGenerate = useCallback(async () => {
    const prompt = selectedTemplate ? selectedPrompt : ''
    if (!prompt && !selectedTemplate) {
      setError('Please select a template or enter a prompt.')
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setGeneratedUrl(null)
    setError(null)
    setStatusText('queued')
    setVideoId(null)
    setJobId(null)

    try {
      const res = await fetch('/api/ai/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          prompt,
          title: promptTemplates.find(p => p.id === selectedTemplate)?.label || 'AI Video',
          style: selectedStyle,
        }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start video generation')
      }

      const data = await res.json()
      if (data.videoId) setVideoId(data.videoId)
      if (data.jobId) setJobId(data.jobId)
      setStatusText('queued')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
      setIsGenerating(false)
      setStatusText('')
    }
  }, [selectedTemplate, selectedPrompt, selectedStyle])

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
                onSelect={(id) => setSelectedTemplate(id)}
              />

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('generate.yourPrompt')}</label>
                <textarea
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-800 dark:text-white min-h-[120px]"
                  placeholder={t('generate.promptPlaceholder')}
                  rows={4}
                  value={selectedPrompt}
                  onChange={(e) => {
                    // keep template selection but allow prompt override visual
                  }}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Video Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {stylePresets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStyle(s.id)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedStyle === s.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <span className="mr-1">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`mt-4 w-full py-4 px-8 rounded-xl font-bold text-lg transition-all ${
                  isGenerating || !selectedTemplate
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('generate.generating')}
                  </span>
                ) : t('generate.generateBtn')}
              </button>

              {(isGenerating || statusText) && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center">
                  Status: {statusText || 'starting...'}
                  {jobId && <span className="block text-xs text-gray-400 mt-1">Job ID: {jobId}</span>}
                </div>
              )}
            </div>

            {/* Right: Preview / Result */}
            <div>
              <VideoPreview
                isGenerating={isGenerating}
                generatedUrl={generatedUrl}
                progress={progress}
                statusText={statusText}
                error={error}
              />
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <PricingPlans
            tiers={pricingTiers}
            onSelectTier={(tier: string) => { setSelectedTier(tier); setShowPayment(true) }}
            showPayment={showPayment}
            selectedTier={selectedTier}
            onClosePayment={() => { setShowPayment(false); setSelectedTier(null) }}
          />
        )}
      </div>
    </div>
  )
}
