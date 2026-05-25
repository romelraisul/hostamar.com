'use client'

import { useState } from 'react'
import { Loader2, Subtitles, Check, AlertCircle, RefreshCw } from 'lucide-react'

interface SubtitleResult {
  id: string
  videoId: string
  language: string
  content: string
  timestamps: Array<{ start: number; end: number; text: string }>
  createdAt: string
}

interface SubtitleGeneratorProps {
  videoId: string
  videoTitle?: string
  onGenerated?: (subtitle: SubtitleResult) => void
  existingSubtitles?: { language: string; id: string }[]
}

export default function SubtitleGenerator({
  videoId,
  videoTitle,
  onGenerated,
  existingSubtitles = [],
}: SubtitleGeneratorProps) {
  const [language, setLanguage] = useState<'bn' | 'en'>('bn')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubtitleResult | null>(null)

  const hasExisting = existingSubtitles.some((s) => s.language === language)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/subtitles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, language }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate subtitles')
        return
      }

      setResult(data.subtitle)
      if (onGenerated) onGenerated(data.subtitle)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Subtitles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Subtitle Generator</h3>
        </div>
        {videoTitle && (
          <p className="text-sm text-gray-500 mt-1 ml-7 line-clamp-1">{videoTitle}</p>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Language selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Language
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('bn')}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                language === 'bn'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                language === 'en'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : hasExisting ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate Subtitles
            </>
          ) : (
            <>
              <Subtitles className="w-4 h-4" />
              Generate Subtitles
            </>
          )}
        </button>

        {/* Status info */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Calling AI to generate subtitle transcript...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {result && !loading && (
          <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg p-3">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Subtitles generated!</p>
              <p className="text-green-500 text-xs mt-0.5">
                {result.timestamps?.length || 0} segments ·{' '}
                {language === 'bn' ? 'বাংলা' : 'English'}
              </p>
            </div>
          </div>
        )}

        {/* Has existing info */}
        {hasExisting && !result && !loading && (
          <p className="text-xs text-gray-400 text-center">
            Subtitles already exist in {language === 'bn' ? 'Bengali' : 'English'}{' '}
            — click Regenerate to create new ones
          </p>
        )}
      </div>
    </div>
  )
}
