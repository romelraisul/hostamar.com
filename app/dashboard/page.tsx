'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Video, Server, CreditCard, TrendingUp, Play, Clock, Sparkles,
  MessageCircle, Globe, Code2, Gamepad2, HardDrive, Coins, ArrowRight, Command, Search, Zap, Eye, X,
} from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import { PRODUCT_NAV } from '@/lib/products'
import NodeStatus from '@/components/dashboard/NodeStatus'

interface DashboardStats {
  videos: { total: number; thisMonth: number }
  services: { active: number; total: number }
  subscription: { plan: string; status: string; nextBilling: string; price?: number } | null
  storage: { used: number; total: number }
}
interface RecentVideo { id: string; title: string; status: string; createdAt: string }
interface ApiData { totalVideos?: number; creditsRemaining?: number; stats: DashboardStats; recentVideos: RecentVideo[] }

const PRODUCT_ICON: Record<string, typeof Video> = {
  'ai-video': Video, 'cloud-hosting': Server, 'ai-chat': MessageCircle,
  'ai-browser': Globe, 'dev-ide': Code2, game: Gamepad2,
}
const DASH_ROUTES: Record<string, string> = {
  'ai-video': '/dashboard/videos', 'cloud-hosting': '/dashboard/hosting',
  'ai-chat': '/chat', 'ai-browser': '/browser',
  'dev-ide': '/ide', game: '/game',
}
const COST_HINT: Record<string, string> = {
  'ai-video': '100cr', 'cloud-hosting': '0cr', 'ai-chat': '1cr/msg',
  'ai-browser': '5cr', 'dev-ide': '10cr/run', game: '20cr/play',
}
const BADGE: Record<string, string> = {
  'ai-video': '70%', 'cloud-hosting': '20%', 'ai-chat': 'Tools',
  'ai-browser': 'Tools', 'dev-ide': 'Tools · 93', game: 'Lab',
}

function CreditMeter({ credits, loading }: { credits: number; loading: boolean }) {
  const pct = Math.max(4, Math.min(100, Math.round((credits / 6000) * 100)))
  const used = 6000 - credits
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0E7C3A] to-[#065F46] p-5 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-white/10 rounded-2xl" style={{ background: 'radial-gradient(600px at 80% -20%, rgba(255,255,255,0.12), transparent)' }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.2em] text-white/70">CREDIT</span>
          <span className="flex items-center gap-1 text-xs bg-white/20 px-2.5 py-1 rounded-full"><Coins className="w-3 h-3" /> 6000 cap</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-black tabular-nums">{loading ? '—' : credits.toLocaleString()}</span>
          <span className="text-white/70 text-sm">/ 6,000</span>
          <span className="ml-auto text-xs bg-white text-[#0E7C3A] px-2.5 py-1 rounded-full font-bold">{pct}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <span className="bg-white/15 rounded-lg px-2 py-1.5 text-center">Used {used.toLocaleString()}</span>
          <span className="bg-white/15 rounded-lg px-2 py-1.5 text-center">Video 100</span>
          <span className="bg-white/15 rounded-lg px-2 py-1.5 text-center">IDE 10</span>
        </div>
        <div className="mt-2 flex gap-2 text-[11px] text-white/70 justify-center">Chat 1 • Browser 5 • Game 20 • Hosting 0</div>
        <Link href="/dashboard/payment" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white text-[#0E7C3A] text-sm font-bold py-2.5 hover:bg-[#ECFDF5] transition">
          <CreditCard className="w-4 h-4" /> bKash Renew →
        </Link>
      </div>
    </div>
  )
}

function RecentCard({ videos }: { videos: RecentVideo[] }) {
  const { t } = useLocale()
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-[#0F172A] flex items-center gap-2"><Clock className="w-4 h-4 text-[#64748B]" /> Recent Projects</h3>
        <Link href="/dashboard/videos" className="text-xs font-semibold text-[#2563EB] hover:underline">View all →</Link>
      </div>
      {videos.length ? (
        <div className="divide-y divide-[#F1F5F9]">
          {videos.slice(0, 3).map(v => (
            <div key={v.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-[#F1F5F9] border flex items-center justify-center shrink-0"><Video className="w-4 h-4 text-[#64748B]" /></span>
                <div className="min-w-0"><p className="text-sm font-medium text-[#0F172A] truncate">{v.title}</p><p className="text-xs text-[#64748B] flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(v.createdAt).toLocaleDateString()} • -100cr</p></div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#0E7C3A] border border-[#A7F3D0]">{v.status}</span>
            </div>
          ))}
          <div className="px-5 py-3 bg-[#F8FAFC] text-xs text-[#64748B]">Hosting deploy 0cr • Chat embed -5cr</div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <Video className="w-10 h-10 text-[#CBD5E1] mx-auto" />
          <p className="text-sm text-[#64748B] mt-2">{t('dashboard.noVideos') || 'No videos yet'}</p>
          <Link href="/dashboard/videos/new" className="text-sm font-medium text-[#0E7C3A] hover:underline">Create first →</Link>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useLocale()
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState<string>('ai-video')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/dashboard/stats')
        if (!r.ok) throw new Error(String(r.status))
        const j = (await r.json()) as ApiData
        if (alive) setData(j)
      } catch (e: any) { if (alive) setError(e.message) }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(v => !v) } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const stats = data?.stats ?? null
  const recentVideos = data?.recentVideos ?? []
  const creditsRemaining = data?.creditsRemaining
  const plan = stats?.subscription?.plan ?? 'Free'
  const shownCredits = (() => {
    if (creditsRemaining == null) return 6000
    const p = (plan || '').toLowerCase()
    if (creditsRemaining === -1 || creditsRemaining > 5000 || p === 'business' || p === 'enterprise') return 6000
    const quota: Record<string, number> = { free: 5, starter: 30 }
    const q = quota[p] ?? 10
    return Math.max(0, Math.round((creditsRemaining / q) * 6000))
  })()
  const used = 6000 - shownCredits
  const storageUsed = stats?.storage?.used ?? 0
  const storageTotal = stats?.storage?.total ?? 5
  const storagePct = Math.min(100, Math.round((storageUsed / Math.max(1, storageTotal)) * 100))
  const creditPct = Math.max(4, Math.min(100, Math.round((shownCredits / 6000) * 100)))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-[#E2E8F0] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6"><div className="h-64 rounded-2xl border bg-white animate-pulse" /></div>
          <div className="lg:col-span-4 space-y-4"><div className="h-48 rounded-2xl bg-[#0E7C3A]/20 animate-pulse" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Command palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[20vh] p-4" onClick={() => setCmdOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="w-4 h-4 text-zinc-400" />
              <input autoFocus placeholder="Search products, videos, settings..." className="flex-1 outline-none text-sm" />
              <button onClick={() => setCmdOpen(false)} className="p-1 hover:bg-zinc-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-2 text-sm">
              {PRODUCT_NAV.map(p => (
                <Link key={p.slug} href={`/dashboard/${p.slug === 'ai-video' ? 'videos' : p.slug === 'cloud-hosting' ? 'hosting' : p.slug === 'dev-ide' ? 'ide' : p.slug === 'game' ? 'game' : p.slug.slice(3)}`} onClick={() => setCmdOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#ECFDF5] text-[#0F172A]">
                  <span>{p.emoji}</span> {p.nameEn} <span className="ml-auto text-xs text-zinc-500">{COST_HINT[p.slug]}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#0E7C3A] text-white grid place-items-center font-black">H</span>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] leading-none">Dashboard • 6 products • 6000 credit</h1>
            <p className="text-xs text-[#64748B] mt-1">Hostamar • Video 100 • Hosting 0 • Chat 1 • Browser 5 • IDE 10 • Game 20</p>
          </div>
        </div>
        <button onClick={() => setCmdOpen(true)} className="hidden sm:flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs text-[#64748B] hover:border-[#0E7C3A]/30">
          <Command className="w-3.5 h-3.5" /> ⌘K
        </button>
      </div>

      {/* Mobile credit bar */}
      <div className="sm:hidden rounded-full bg-[#F1F5F9] p-1 flex items-center gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-[#0E7C3A] text-white font-bold">{shownCredits.toLocaleString()} / 6000</span>
        <span className="text-[#64748B]">{creditPct}% • {plan}</span>
        <Link href="/dashboard/payment" className="ml-auto px-3 py-1 rounded-full bg-white border text-[#0E7C3A] font-semibold">bKash</Link>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Live stats unavailable ({error}) — showing fallback.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main 8 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Credit + Usage row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-[11px] tracking-[0.2em] text-[#64748B]">CREDITS</div>
              <div className="text-2xl font-black text-[#0F172A] tabular-nums mt-1">{shownCredits.toLocaleString()} <span className="text-sm font-normal text-[#64748B]">/ 6,000</span></div>
              <div className="text-xs text-[#64748B] mt-1">{creditPct}% • {plan} • used {used.toLocaleString()}</div>
              <div className="h-2 rounded-full bg-[#F1F5F9] mt-3 overflow-hidden"><div className="h-full bg-[#0E7C3A] rounded-full" style={{ width: `${creditPct}%` }} /></div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-[11px] tracking-[0.2em] text-[#64748B]">STORAGE</div>
              <div className="text-2xl font-black text-[#0F172A] mt-1">{storageUsed} <span className="text-sm font-normal text-[#64748B]">/ {storageTotal} GB</span></div>
              <div className="text-xs text-[#64748B] mt-1">{storagePct}% used • Videos {stats?.videos.total ?? 0}</div>
              <div className="h-2 rounded-full bg-[#F1F5F9] mt-3 overflow-hidden"><div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${storagePct}%` }} /></div>
            </div>
          </div>

          {/* 6 Products grid */}
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0F172A] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#0E7C3A]" /> Your 6 Products</h2>
              <span className="text-xs text-[#64748B] hidden sm:inline">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Hosting 0</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRODUCT_NAV.map(p => {
                const Icon = PRODUCT_ICON[p.slug] ?? Video
                const href = DASH_ROUTES[p.slug] ?? '/dashboard'
                const isActive = activeProduct === p.slug
                return (
                  <button
                    key={p.slug}
                    onClick={() => setActiveProduct(p.slug)}
                    className={`text-left rounded-2xl border p-4 transition ${isActive ? 'bg-[#0E7C3A] text-white border-[#0E7C3A] shadow' : 'bg-white hover:border-[#0E7C3A]/30 hover:bg-[#ECFDF5]/40'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-9 h-9 rounded-xl grid place-items-center text-lg ${isActive ? 'bg-white/20' : 'bg-[#F8FAFC] border'}`}>{p.emoji}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isActive ? 'bg-white text-[#0E7C3A]' : p.slug === 'ai-video' ? 'bg-[#0E7C3A] text-white' : p.slug === 'cloud-hosting' ? 'bg-[#2563EB] text-white' : 'bg-zinc-900 text-white'}`}>{BADGE[p.slug]}</span>
                    </div>
                    <div className={`mt-2 font-semibold ${isActive ? 'text-white' : 'text-[#0F172A]'}`}>{p.nameEn}</div>
                    <div className={`text-xs ${isActive ? 'text-white/70' : 'text-[#64748B]'}`}>{p.taglineEn}</div>
                    <div className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#475569]'}`}>{COST_HINT[p.slug]} <ArrowRight className="w-3 h-3" /></div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Per-tab main */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            {activeProduct === 'ai-video' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">Video — AI মার্কেটিং ভিডিও</h3><span className="text-xs bg-[#0E7C3A] text-white px-2.5 py-1 rounded-full">100cr</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { t: 'Eid Collection', d: '9:16 24s', g: 'from-[#0E7C3A] to-[#065F46]' },
                    { t: 'Boishakh', d: 'Square 1:1', g: 'from-[#F59E0B] to-[#D97706]' },
                    { t: '11.11 Sale', d: '16:9 30s', g: 'from-[#2563EB] to-[#1D4ED8]' },
                  ].map(c => (
                    <div key={c.t} className={`rounded-xl p-4 text-white bg-gradient-to-br ${c.g}`}>
                      <div className="text-sm font-bold">{c.t}</div><div className="text-xs opacity-80">{c.d}</div>
                      <div className="mt-3 w-full h-20 rounded-lg bg-white/20 grid place-items-center"><Play className="w-6 h-6" /></div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border bg-[#F8FAFC] p-4">
                  <input placeholder="একটা প্রম্পট দিন — e.g. Eid sale 20% off pants" className="w-full px-4 py-3 rounded-xl border bg-white text-sm focus:outline-none focus:border-[#0E7C3A]" />
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#64748B]">Trust: bKash • Nagad • Rocket • BDIX 20ms • InVideo $17 vs ৳0 • Pictory $19 vs ৳0</div>
                </div>
                <Link href="/generate" className="flex items-center justify-center gap-2 rounded-full bg-[#0E7C3A] text-white font-bold py-3 hover:bg-[#0c6a32]"><Zap className="w-4 h-4" /> Generate -100cr →</Link>
                <p className="text-xs text-center text-[#64748B]">FAQ: 90s video • 9:16 ready • bKash auto • 6000 → 5900 after generate</p>
              </div>
            )}
            {activeProduct === 'cloud-hosting' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">Hosting — BDIX</h3><span className="text-xs bg-[#2563EB] text-white px-2.5 py-1 rounded-full">20% • 0cr</span></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border p-4 text-center"><HardDrive className="w-6 h-6 mx-auto text-[#0E7C3A]" /><div className="text-sm font-bold mt-1">5GB Free</div><div className="text-xs text-[#64748B]">NVMe</div></div>
                  <div className="rounded-xl border p-4 text-center"><Zap className="w-6 h-6 mx-auto text-[#F59E0B]" /><div className="text-sm font-bold mt-1">20ms</div><div className="text-xs text-[#64748B]">Dhaka PoP</div></div>
                  <div className="rounded-xl border p-4 text-center"><TrendingUp className="w-6 h-6 mx-auto text-[#2563EB]" /><div className="text-sm font-bold mt-1">99.9%</div><div className="text-xs text-[#64748B]">Uptime</div></div>
                </div>
                <div className="rounded-xl bg-[#F8FAFC] border p-4 text-sm">
                  <div className="font-semibold">ExonHost ~৳834/mo vs Hostamar ৳0 bundle</div>
                  <div className="text-[#64748B]">HostSeba ৳2220 No AI vs Hostamar ৳2000 AI সহ • LiteSpeed + JetBackup 7pts • bKash auto</div>
                </div>
                <Link href="/dashboard/hosting" className="flex items-center justify-center gap-2 rounded-full bg-[#2563EB] text-white font-bold py-3">Open Hosting →</Link>
              </div>
            )}
            {activeProduct === 'ai-chat' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">Chat — AI চ্যাট বাংলা</h3><span className="text-xs bg-zinc-900 text-white px-2.5 py-1 rounded-full">1cr/msg • 100/day</span></div>
                <div className="rounded-xl border bg-[#F8FAFC] p-4">
                  <div className="flex gap-2"><span className="w-8 h-8 rounded-full bg-[#0E7C3A] text-white grid place-items-center text-xs">AI</span><div className="rounded-2xl bg-white border px-4 py-3 text-sm shadow-sm max-w-[85%]">হ্যালো! আমি Hostamar AI — বাংলায় সাহায্য করি।</div></div>
                  <div className="mt-3 rounded-xl bg-white border p-3 text-xs text-[#64748B]">Tawk.to FREE fallback + Hostamar AI assist • Messenger till 11pm</div>
                </div>
                <div className="flex gap-2"><input placeholder="মেসেজ লিখুন..." className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:border-[#0E7C3A]" /><button className="px-5 py-3 rounded-xl bg-[#0E7C3A] text-white font-bold">Send</button></div>
                <Link href="/chat" className="flex items-center justify-center gap-2 rounded-full border font-semibold py-2.5">Open Chat →</Link>
              </div>
            )}
            {activeProduct === 'ai-browser' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">Browser — AI Browser</h3><span className="text-xs bg-zinc-900 text-white px-2.5 py-1 rounded-full">5cr/summary</span></div>
                <div className="flex gap-2"><input defaultValue="https://browser.hostamar.com" className="flex-1 px-4 py-2.5 rounded-xl border bg-[#F8FAFC] text-sm font-mono" /><button className="px-4 py-2.5 rounded-xl bg-[#0E7C3A] text-white text-sm font-bold">Go</button><button className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm">Summarize 5cr</button></div>
                <div className="rounded-xl border bg-[#F8FAFC] h-40 grid place-items-center text-sm text-[#64748B]"><Globe className="w-6 h-6 mb-1" /> browser.hostamar.com iframe (530 tunnel — start cloudflared)</div>
                <p className="text-xs text-[#64748B]">Like Opera Aria FREE — Page Context + Tabs</p>
              </div>
            )}
            {activeProduct === 'dev-ide' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">IDE — 93 models</h3><span className="text-xs bg-[#8B5CF6] text-white px-2.5 py-1 rounded-full">10cr/run</span></div>
                <select className="w-full px-3 py-2.5 rounded-xl border bg-white text-sm">
                  <option>rafan — RAG + 93 • ai.hostamar.com LIVE</option>
                  <option>sora2 • veo3.1 • kling3</option>
                  <option>gpt-4o • claude-3.5 • gemini-2.5</option>
                </select>
                <div className="rounded-xl bg-[#0F172A] text-white p-4 font-mono text-xs">
                  <div className="text-zinc-500">// Monaco dark — WebContainers</div>
                  <div>console.log(&quot;Hello Hostamar&quot;)</div>
                  <div className="mt-3 flex gap-2"><button className="px-3 py-1.5 rounded-lg bg-[#0E7C3A] text-white">Run -10cr ▶</button><span className="text-zinc-500">terminal: ready</span></div>
                </div>
                <Link href="/ide" className="flex items-center justify-center gap-2 rounded-full bg-[#0F172A] text-white font-bold py-3"><Code2 className="w-4 h-4" /> Open IDE →</Link>
              </div>
            )}
            {activeProduct === 'game' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-[#0F172A]">Game — Playground</h3><span className="text-xs bg-[#F59E0B] text-white px-2.5 py-1 rounded-full">20cr/play</span></div>
                <div className="rounded-xl border bg-[#0F172A] h-40 grid place-items-center">
                  <div className="text-center"><Gamepad2 className="w-8 h-8 text-white/60 mx-auto" /><div className="text-white text-sm mt-2">Canvas Phaser — Play 60fps</div><button className="mt-3 px-4 py-2 rounded-full bg-[#0E7C3A] text-white text-sm font-bold">Play -20cr ▶</button></div>
                </div>
                <div className="text-xs text-[#64748B] text-center">Credit meter: 6000 → Playground • tunnel DOWN — host needed</div>
              </div>
            )}
          </div>

          <NodeStatus />
          <RecentCard videos={recentVideos} />
        </div>

        {/* Right column 4 */}
        <div className="lg:col-span-4 space-y-6">
          <CreditMeter credits={shownCredits} loading={loading} />
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="font-semibold text-[#0F172A] flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0E7C3A]" /> Credit Usage</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#64748B]">Video</span><span className="font-mono font-bold">100cr</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">IDE</span><span className="font-mono">10cr</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Chat</span><span className="font-mono">1cr</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Browser</span><span className="font-mono">5cr</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Game</span><span className="font-mono">20cr</span></div>
              <div className="flex justify-between"><span className="text-[#64748B]">Hosting</span><span className="font-mono">0cr</span></div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[#F1F5F9] overflow-hidden"><div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${Math.min(100, Math.round((used / 6000) * 100))}%` }} /></div>
            <div className="text-xs text-center text-[#64748B] mt-2">Used {used.toLocaleString()} / 6000</div>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-[#0F172A]">Quick Actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/generate" className="rounded-xl border p-3 hover:border-[#0E7C3A] hover:bg-[#ECFDF5]/50"><Video className="w-5 h-5 text-[#0E7C3A]" /><div className="text-sm font-medium mt-1">Generate</div><div className="text-xs text-[#64748B]">Video 100cr</div></Link>
              <Link href="/pricing" className="rounded-xl border p-3 hover:border-[#F59E0B] hover:bg-[#FFFBEB]"><CreditCard className="w-5 h-5 text-[#F59E0B]" /><div className="text-sm font-medium mt-1">Upgrade</div><div className="text-xs text-[#64748B]">bKash</div></Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-4 z-10">
        <div className="mx-auto max-w-3xl rounded-full bg-[#0F172A] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-xl border border-white/10">
          <span className="text-sm"><span className="font-bold">{shownCredits.toLocaleString()} credit</span> • {COST_HINT[activeProduct] || '—'} per use</span>
          <Link href={DASH_ROUTES[activeProduct] ?? '/dashboard'} className="shrink-0 rounded-full bg-[#0E7C3A] px-5 py-2 text-sm font-bold hover:bg-[#0c6a32] flex items-center gap-2">
            Use now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
