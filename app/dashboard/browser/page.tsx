'use client'

/**
 * In-dashboard Browser tab — wraps the public /browser experience inside the
 * dashboard shell. Uses /api/browser/proxy (same-origin) so most sites render
 * in the iframe without X-Frame-Origin blocks, and /api/browser/summarize for
 * the AI summary panel.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Globe, Loader2, ShieldCheck, Plus, History } from 'lucide-react'

export default function DashboardBrowserPage() {
  const [url, setUrl] = useState('')
  const [src, setSrc] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [sessMsg, setSessMsg] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/browser/sessions', { credentials: 'include' })
      const d = await res.json()
      if (res.ok) setSessions(d.sessions || [])
    } catch {}
  }, [])
  useEffect(() => { loadSessions() }, [loadSessions])

  const createSession = async () => {
    setCreating(true); setSessMsg('')
    try {
      const res = await fetch('/api/browser/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'chrome' }),
      })
      const d = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 402) { setSessMsg(`ক্রেডিট লাগবে ${d.needed}cr — ব্যালেন্স ${d.balance}cr। bKash ${d.bkash}`); return }
      if (!d.success) { setSessMsg(d.error || 'সেশন তৈরি ব্যর্থ'); return }
      setSessMsg(`✅ সেশন চালু (${d.sessionId}) — ${d.creditsPerHour}cr/ঘণ্টা`)
      loadSessions()
    } catch { setSessMsg('নেটওয়ার্ক সমস্যা') } finally { setCreating(false) }
  }

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
        <button type="button" onClick={createSession} disabled={creating}
          className="flex items-center gap-1.5 rounded-xl bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c6a32] disabled:opacity-50">
          <Plus className="h-4 w-4" /> {creating ? 'তৈরি হচ্ছে...' : 'নতুন ব্রাউজার (5cr/ঘণ্টা)'}
        </button>
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

      {sessMsg && <div className="rounded-xl border border-[#0E7C3A] bg-[#ECFDF5] p-3 text-sm text-[#0E7C3A]">{sessMsg}</div>}

      {sessions.length > 0 && (
        <div className="rounded-xl border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><History className="h-3.5 w-3.5" /> আমার সেশন ({sessions.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sessions.map(s => (
              <span key={s.id} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                {s.inputs?.sessionId || s.id} • {s.status === 'processing' ? 'running' : s.status}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          <p className="mb-1 font-semibold text-[#0E7C3A]">AI Summary</p>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  )
}
