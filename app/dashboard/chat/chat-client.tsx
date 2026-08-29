'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Sparkles, Coins, Search, X, Menu, PanelRightOpen, PanelRightClose, Trash2, Copy, Check, Bot, User, Zap, ChevronDown } from 'lucide-react'
import type { CatalogModel } from '@/components/ModelPicker'
import { PongBadge } from '@/components/ModelPicker'

type Msg = { role: 'user' | 'assistant'; content: string; model?: string; cost?: number; tokens?: { p: number; c: number }; provider?: string; fallbackFrom?: string; creditsRemaining?: number }

/**
 * /dashboard/chat — clean ChatGPT-style 3-panel layout.
 * LEFT: models sidebar (searchable, grouped by provider, collapsible drawer on mobile)
 * CENTER: chat history with room to breathe + fixed bottom input
 * RIGHT: settings (temperature, max tokens, credits) — optional, hidden on small screens
 * The model list no longer squeezes the chat — it lives in its own panel.
 */
export default function ChatClient() {
  // models
  const [models, setModels] = useState<CatalogModel[]>([])
  const [modelId, setModelId] = useState('meituan/longcat-2.0-free')
  const [modelQuery, setModelQuery] = useState('')
  const [modelsOpen, setModelsOpen] = useState(false) // mobile drawer

  // chat
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // settings
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [systemPrompt, setSystemPrompt] = useState('')

  // balance
  const [bal, setBal] = useState<{ credits: number; usd: number } | null>(null)

  // misc
  const [copied, setCopied] = useState<number | null>(null)

  useEffect(() => {
    // models catalog — own edge gateway first, local fallback
    fetch('https://ai.hostamar.com/v1/models')
      .then(r => r.json())
      .then(d => {
        const list: CatalogModel[] = (d.data || []).map((x: any) => ({ id: x.id, provider: x.owned_by || 'hostamar', context: x.context || '?', context_length: x.context_length || 0, free: !!x.free, displayName: x.display_name || x.id }))
        setModels(list)
      })
      .catch(() => fetch('/api/v1/models').then(r => r.json()).then(d => {
        const list: CatalogModel[] = (d.data || []).map((x: any) => ({ id: x.id, provider: x.owned_by || 'hostamar', context: x.context || '?', context_length: x.context_length || 0, free: !!x.free, displayName: x.display_name || x.id }))
        if (list.length) setModels(list)
      }).catch(() => {}))
    // credits
    fetch('/api/credits/balance').then(r => r.json()).then(d => {
      if (d?.balance) setBal({ credits: d.balance.credits, usd: d.balance.usd })
    }).catch(() => {})
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const grouped = (() => {
    const q = modelQuery.trim().toLowerCase()
    const filtered = models.filter(m => !q || m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q))
    const groups = new Map<string, CatalogModel[]>()
    filtered.forEach(m => {
      const prov = m.provider || 'hostamar'
      if (!groups.has(prov)) groups.set(prov, [])
      groups.get(prov)!.push(m)
    })
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  })()

  const sel = models.find(m => m.id === modelId)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return
    setError(null)
    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setBusy(true)
    try {
      const clean = modelId.replace(/\s*\[[^\]]*\]\s*$/, '').replace(/^opencode\//, '')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: clean, messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error?.message || data?.error || 'Chat failed')
      else {
        setMsgs(m => [...m, { role: 'assistant', content: data.reply, model: data.model, cost: data.costTaka, tokens: data.tokens, provider: data.provider, fallbackFrom: data.fallbackFrom, creditsRemaining: data.creditsRemaining }])
        if (typeof data.creditsRemaining === 'number') setBal(b => ({ credits: data.creditsRemaining, usd: (b?.usd ?? 0) && b ? data.creditsRemaining / (b.credits / (b.usd || 1)) : 0 }))
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setBusy(false)
    }
  }, [input, busy, msgs, modelId])

  const copy = (i: number, txt: string) => {
    navigator.clipboard?.writeText(txt).catch(() => {})
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[480px] -m-2 sm:-m-4 lg:-m-6 overflow-hidden rounded-none sm:rounded-2xl border bg-[#F8FAFC] relative">
      {/* ============ LEFT — models sidebar ============ */}
      <button onClick={() => setModelsOpen(v => !v)} className="lg:hidden absolute top-3 left-3 z-30 rounded-lg border bg-white p-2 shadow-sm" aria-label="Toggle models">
        <Menu className="w-4 h-4" />
      </button>
      <aside className={`${modelsOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white border-r flex flex-col transition-transform`}>
        <div className="px-3 py-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide text-[#0F172A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0E7C3A]" /> মডেল ({models.length})
            </span>
            <button onClick={() => setModelsOpen(false)} className="lg:hidden p-1 rounded hover:bg-[#F1F5F9]"><X className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={modelQuery} onChange={e => setModelQuery(e.target.value)} placeholder="longcat, kimi, qwen..." className="w-full rounded-lg border bg-[#F8FAFC] pl-8 pr-2 py-1.5 text-xs outline-none focus:border-[#0E7C3A]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {!models.length && <p className="px-2 py-6 text-center text-xs text-[#94A3B8]">মডেল লোড হচ্ছে...</p>}
          {grouped.map(([prov, list]) => (
            <div key={prov}>
              <p className="px-2 pb-1 text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">{prov} ({list.length})</p>
              <div className="space-y-0.5">
                {list.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setModelId(m.id); setModelsOpen(false) }}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition flex items-center justify-between gap-2 ${modelId === m.id ? 'bg-[#0E7C3A] text-white' : 'hover:bg-[#F1F5F9] text-[#0F172A]'}`}
                  >
                    <span className="truncate flex-1">{m.displayName}<PongBadge id={m.id} /></span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${m.free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} ${modelId === m.id ? '!bg-white/20 !text-white' : ''}`}>{m.free ? 'FREE' : 'PAID'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t px-3 py-2.5 text-[10px] text-[#94A3B8] leading-relaxed">
          Free tier — paid 402 blocked • source: ai.hostamar.com/v1
        </div>
      </aside>
      {modelsOpen && <div className="lg:hidden fixed inset-0 z-10 bg-black/30" onClick={() => setModelsOpen(false)} />}

      {/* ============ CENTER — chat ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* top bar */}
        <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-2 min-w-0 pl-8 lg:pl-0">
            <Bot className="w-4 h-4 text-[#0E7C3A] shrink-0" />
            <span className="text-sm font-bold text-[#0F172A] truncate">{sel?.displayName || modelId}</span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold text-[#0E7C3A]">{sel?.free ? 'FREE' : sel ? 'PAID' : ''} {sel?.context ? `• ${sel.context}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSettingsOpen(v => !v)} className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-[#475569] hover:bg-[#F8FAFC]">
              {settingsOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />} সেটিংস
            </button>
            <button onClick={() => { setMsgs([]); setError(null) }} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-[#475569] hover:bg-[#F8FAFC]">
              <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">নতুন চ্যাট</span>
            </button>
          </div>
        </div>

        {/* messages — the room */}
        <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 space-y-4">
          {msgs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-[#64748B] px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] grid place-items-center"><Sparkles className="w-6 h-6 text-[#0E7C3A]" /></div>
              <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>চ্যাট শুরু করুন</p>
              <p className="text-xs max-w-sm" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>বাম পাশে {models.length} মডেল — longcat, kimi, qwen সহ। বাংলায় লিখুন, উত্তর পাবেন।</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {['বাংলায় একটা মার্কেটিং ক্যাপশন লেখো', 'Eid sale এর জন্য ভিডিও আইডিয়া দাও', 'bKash পেমেন্ট কীভাবে কাজ করে?'].map(s => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-full border bg-white px-3 py-1.5 text-xs hover:border-[#0E7C3A] hover:text-[#0E7C3A]" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0E7C3A] to-[#065F46] grid place-items-center text-[9px] font-bold text-white shrink-0 mt-1">AI</span>
              )}
              <div className={`group relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#0E7C3A] text-white rounded-br-md' : 'bg-white border text-[#0F172A] shadow-sm rounded-bl-md'}`}>
                <p style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>{m.content}</p>
                <div className={`mt-1.5 flex items-center gap-2 text-[10px] ${m.role === 'user' ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                  {m.role === 'assistant' && m.model && <span className="truncate max-w-[240px]">{m.model?.split('/').pop()} • {m.provider || 'kilo-edge'}{m.fallbackFrom ? ` (fallback from ${m.fallbackFrom})` : ''}{m.cost != null ? ` • ${m.cost} Taka` : ''}</span>}
                  {m.role === 'assistant' && (
                    <button onClick={() => copy(i, m.content)} className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {copied === i ? <><Check className="w-3 h-3" /> copied</> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              {m.role === 'user' && (
                <span className="w-7 h-7 rounded-full bg-[#2563EB] grid place-items-center text-[9px] font-bold text-white shrink-0 mt-1"><User className="w-3.5 h-3.5" /></span>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex gap-2.5">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0E7C3A] to-[#065F46] grid place-items-center text-[9px] font-bold text-white shrink-0">AI</span>
              <div className="rounded-2xl bg-white border px-4 py-3 text-xs text-[#64748B] flex items-center gap-1 shadow-sm">
                <span className="animate-pulse">ভাবছি</span><span className="animate-pulse delay-75">.</span><span className="animate-pulse delay-150">.</span><span className="animate-pulse delay-300">.</span>
              </div>
            </div>
          )}
          {error && <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <div ref={endRef} />
        </div>

        {/* input — fixed bottom, room to type */}
        <div className="border-t bg-white px-4 py-3 lg:px-8">
          <div className="flex items-end gap-2 rounded-2xl border bg-[#F8FAFC] p-2 focus-within:border-[#0E7C3A]">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              placeholder="বাংলায় বা English-এ লিখুন — Enter পাঠান, Shift+Enter নতুন লাইন"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none max-h-40 min-h-[2.5rem]"
              style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-[#0E7C3A] p-2.5 text-white hover:bg-[#0c6a32] disabled:opacity-40 transition"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#94A3B8] flex items-center gap-1 justify-center" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
            <Zap className="w-3 h-3" /> 1 credit/msg • fallback chain no-card • {sel?.displayName || modelId}
          </p>
        </div>
      </div>

      {/* ============ RIGHT — settings (xl only, optional) ============ */}
      {settingsOpen && (
        <aside className="hidden xl:flex w-80 bg-white border-l flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F172A]">সেটিংস</span>
            <button onClick={() => setSettingsOpen(false)} className="p-1 rounded hover:bg-[#F1F5F9]"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-[#475569]">Temperature</span><span className="font-mono font-bold text-[#0F172A]">{temperature.toFixed(1)}</span></div>
              <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-[#0E7C3A]" />
              <div className="flex justify-between text-[10px] text-[#94A3B8] mt-0.5"><span>precise</span><span>creative</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-[#475569]">Max tokens</span><span className="font-mono font-bold text-[#0F172A]">{maxTokens}</span></div>
              <input type="range" min={256} max={4096} step={128} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} className="w-full accent-[#0E7C3A]" />
            </div>
            <div>
              <p className="text-xs text-[#475569] mb-1.5" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>System prompt</p>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4} placeholder="যেমন: তুমি একজন বাংলা মার্কেটিং এক্সপার্ট..." className="w-full rounded-lg border bg-[#F8FAFC] p-2 text-xs outline-none focus:border-[#0E7C3A] resize-none" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }} />
            </div>
            <div className="rounded-xl border bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]"><Coins className="w-3.5 h-3.5 text-[#F59E0B]" /> Credit</div>
              <p className="mt-1.5 text-lg font-black text-[#0F172A]">{bal ? bal.credits.toLocaleString() : '—'} <span className="text-xs font-normal text-[#64748B]">Taka</span></p>
              <p className="text-[11px] text-[#64748B]">{bal ? `≈ $${bal.usd.toFixed(2)}` : 'loading'} • Video 100 • Chat 1 • IDE 10</p>
            </div>
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">Settings apply to next message. Free models only — paid 402 blocked at gateway (no card needed).</p>
          </div>
        </aside>
      )}
    </div>
  )
}
