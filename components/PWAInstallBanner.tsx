'use client'

import { useState, useEffect } from 'react'

const GREEN = '#0E7C3A'

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: GREEN }}>
          📱
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Hostamar App</h3>
          <p className="text-sm text-zinc-500">Install for instant access</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={install}
          className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
          style={{ background: GREEN }}
        >
          Install
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
        >
          Later
        </button>
      </div>
    </div>
  )
}
