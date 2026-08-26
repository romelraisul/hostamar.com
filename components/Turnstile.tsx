'use client';

/**
 * Cloudflare Turnstile widget (invisible/managed).
 * Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; otherwise no-op so
 * local dev and the grace period before keys are configured keep working.
 *
 * Usage:
 *   const [token, setToken] = useState('')
 *   <Turnstile onToken={setToken} />
 * Then send `turnstileToken` with the signup/login request.
 */
import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  const renderWidget = useCallback(() => {
    if (!ref.current || !window.turnstile || widgetId.current !== null) return
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onToken(token),
      'expired-callback': () => onToken(''),
      theme: 'light',
    })
  }, [onToken])

  useEffect(() => {
    if (!SITE_KEY) return // not configured — render nothing
    if (window.turnstile) {
      renderWidget()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => renderWidget()
    document.head.appendChild(script)
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [renderWidget])

  if (!SITE_KEY) return null
  return <div ref={ref} className="my-2" data-testid="turnstile-widget" />
}
