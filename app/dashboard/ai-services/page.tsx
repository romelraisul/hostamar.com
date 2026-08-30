'use client'
export const dynamic = 'force-dynamic'

/**
 * /dashboard/ai-services — DEDUPED catalog (~105 unique: existing 50 + 55 new
 * Fiverr jobs, semantic-dedup policy "existing card wins") + permanent
 * 📌 pinned-chat operation:
 *   Activate (creditCost cr) → Material Collection Modal (dynamic inputs)
 *   → pinned chat created → AI asks missing materials → generating
 *   → delivered → free unlimited revisions in the SAME thread forever.
 * Data: /api/ai-services/catalog (merged deduped), /api/ai-services/chats,
 *       /api/ai-services/chat/[chatId]/messages.
 */
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Search, Sparkles, Pin, X, Send, Download, Loader2, Coins, Upload } from 'lucide-react'
import { decodeIcon } from '@/lib/services'

type Field = { name: string; label: string; required?: boolean; type: string; options?: string[] }
type Svc = {
  id: string; name: string; nameBn: string; category: string; creditCost: number
  dollarRange?: string | null; benefit: string; benefitBn: string; perfectFor: string
  model?: string | null; icon: string; inputs: Field[]
}
type PinnedChat = { chatId: string; orderId: string; title: string; status: string; creditCost: number; createdAt: string; lastMessage: string }
type Msg = { id: string; role: string; content: string; creditCost?: number | null; createdAt?: string }

const GREEN = '#0E7C3A'
const CAT_COLORS: Record<string, string> = {
  'Graphics & Design': '#5c2d2d', 'Writing': '#0E7C3A', 'Video': '#7c2d12',
  'Digital Marketing': '#1e3a4a', 'Music & Audio': '#4a1e3a', 'Programming': '#1e2d4a',
  'Business': '#3a2d0e', 'AI Services': '#0E7C3A', 'Social Media': '#5c2d2d',
  'E-commerce': '#1e3a4a', 'Event': '#4a3a1e', 'Organization': '#2d4a1e',
  'Professional': '#1e2d4a', 'Content Creator': '#0E7C3A',
}

export default function AiServicesPage() {
  const [services, setServices] = useState<Svc[]>([])
  const [pinned, setPinned] = useState<PinnedChat[]>([])
  const [credits, setCredits] = useState<number>(6000)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  // modal + chat state
  const [modal, setModal] = useState<Svc | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [activating, setActivating] = useState(false)
  const [activeChat, setActiveChat] = useState<PinnedChat | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const loadCatalog = useCallback(() => {
    fetch('/api/ai-services/catalog', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadPinned = useCallback(() => {
    fetch('/api/ai-services/chats', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { chats: [] }))
      .then(d => setPinned(d.chats || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadCatalog()
    loadPinned()
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.creditsBalance != null) setCredits(d.creditsBalance) })
      .catch(() => {})
  }, [loadCatalog, loadPinned])

  const categories = useMemo(() => {
    const m = new Map<string, number>()
    services.forEach(s => m.set(s.category, (m.get(s.category) || 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [services])

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return services.filter(s =>
      (cat === 'all' || s.category === cat) &&
      (!needle || s.name.toLowerCase().includes(needle) || s.nameBn.includes(needle) ||
       s.benefit.toLowerCase().includes(needle) || s.benefitBn.includes(needle)))
  }, [services, q, cat])

  const openModal = (s: Svc) => { setModal(s); setForm({}); setErr('') }

  const activate = async () => {
    if (!modal) return
    // required-field validation
    for (const f of modal.inputs || []) {
      if (f.required && !String(form[f.name] || '').trim()) {
        setErr(`${f.label} দরকার (required)`); return
      }
    }
    setActivating(true); setErr('')
    try {
      const res = await fetch('/api/ai-services/activate', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: modal.id, inputs: form }),
      })
      const d = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 402) { setErr(`ক্রেডিট লাগবে ${d.needed || modal.creditCost}cr — bKash ${d.bkash} এ টপ-আপ করুন`); return }
      if (!d.success) { setErr(d.error || 'ব্যর্থ'); return }
      setCredits(d.creditsRemaining)
      setModal(null)
      loadPinned()
      // open the new pinned chat immediately
      const chats = await fetch('/api/ai-services/chats', { credentials: 'include' }).then(r => r.json()).catch(() => ({ chats: [] }))
      const mine = (chats.chats || []).find((c: PinnedChat) => c.orderId === d.orderId)
      if (mine) openChat(mine)
    } catch { setErr('নেটওয়ার্ক সমস্যা') } finally { setActivating(false) }
  }

  const openChat = async (c: PinnedChat) => {
    setActiveChat(c)
    const d = await fetch(`/api/ai-services/chat/${c.chatId}/messages`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ messages: [] }))
    setMessages(d.messages || [])
    setChatBusy(false)
  }

  const send = async () => {
    const text = chatInput.trim()
    if (!text || !activeChat || chatBusy) return
    setChatInput('')
    setMessages(m => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: text }])
    setChatBusy(true)
    try {
      const res = await fetch(`/api/ai-services/chat/${activeChat.chatId}/messages`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const d = await res.json()
      if (d.success) {
        const full = await fetch(`/api/ai-services/chat/${activeChat.chatId}/messages`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ messages: [] }))
        setMessages(full.messages || [])
        if (d.status) setActiveChat({ ...activeChat, status: d.status })
        if (typeof d.aiMessage === 'string') {
          // revision charged? refresh credits lazily
          fetch('/api/dashboard/stats', { credentials: 'include' }).then(r => r.json()).then(s => { if (s?.creditsBalance != null) setCredits(s.creditsBalance) }).catch(() => {})
        }
      } else {
        setMessages(m => [...m, { id: `err-${Date.now()}`, role: 'ai', content: d.error || 'ব্যর্থ' }])
      }
    } catch {
      setMessages(m => [...m, { id: `err-${Date.now()}`, role: 'ai', content: 'নেটওয়ার্ক সমস্যা' }])
    } finally { setChatBusy(false) }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatBusy])

  const pct = Math.min(100, Math.round((credits / 6000) * 100))

  return (
    <div className="flex h-full flex-col p-4 lg:flex-row gap-4">
      {/* ── LEFT: pinned chats + categories ── */}
      <aside className="w-full lg:w-64 shrink-0 space-y-4">
        <div className="rounded-2xl border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
            <Pin className="h-3.5 w-3.5" style={{ color: GREEN }} /> Pinned Chats
            <span className="ml-auto rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold" style={{ color: GREEN }}>
              {pinned.length} Active
            </span>
          </p>
          <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {pinned.length === 0 && <p className="px-1 text-[11px] text-zinc-400">কোনো pinned প্রজেক্ট নেই — একটা সার্ভিস Activate করুন 📌</p>}
            {pinned.map(c => (
              <button key={c.chatId} onClick={() => openChat(c)}
                className={`block w-full rounded-xl border p-2.5 text-left transition hover:border-[#0E7C3A] ${activeChat?.chatId === c.chatId ? 'border-[#0E7C3A] bg-[#ECFDF5]' : 'bg-white'}`}>
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'delivered' ? 'bg-zinc-400' : 'animate-pulse bg-emerald-500'}`} />
                  {c.title}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{c.status} • {c.creditCost}cr • {new Date(c.createdAt).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}</p>
                {c.lastMessage && <p className="mt-0.5 truncate text-[10px] text-zinc-400">{c.lastMessage}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-3">
          <p className="text-xs font-semibold text-zinc-700">Categories</p>
          <div className="mt-2 space-y-1">
            <button onClick={() => setCat('all')}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${cat === 'all' ? 'font-semibold text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
              style={cat === 'all' ? { background: GREEN } : {}}>
              All <span>{services.length}</span>
            </button>
            {categories.map(([c, n]) => (
              <button key={c} onClick={() => setCat(c)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${cat === c ? 'font-semibold text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                style={cat === c ? { background: GREEN } : {}}>
                <span className="truncate">{c}</span><span>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── CENTER: catalog grid ── */}
      <section className="min-w-0 flex-1">
        {/* header: credits meter */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" style={{ color: GREEN }} />
              <div>
                <p className="text-lg font-bold">{credits.toLocaleString('bn-BD')} <span className="text-xs font-normal text-zinc-500">/ 6000 cr</span></p>
                <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GREEN }} />
                </div>
              </div>
            </div>
            <button onClick={() => window.location.href='/dashboard/payment'} className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50">bKash রিনিউ 01822417463</button>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 font-semibold" style={{ color: GREEN }}>
                {services.length} Services (deduped)
              </span>
              <span className="rounded-full border px-2.5 py-1 text-zinc-600">Fiverr $20-50 vs You ~40cr = $0.40</span>
            </div>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="সার্চ করুন…"
                className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm focus:border-[#0E7C3A] focus:outline-none" />
            </div>
          </div>
        </div>

        {/* grid */}
        {loading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: GREEN }} /></div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s, i) => (
              <div key={s.id} className="flex w-full flex-col rounded-2xl border bg-white p-4" style={{ minWidth: 0 }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{decodeIcon(s.icon)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500">
                      <span className="rounded-full px-1.5 py-0.5 text-white" style={{ background: CAT_COLORS[s.category] || '#334155' }}>{s.category}</span>
                      <span className="text-zinc-400">#{String(i + 1).padStart(2, '0')}</span>
                    </p>
                    <h3 className="mt-1 truncate text-sm font-bold">{s.nameBn || s.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{s.benefitBn || s.benefit}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">Perfect: {s.perfectFor}{s.model ? ` • ${s.model}` : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[10px] leading-tight">
                    <p className="text-zinc-400 line-through">Fiverr {s.dollarRange || '$20-50'}</p>
                    <p className="font-bold" style={{ color: GREEN }}>FREE</p>
                  </div>
                  <button onClick={() => openModal(s)}
                    className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:bg-zinc-300"
                    style={{ background: credits < s.creditCost ? undefined : GREEN }}>
                    FREE • Activate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-[10px] text-zinc-400">
          Dedup policy: semantic overlap → existing card wins • {services.length} unique (no duplicates)
        </p>
      </section>

      {/* ── RIGHT: pinned chat view ── */}
      {activeChat && (
        <section className="fixed inset-0 z-40 flex flex-col bg-white lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:rounded-2xl lg:border">
          <div className="flex items-center justify-between border-b p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{activeChat.title}</p>
              <p className="text-[10px] text-zinc-500">
                Order #{activeChat.orderId.slice(0, 8)} •
                <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">{activeChat.status}</span>
                {' '}• {activeChat.creditCost}cr
              </p>
            </div>
            <button onClick={() => setActiveChat(null)} className="rounded-lg p-1.5 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
          </div>

          {activeChat.status === 'delivered' && (
            <a href="#download" onClick={e => { e.preventDefault(); window.open('/dashboard/videos', '_blank') }}
              className="mx-3 mt-2 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white" style={{ background: GREEN }}>
              <Download className="h-3.5 w-3.5" /> রেজাল্ট ডাউনলোড
            </a>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'ml-auto bg-[#0E7C3A] text-white' : 'bg-zinc-100 text-zinc-800'}`}>
                {m.content}
                {m.creditCost ? <p className="mt-1 text-[9px] opacity-70">-{m.creditCost}cr revision</p> : null}
              </div>
            ))}
            {chatBusy && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI লিখছে…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t p-2">
            <div className="flex items-end gap-2">
              <button title="B2 attachment (materials)" className="rounded-xl border p-2 hover:bg-zinc-50">
                <Upload className="h-4 w-4 text-zinc-500" />
              </button>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder={activeChat.status === 'delivered' ? 'রিভিশন চান (ফ্রি) — যেমন: make it more minimal green #0E7C3A…' : 'উত্তর দিন / ম্যাটেরিয়াল দিন…'}
                className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border px-3 py-2 text-xs focus:border-[#0E7C3A] focus:outline-none"
              />
              <button onClick={send} disabled={chatBusy || !chatInput.trim()}
                className="rounded-xl p-2.5 text-white disabled:bg-zinc-300" style={{ background: GREEN }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Material Collection Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">Activate {modal.nameBn || modal.name}</h3>
                <p className="text-xs text-zinc-500">{modal.creditCost}cr — ম্যাটেরিয়াল দিন, AI সাথে সাথে শুরু করবে</p>
              </div>
              <button onClick={() => setModal(null)} className="rounded-lg p-1 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 space-y-3">
              {(modal.inputs || []).map(f => (
                <div key={f.name}>
                  <label className="text-xs font-medium">
                    {f.label}{f.required ? <span className="text-red-500"> *</span> : null}
                  </label>
                  {f.type === 'select' ? (
                    <select value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      className="mt-1 w-full rounded-xl border p-2 text-sm">
                      <option value="">— বাছাই করুন —</option>
                      {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      rows={3} className="mt-1 w-full rounded-xl border p-2 text-sm" />
                  ) : (
                    <input value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      className="mt-1 w-full rounded-xl border p-2 text-sm" />
                  )}
                </div>
              ))}
              {(!modal.inputs || modal.inputs.length === 0) && (
                <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">এই সার্ভিসে বাড়তি ম্যাটেরিয়াল লাগবে না — সরাসরি শুরু হবে।</p>
              )}
            </div>

            {err && <p className="mt-3 rounded-xl bg-red-50 p-2 text-xs text-red-600">{err}</p>}

            <div className="mt-4 rounded-xl bg-[#ECFDF5] p-2.5 text-[11px]" style={{ color: GREEN }}>
              Cost: FREE • Unlimited free testing — no restriction
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-zinc-50">বাতিল</button>
              <button onClick={activate} disabled={activating}
                className="flex-[2] rounded-xl py-2.5 text-sm font-semibold text-white disabled:bg-zinc-300"
                style={{ background: credits < modal.creditCost ? undefined : GREEN }}>
                {activating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Continue to AI Chat →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
