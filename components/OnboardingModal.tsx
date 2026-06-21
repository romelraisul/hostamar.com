"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

type OnboardingStep = {
  title: string
  description: string
  action: string
  cta: string
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Hostamar!',
    description: 'Create professional AI videos in seconds. Start with a template or write your own prompt.',
    action: 'intro',
    cta: 'Get Started',
  },
  {
    title: 'Pick a template',
    description: 'Choose from 50+ templates across 10 categories — Facebook ads, education, food, travel, and more.',
    action: 'template',
    cta: 'Show Templates',
  },
  {
    title: 'Generate your first video',
    description: 'Select a template, customize your prompt, and hit generate. Your video will be ready in seconds.',
    action: 'generate',
    cta: 'Create Video',
  },
]

export default function OnboardingModal() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('onboarding_seen')
    if (!seen && session?.user) {
      setOpen(true)
    }
  }, [session])

  const track = useCallback((event: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible(event)
      }
    } catch {}
  }, [])

  const next = () => {
    if (step < STEPS.length - 1) {
      track(`onboarding_step_${step}`)
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  const finish = () => {
    track('onboarding_completed')
    localStorage.setItem('onboarding_seen', 'true')
    setOpen(false)
    setDismissed(true)
  }

  const skip = () => {
    track('onboarding_skipped')
    localStorage.setItem('onboarding_seen', 'true')
    setOpen(false)
    setDismissed(true)
  }

  if (!open || dismissed) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full">
        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{current.description}</p>

        <div className="space-y-3">
          <button
            onClick={next}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            {current.cta}
          </button>
          <button
            onClick={skip}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
