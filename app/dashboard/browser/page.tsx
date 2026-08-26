'use client'

/**
 * In-dashboard Browser tab — wraps the public /browser experience inside the
 * dashboard shell. Uses /api/browser/proxy (same-origin) so most sites render
 * in the iframe without X-Frame-Origin blocks, and /api/browser/summarize for
 * the AI summary panel.
 */
import { useState, useRef, useCallback } from 'react'
import { Globe, Loader2, ShieldCheck } from 'lucide-react'

export default function DashboardBrowserPage() {
  const [url, setUrl] = useState('')
  const [src, setSrc] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const proxied = (u: string) => `/api/browser/proxy?url=${encodeURIComponent(u)}`

  const go = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    let u = url.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    setUrl(u)
    setLoading(true)
    setSummary('')
    setSrc(proxied(u))
  }, [url])

  const summarize = async () => {
    if (!url) return
    setSummarizing(true)
    try {
      let text = ''
      try { text = (iframeRef.current?.contentDocument?.body?.innerText || '').slice(0, 12000) } catch {}
      const res = await fetch('/api/browser/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url }),
      })
      const data = await res.json()
      setSummary(data.summary || data.error || 'No summary available')
    } catch {
      setSummary('Summary failed — try again')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <form onSubmit={go} className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Globe className="h-4 w-4 text-[#0E7C3A]" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a website — e.g. wikipedia.org"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button type="submit" disabled={!url.trim() || loading}
          className="rounded-xl bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Browse
        </button>
        <button type="button" onClick={summarize} disabled={!src || summarizing}
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
          {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'AI Summary'}
        </button>
      </form>

      <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-xl border bg-white">
        {!src && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
            <ShieldCheck className="h-8 w-8 text-[#0E7C3A]" />
            Enter a URL above and click Browse. Sites load through Hostamar&apos;s
            same-origin proxy so almost everything renders right here.
          </div>
        )}
        {loading && src && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E7C3A]" />
          </div>
        )}
        {src && (
          <iframe
            ref={iframeRef}
            src={src}
            title="Hostamar Browser"
            onLoad={() => setLoading(false)}
            className="h-[75vh] w-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>

      {summary && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          <p className="mb-1 font-semibold text-[#0E7C3A]">AI Summary</p>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  )
}
