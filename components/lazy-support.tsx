'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Support widgets are decorative — keep them (+ lucide-react) out of the
// eager hydration window that FCP/LCP wait behind. Mount on browser idle.
const SupportWidget = dynamic(() => import('@/components/SupportWidget'))
const SupportChatWidget = dynamic(() => import('@/components/support-chat-widget'))

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void) => number
  cancelIdleCallback?: (id: number) => void
}

export default function LazySupport() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const w = window as IdleWindow
    // ponytail: 2s timer fallback for Safari; Safari 19+ has requestIdleCallback
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(() => setReady(true))
      : window.setTimeout(() => setReady(true), 2000)
    return () => {
      if (w.cancelIdleCallback) w.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [])

  if (!ready) return null
  return (
    <>
      <SupportWidget />
      <SupportChatWidget />
    </>
  )
}
