'use client'

/**
 * Docked Help Center for the dashboard. Visible by default on every
 * /dashboard page (right panel, collapsible). Wired to /api/support-chat and
 * context-aware of all sidebar tabs so it can answer "how do I…" questions
 * with concrete steps.
 */
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const QUICK = [
  'how can i generate video',
  'how to browse website',
  'how to add hosting',
  'how to use ide',
]

const GREETING: Msg = {
  role: 'assistant',
  content:
    'Hi! I\'m your Hostamar guide. Ask me anything about the dashboard — e.g. "how can i generate video" or pick a question below.',
}

export default function DashHelpCenter() {
  const [open, setOpen] = useState(true)
  // Remember when the user closes it for the session; still defaults open.
  useEffect(() => {
    try {
      if (localStorage.getItem('hostamar_help_closed') === '1') setOpen(false)
    } catch {}
  }, [])
  const toggle = (v: boolean) => {
    setOpen(v)
    try { localStorage.setItem('hostamar_help_closed', v ? '0' : '1') } catch {}
  }
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const next: Msg[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history: next.slice(-8).map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply || data.answer || data.message || 'Sorry — no answer right now.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection issue — try again in a moment.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-testid="dash-help-center" className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex h-[28rem] w-88 w-[22rem] flex-col overflow-hidden rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between bg-[#0E7C3A] px-4 py-2 text-white">
            <p className="text-sm font-semibold">Hostamar Help Center</p>
            <button onClick={() => toggle(false)} aria-label="Close help"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <span className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 ${m.role === 'user' ? 'bg-[#0E7C3A]/10' : 'bg-slate-100'}`}>
                  {m.content}
                </span>
              </div>
            ))}
            {busy && <p className="text-xs text-slate-400">Thinking…</p>}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1 border-t px-3 pt-2">
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)}
                className="rounded-full border px-2 py-0.5 text-xs hover:bg-slate-50">{q}</button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex items-center gap-2 p-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder='Ask "how do I…"' className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[#0E7C3A]" />
            <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-[#0E7C3A] p-2 text-white disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
      {!open && (
        <button onClick={() => toggle(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0E7C3A] text-white shadow-lg"
          aria-label="Open help center">
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
