"use client"

import { useState, useCallback } from 'react'
import { track, Events } from '@/lib/analytics'
import { assignVariant } from '@/lib/feature-flags'

export default function OnboardingV2() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [dismissed, setDismissed] = useState(false)

  // Assign to experiment on mount
  const variant = typeof window !== 'undefined' ? assignVariant('onboarding_v2') : 'control'
  if (variant !== 'v2') return null

  const submitEmail = useCallback(async () => {
    if (!email.includes('@')) return
    setEmailStatus('saving')
    track('onboarding_v2_email_submitted')
    try {
      const res = await fetch('/api/onboarding/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'onboarding_v2' }),
      })
      if (res.ok) setEmailStatus('done')
      else setEmailStatus('error')
    } catch {
      setEmailStatus('error')
    }
  }, [email])

  const handleGenerate = useCallback(async () => {
    track('onboarding_v2_generate_clicked')
    try {
      const res = await fetch('/api/ai/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Create a welcome video for Hostamar',
          templateId: 'default',
          style: 'cinematic',
          duration: 3,
        }),
      })
      const data = await res.json()
      if (data.videoId) {
        track('onboarding_v2_completed')
        localStorage.setItem('onboarding_seen', 'true')
        setDismissed(true)
        window.location.href = `/generate?videoId=${data.videoId}`
      }
    } catch {
      track('onboarding_v2_generate_failed')
    }
  }, [])

  const skip = () => {
    track('onboarding_v2_skipped')
    localStorage.setItem('onboarding_seen', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full">
        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[0, 1].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h2 className="text-2xl font-bold mb-2">Create your first video</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try Hostamar now — generate your first AI video in seconds. No credit card needed.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { track('onboarding_v2_step_0'); setStep(1) }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Continue
              </button>
              <button onClick={skip} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">
                Skip
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-2">Ready to generate</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Click below to create your first AI video. It takes about 30 seconds.
            </p>
            {emailStatus === 'idle' && email && (
              <p className="text-xs text-gray-500 mb-4">
                We'll save your email so you can pick up where you left off.
                <button onClick={submitEmail} className="text-blue-600 ml-1 hover:underline">
                  Save now
                </button>
              </p>
            )}
            {emailStatus === 'saving' && <p className="text-xs text-blue-500 mb-4">Saving...</p>}
            {emailStatus === 'done' && <p className="text-xs text-green-500 mb-4">✅ Email saved</p>}
            {emailStatus === 'error' && <p className="text-xs text-red-500 mb-4">Could not save email. You can try again later.</p>}
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg transition"
              >
                🎬 Generate My First Video
              </button>
              <button onClick={skip} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
