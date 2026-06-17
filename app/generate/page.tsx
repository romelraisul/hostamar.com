'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VIDEO_TEMPLATES } from '@/lib/video-templates'

const CATEGORIES = [
  { id: 'all',          label: 'সব',              icon: '✨' },
  { id: 'facebook-shop', label: 'শপ বিজ্ঞাপন',     icon: '🛍️' },
  { id: 'education',     label: 'শিক্ষা',          icon: '📚' },
  { id: 'food',          label: 'রেসিপি ও ফুড',    icon: '🍳' },
  { id: 'business',      label: 'ব্যবসা ও মার্কেটিং', icon: '💼' },
  { id: 'religious',      label: 'ধর্মীয়',         icon: '🕌' },
  { id: 'entertainment', label: 'বিনোদন',          icon: '🎭' },
  { id: 'fitness',       label: 'ফিটনেস',         icon: '🏋️' },
  { id: 'travel',        label: 'ভ্রমণ',           icon: '✈️' },
  { id: 'wedding',       label: 'বিয়ে ও ইভেন্ট',   icon: '👰' },
]

export default function GeneratePage() {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [duration, setDuration] = useState(5)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const filtered = category === 'all'
    ? VIDEO_TEMPLATES
    : VIDEO_TEMPLATES.filter(t => t.category === category)

  const activeTemplate = VIDEO_TEMPLATES.find(t => t.id === selectedTemplate)

  const handleGenerate = useCallback(async () => {
    const prompt = customPrompt.trim() || activeTemplate?.prompt
    if (!prompt) {
      setError('আপনাকে একটি টেমপ্লেট বেছে নিতে হবে বা নিজের প্রম্পট লিখতে হবে!')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setGeneratedUrl(null)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(interval); return prev }
        return prev + Math.random() * 12
      })
    }, 800)

    try {
      const res = await fetch('/api/ai/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          title: activeTemplate?.label || 'Custom Video',
          templateId: selectedTemplate || 'custom',
          style: activeTemplate?.category || 'cinematic',
          duration,
          aspectRatio,
        }),
      })

      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) {
        setError(data.error || 'ভিডিও তৈরি ব্যর্থ হয়েছে')
        setProgress(0)
        return
      }

      setProgress(100)
      setGeneratedUrl(`/dashboard/videos?id=${data.videoId}`)
      router.push(`/dashboard/videos?id=${data.videoId}`)
    } catch (e: any) {
      clearInterval(interval)
      setError(e.message || 'সার্ভারে সমস্যা হয়েছে')
      setProgress(0)
    } finally {
      setIsGenerating(false)
    }
  }, [customPrompt, activeTemplate, selectedTemplate, duration, aspectRatio, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🎬 AI দিয়ে ভিডিও তৈরি করুন
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            বাংলায় ৫০+ প্রিমিয়াম টেমপ্লেট — ৯০ সেকেন্ডে আপনার ভিডিও পান
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Templates */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {category === 'all' ? 'সব টেমপ্লেট' : CATEGORIES.find(c => c.id === category)?.label} ({filtered.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl.id); setCustomPrompt('') }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTemplate === tpl.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{tpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{tpl.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tpl.labelBn}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                        {tpl.prompt.slice(0, 60)}...
                      </div>
                      {tpl.duration && (
                        <div className="text-xs text-gray-400 mt-1">⏱ {tpl.duration}s · {tpl.aspectRatio}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Generate Form */}
          <div className="space-y-5">
            {/* Selected Template */}
            {activeTemplate && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{activeTemplate.icon}</span>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">{activeTemplate.label}</span>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 italic">
                  "{activeTemplate.prompt.slice(0, 100)}..."
                </div>
                <div className="mt-2 text-xs text-blue-500 dark:text-blue-400">
                  ⏱ {activeTemplate.duration}s · {activeTemplate.aspectRatio}
                </div>
              </div>
            )}

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                আপনার প্রম্পট লিখুন
              </label>
              <textarea
                value={customPrompt}
                onChange={e => { setCustomPrompt(e.target.value); setSelectedTemplate(null) }}
                placeholder="অথবা নিজের প্রম্পট লিখুন... উদাহরণ: A dragon flying over Dhaka city"
                rows={4}
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           dark:bg-slate-800 dark:text-white text-sm resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ভিডিও দৈর্ঘ্য
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      duration === d
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {d}সে
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                অনুপাত
              </label>
              <div className="flex gap-2">
                {([['16:9', 'ওয়াইড'], ['9:16', 'রিলস'], ['1:1', 'স্কোয়ার']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setAspectRatio(val as '16:9' | '9:16' | '1:1')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      aspectRatio === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                ⚠️ {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI ভিডিও তৈরি হচ্ছে... {Math.round(progress)}%
                </>
              ) : (
                <>🎬 AI দিয়ে ভিডিও তৈরি করুন</>
              )}
            </button>

            {generatedUrl && !isGenerating && (
              <a
                href={generatedUrl}
                className="block text-center py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
              >
                ✅ ভিডিও দেখুন
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
