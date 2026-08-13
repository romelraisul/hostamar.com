'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, Lock, ArrowUpRight, Loader2, RefreshCcw, X } from 'lucide-react'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export default function BrowserPage() {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [url, setUrl] = useState('https://example.com')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!cancelled) {
          setLoading(false)
          setAuthed(res.ok)
          if (res.ok) {
            const data = await res.json().catch(() => ({ user: null }))
            setUser(data?.user ?? null)
          }
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const append = (msg: Message) => setMessages((prev) => [...prev, msg])

  const runScreenshot = async () => {
    setError(null)
    setImageUrl(null)
    setBusy(true)
    append({ role: 'user', content: url })
    try {
      const res = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, userId: user?.email || 'guest', sessionKey: 'browser-ui' }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok) {
        const body = await res.text().catch(() => 'unknown error')
        let message = `Screenshot failed: ${res.status}`
        try {
          const parsed = JSON.parse(body)
          message = parsed.error || parsed.message || message
        } catch {
          message = body || message
        }
        throw new Error(message)
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      setImageUrl(objectUrl)
      append({ role: 'assistant', content: `Captured ${url}` })
    } catch (err: any) {
      const message = err?.message || 'unknown error'
      setError(message)
      append({ role: 'system', content: `Error: ${message}` })
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || busy) return
    setInput('')
    append({ role: 'user', content: trimmed })
    setBusy(true)
    try {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      const combinedPrompt = lastAssistant
        ? `${lastAssistant.content}\n\nFollow-up: ${trimmed}`
        : trimmed
      const res = await fetch('/api/ai/browser/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: combinedPrompt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Search failed: ${res.status}`)
      }
      const answer = data?.answer || data?.summary || JSON.stringify(data)
      append({ role: 'assistant', content: answer })
    } catch (err: any) {
      append({ role: 'system', content: `Error: ${err?.message || 'unknown error'}` })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-16">
        <div className="flex items-center gap-2 text-zinc-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading browser...
        </div>
      </section>
    )
  }

  if (!authed) {
    return (
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-16">
        <div className="rounded-[22px] border border-zinc-200 bg-white p-6 shadow-sm max-w-lg">
          <div className="flex items-center gap-2 text-zinc-900">
            <Lock className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Browser is private</h1>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
            Sign in to use the live browser. This protects shared browser resources and keeps your
            browsing private.
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href="/login"
              className="h-10 rounded-full bg-zinc-900 px-5 text-white text-[13px] font-semibold grid place-items-center hover:brightness-110 transition"
            >
              Login
            </a>
            <a
              href="/signup"
              className="h-10 rounded-full border border-zinc-200 px-5 text-[13px] font-semibold grid place-items-center hover:bg-zinc-50 transition"
            >
              Create account
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Browser</h1>
          <p className="text-[12px] text-zinc-500 mt-1">
            Logged in as <span className="font-medium">{user?.email || 'account'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Lock className="h-3.5 w-3.5" /> Auth required
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/70">
          <form
            className="mx-auto max-w-[1180px] px-4 md:px-6 py-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              runScreenshot()
            }}
          >
            <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-60"
              placeholder="https://example.com"
            />
            <button
              type="button"
              onClick={() => {
                setImageUrl(null)
                setError(null)
                setMessages([])
              }}
              className="h-8 w-8 grid place-items-center rounded-full border border-zinc-200 hover:bg-white transition"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={runScreenshot}
              disabled={busy}
              className="h-8 px-3 rounded-full bg-zinc-900 text-white text-[12px] font-semibold disabled:opacity-70 hover:brightness-110 transition inline-flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Capture
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="h-8 w-8 grid place-items-center rounded-full border border-zinc-200 hover:bg-white transition"
              aria-label="Open externally"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </form>
        </div>

        <div className="grid md:grid-cols-[1.1fr_0.9fr] divide-y md:divide-y-0 md:divide-x divide-zinc-100">
          <div className="min-h-[320px] bg-zinc-50 flex items-center justify-center p-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Screenshot"
                className="max-h-[420px] rounded-xl border border-zinc-200 shadow-sm"
              />
            ) : (
              <div className="text-center text-zinc-500 text-[13px]">
                No screenshot yet. Enter a URL and capture.
              </div>
            )}
          </div>

          <div className="flex min-h-[320px] md:min-h-[420px]">
            <div className="flex-1 flex flex-col">
              <div className="px-4 h-10 border-b border-zinc-100 flex items-center text-[12px] font-medium text-zinc-600">
                AI Assistant
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-zinc-900 text-white'
                        : m.role === 'assistant'
                          ? 'bg-white border border-zinc-200'
                          : 'bg-red-50 text-red-900 border border-red-200'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form
                className="p-3 border-t border-zinc-100"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
              >
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white h-10 px-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-60"
                    placeholder="Ask about this page..."
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="h-7 px-3 rounded-full bg-[#0E7C3A] text-white text-[11px] font-semibold disabled:opacity-60 hover:brightness-110 transition"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {error ? (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-900">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  )
}
