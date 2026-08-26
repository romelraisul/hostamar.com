'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Sparkles, Coins } from 'lucide-react'

type Model = { id: string; name: string; per1k: number; cls: string }
type Msg = { role: 'user' | 'assistant'; content: string; model?: string; cost?: number; tokens?: { p: number; c: number } }

const PRESET: Model[] = [
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', per1k: 0.1, cls: 'cheap' },
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3 (1M ctx)', per1k: 0.5, cls: 'cheap' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', per1k: 0.5, cls: 'mid' },
  { id: 'minimax/minimax-m1', name: 'minimax M1 (1M)', per1k: 0.5, cls: 'cheap' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', per1k: 3, cls: 'mid' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', per1k: 3, cls: 'mid' },
  { id: 'openai/o1', name: 'o1 (reasoning)', per1k: 10, cls: 'premium' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', per1k: 10, cls: 'premium' },
]



export default function ChatPage() {
  const [bal, setBal] = useState<{ credits: number; usd: number } | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [model, setModel] = useState<Model>(PRESET[0])
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/credits/balance').then(r => r.json()).then(d => {
      if (d?.balance) {
        fetch('/api/binance-price').then(r => r.json()).then(p => {
          setRate(p.usdtBdt)
          setBal({ credits: d.balance.credits, usd: d.balance.credits / p.usdtBdt })
        })
      }
    })
  }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const estCost = (txt: string) => Math.max(1, Math.round((txt.length / 4) * model.per1k * 100) / 100)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || busy) return
    setError(null)
    const text = input.trim()
    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model.id, messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message || data?.error || 'Chat failed')
      } else {
        setMsgs(m => [...m, { role: 'assistant', content: data.reply, model: data.model, cost: data.costTaka, tokens: data.tokens }])
        if (typeof data.creditsRemaining === 'number' && rate) {
          setBal({ credits: data.creditsRemaining, usd: data.creditsRemaining / rate })
        }
      }
    } catch (e: any) { setError(e?.message || 'Network error') }
    finally { setBusy(false) }
  }
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0E7C3A]" />
          <span className="text-sm font-bold">Hostamar AI Chat</span>
          <span className="rounded-full bg-[#0E7C3A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0E7C3A]">
            $HOSTA ready
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-[#F59E0B]" />
          <span className="font-bold text-[#0F172A]">
            {bal ? `${bal.credits.toLocaleString()} Taka` : '—'}
          </span>
          {bal && rate && <span className="text-xs text-slate-500">≈ ${bal.usd.toFixed(2)} @ {rate} BDT</span>}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-500">Model</label>
        <select
          value={model.id}
          onChange={e => setModel(PRESET.find(m => m.id === e.target.value) || PRESET[0])}
          className="rounded-lg border bg-white px-2 py-1.5 text-sm font-semibold">
          {PRESET.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.per1k} Taka/1k
            </option>
          ))}
        </select>
        {model.cls === 'premium' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Premium: ~$0.08/1k
          </span>
        )}
        {input && (
          <span className="text-[11px] text-slate-500">
            ~{estCost(input)} Taka for this message
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border bg-white p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
            <p className="mb-1 font-semibold text-slate-700">Start chatting</p>
            <p>6000 Taka free on signup ≈ $47.21 USD (Binance P2P 127.1).</p>
            <p className="mt-1 text-xs">1 Credit = 1 Taka = future 1 $HOSTA.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              m.role === 'user' ? 'bg-[#0E7C3A] text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              <p>{m.content}</p>
              {m.role === 'assistant' && m.cost != null && (
                <p className="mt-1 text-[10px] opacity-60">
                  {m.model?.split('/').pop()} · {m.tokens?.p}+{m.tokens?.c} tokens · {m.cost} Taka
                </p>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-slate-400">Thinking…</p>}
        {error && <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any) } }}
          rows={2}
          placeholder="Ask anything — 1 Credit = 1 Taka = future 1 $HOSTA"
          className="flex-1 resize-none rounded-xl border bg-white p-3 text-sm outline-none focus:border-[#0E7C3A]" />
        <button type="submit" disabled={busy || !input.trim()}
          className="rounded-xl bg-[#0E7C3A] p-3 text-white disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
