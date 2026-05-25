'use client'

import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react'

interface PreviewResult {
  id: string
  videoId: string
  title: string
  description: string
  thumbnailUrl: string | null
  duration: number
  createdAt: string
  prompt: string
}

interface PreviewGeneratorProps {
  videoId?: string
  videoTitle?: string
  onGenerated?: (preview: PreviewResult) => void
}

export default function PreviewGenerator({ videoId, videoTitle, onGenerated }: PreviewGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PreviewResult | null>(null)

  async function handleGenerate() {
    if (!prompt.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/previews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          prompt: prompt.trim(),
          title: videoTitle,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate preview')
        return
      }

      setResult(data.preview)
      if (onGenerated) onGenerated(data.preview)
    } catch (err) {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI Video Preview Generator</h3>
        </div>
        {videoTitle && <p className="text-xs text-gray-400 mt-1 ml-7">{videoTitle}</p>}
      </div>

      <div className="p-4 space-y-4">
        {/* Prompt input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Describe your preview idea
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`e.g., "A 10-second energetic promo showcasing our new AI video generator with Bengali text overlays and festive red-gold theme"`}
            rows={3}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AI Generating Preview...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate 10s Preview Concept
            </>
          )}
        </button>

        {/* Loading info */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calling AI to create your preview concept...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {result && !loading && (
          <div className="flex items-start gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Preview concept created!</p>
              <p className="text-green-300 text-xs mt-0.5">{result.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
