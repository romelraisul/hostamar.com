'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/lib/locale-context'
import {
  LayoutDashboard,
  Video,
  Server,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  BarChart3,
  Gift,
  MessageCircle,
  Globe,
  Code2,
  Gamepad2,
  Search,
  Command,
  Sparkles,
  HardDrive,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { PRODUCT_NAV } from '@/lib/products'

// ---------- helpers ----------
const PRODUCT_ICON: Record<string, typeof Video> = {
  'ai-video': Video,
  'cloud-hosting': Server,
  'ai-chat': MessageCircle,
  'ai-browser': Globe,
  'dev-ide': Code2,
  'game': Gamepad2,
}
const DASH_ROUTES: Record<string, string> = {
  'ai-video': '/dashboard/videos',
  'cloud-hosting': '/dashboard/hosting',
  'ai-chat': '/chat',
  'ai-browser': '/browser',
  'dev-ide': '/ide',
  'game': '/game',
}

interface DashStats {
  creditsRemaining?: number
  totalVideos?: number
  stats?: {
    videos: { total: number; thisMonth: number }
    storage: { used: number; total: number }
    subscription: { plan: string; status: string; nextBilling: string } | null
  }
  recentVideos?: { id: string; title: string; status: string; createdAt: string }[]
}

// 6000 = canonical credit pool (Business). Free/Starter map proportionally so bar is meaningful on all plans.
function creditsToPool(remaining: number | undefined, plan: string | null | undefined): { shown: number; pct: number } {
  if (remaining === undefined || remaining === null) return { shown: 6000, pct: 100 }
  const p = (plan || '').toLowerCase()
  if (p === 'business' || p === 'enterprise' || remaining === -1 || remaining > 5000) return { shown: 6000, pct: 100 }
  // map quota → 6000. Free quota 5, Starter 10/30 -> scale remaining proportionally
  const quotaMap: Record<string, number> = { free: 5, starter: 30, business: 30, enterprise: 60 }
  const quota = quotaMap[p] ?? 10
  const shown = Math.max(0, Math.round((remaining / quota) * 6000))
  const pct = Math.max(2, Math.min(100, Math.round((shown / 6000) * 100)))
  if (p === 'free' && remaining <= 5) return { shown: Math.min(shown, 6000), pct }
  return { shown, pct }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [stats, setStats] = useState<DashStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch live credits/storage/usage for credit meter (spec: /api/dashboard/stats)
  useEffect(() => {
    let alive = true
    fetch('/api/dashboard/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return
        setStats(d)
      })
      .catch(() => {})
      .finally(() => alive && setStatsLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // Command Palette: Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const plan = stats?.stats?.subscription?.plan ?? null
  const creditsRemaining = stats?.creditsRemaining
  const { shown: shownCredits, pct: creditPct } = creditsToPool(creditsRemaining, plan)
  const storageUsed = stats?.stats?.storage?.used ?? 0
  const storageTotal = stats?.stats?.storage?.total ?? 5
  const storagePct = Math.min(100, Math.round((storageUsed / Math.max(1, storageTotal)) * 100))

  const recentVideos = stats?.recentVideos?.slice(0, 3) ?? []

  const navProducts = PRODUCT_NAV.map((p) => ({
    ...p,
    href: DASH_ROUTES[p.slug] ?? `/dashboard/${p.slug}`,
    icon: PRODUCT_ICON[p.slug] ?? Video,
  }))

  const secondaryNav = [
    { href: '/dashboard/analytics', icon: BarChart3, label: t('nav.analytics') || 'Analytics' },
    { href: '/dashboard/payment', icon: CreditCard, label: t('nav.payment') || 'Billing' },
    { href: '/dashboard/referral', icon: Gift, label: t('nav.referral') || 'Referral' },
    { href: '/dashboard/settings', icon: Settings, label: t('nav.settings') || 'Settings' },
  ]

  const allCommands = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, kbd: 'G D' },
    ...navProducts.map((p) => ({ label: p.nameEn, href: p.href, icon: p.icon, kbd: '' })),
    ...secondaryNav.map((s) => ({ label: s.label, href: s.href, icon: s.icon, kbd: '' })),
    { label: 'Create Video', href: '/dashboard/videos/new', icon: Video, kbd: 'C V' },
    { label: 'New Service', href: '/dashboard/services/new', icon: Server, kbd: 'N S' },
    { label: 'Billing / bKash Renew', href: '/dashboard/payment', icon: CreditCard, kbd: 'B' },
  ]
  const filteredCommands = paletteQuery
    ? allCommands.filter((c) => c.label.toLowerCase().includes(paletteQuery.toLowerCase()))
    : allCommands

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (e) {
      console.error('Logout failed', e)
    }
  }

  const go = useCallback(
    (href: string) => {
      setPaletteOpen(false)
      setPaletteQuery('')
      router.push(href)
    },
    [router]
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top header bar */}
      <header className="sticky top-0 z-30 hidden lg:flex h-14 items-center justify-between gap-4 border-b bg-white/80 backdrop-blur px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm text-[#64748B] hover:border-[#0E7C3A]/30 hover:text-[#0F172A] transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search or jump…</span>
            <span className="ml-2 hidden sm:inline-flex items-center gap-1 rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-medium text-[#475569]">
              <Command className="h-3 w-3" /> K
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Header credit meter */}
          <div className="hidden md:flex items-center gap-3 rounded-full border bg-white px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0E7C3A] animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-[#0F172A]">CREDITS</span>
            <span className="text-sm font-bold text-[#0F172A]">
              {statsLoading ? '—' : `${shownCredits.toLocaleString()} / 6,000`}
            </span>
            <span className="hidden sm:inline h-1.5 w-20 overflow-hidden rounded-full bg-[#E2E8F0]">
              <span className="block h-full rounded-full bg-[#0E7C3A] transition-all" style={{ width: `${creditPct}%` }} />
            </span>
            <Link
              href="/dashboard/payment"
              className="rounded-full bg-[#0E7C3A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0c6a32]"
            >
              bKash Renew →
            </Link>
          </div>
          {/* Storage pill */}
          <div className="hidden xl:flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs text-[#475569]">
            <HardDrive className="h-3.5 w-3.5" />
            <span>{storageUsed} / {storageTotal} GB</span>
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#E2E8F0]">
              <span className="block h-full bg-[#2563EB]" style={{ width: `${storagePct}%` }} />
            </span>
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-full border bg-white px-2 py-1 text-sm hover:bg-[#F8FAFC]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline max-w-[10rem] truncate font-medium text-[#0F172A]">{session?.user?.name || 'User'}</span>
          </Link>
        </div>
      </header>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4">
        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[#F1F5F9]">
          <Menu className="h-6 w-6 text-[#0F172A]" />
        </button>
        <span className="font-bold text-xl tracking-tight text-[#0E7C3A]">Hostamar</span>
        <button
          onClick={() => setPaletteOpen(true)}
          className="rounded-lg border p-2 hover:bg-[#F1F5F9]"
          aria-label="Open command palette"
        >
          <Search className="h-5 w-5 text-[#475569]" />
        </button>
      </div>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r bg-white transition-transform duration-200 lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo row (desktop sidebar top) */}
        <div className="hidden lg:flex items-center gap-2 border-b px-6 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C3A] text-white font-bold text-sm">H</span>
          <div>
            <p className="font-bold leading-none text-[#0E7C3A]">Hostamar</p>
            <p className="text-[11px] text-[#64748B]">{t('dashboard.customerPortal') || 'Customer Portal'}</p>
          </div>
        </div>
        {/* Mobile logo + close */}
        <div className="flex lg:hidden items-center justify-between border-b px-6 py-4">
          <Link href="/dashboard" className="font-bold text-xl text-[#0E7C3A]">
            Hostamar
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded p-1 hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live credit meter */}
        <div className="px-4 py-4">
          <div className="rounded-xl border border-[#0E7C3A]/20 bg-[#ECFDF5] px-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-[#0E7C3A]">CREDITS</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0E7C3A] border">
                {plan ? plan.toUpperCase() : 'FREE'}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums text-[#0F172A]">
                {statsLoading ? '—' : shownCredits.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-[#64748B]">/ 6,000</span>
              <span className="ml-auto text-[11px] font-medium text-[#0E7C3A]">{creditPct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#D1FAE5]">
              <div className="h-full rounded-full bg-[#0E7C3A] transition-all" style={{ width: `${creditPct}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-tight text-[#475569]">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 5</p>
            <div className="mt-2 flex items-center gap-2">
              <Link href="/dashboard/payment" className="inline-flex h-7 items-center rounded-full bg-[#0E7C3A] px-3 text-xs font-semibold text-white hover:bg-[#0c6a32]">
                bKash Renew →
              </Link>
              <span className="text-[11px] text-[#64748B]">{storageUsed} GB used</span>
            </div>
          </div>
        </div>

        {/* Nav — 6 products */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[#64748B]">PRODUCTS</p>
            <div className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard' ? 'bg-[#0E7C3A] text-white' : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Link>
              {navProducts.map((p) => {
                const active = pathname === p.href || pathname.startsWith(p.href + '/')
                return (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-[#0E7C3A] text-white' : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    <p.icon className="h-4 w-4" />
                    <span className="flex-1">{p.nameEn}</span>
                    <span className="text-xs opacity-60">{p.emoji}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[#64748B]">MANAGE</p>
            <div className="space-y-1">
              {secondaryNav.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent — live from /api/dashboard/stats */}
          <div className="rounded-xl border bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#64748B]" />
                Recent
              </p>
              <Link href="/dashboard/videos" className="text-[11px] font-medium text-[#2563EB] hover:underline">
                View all
              </Link>
            </div>
            {statsLoading ? (
              <div className="mt-2 space-y-2">
                <div className="h-8 rounded bg-[#E2E8F0] animate-pulse" />
                <div className="h-8 rounded bg-[#E2E8F0] animate-pulse" />
              </div>
            ) : recentVideos.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {recentVideos.map((v) => (
                  <li key={v.id}>
                    <Link href="/dashboard/videos" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white">
                      <span className="flex h-7 w-7 items-center justify-center rounded bg-white border">
                        <Video className="h-3.5 w-3.5 text-[#64748B]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#0F172A]">{v.title}</span>
                      <ChevronRight className="h-3 w-3 text-[#94A3B8] shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#64748B]">No recent videos yet.</p>
            )}
          </div>
        </nav>

        {/* User + logout */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0E7C3A] text-white">
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0F172A]">{session?.user?.name || 'User'}</p>
              <p className="truncate text-xs text-[#64748B]">{session?.user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#64748B] hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            {t('dashboard.logout') || 'Logout'}
          </button>
        </div>
      </aside>

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4">
          <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setPaletteOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-5 w-5 text-[#64748B]" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Jump to… (Video, Hosting, Chat, Browser, IDE, Game, Billing)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#94A3B8]"
              />
              <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-xs text-[#64748B]">ESC</span>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {filteredCommands.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#64748B]">No results for “{paletteQuery}”</p>
              ) : (
                <ul className="space-y-1">
                  {filteredCommands.map((c) => (
                    <li key={c.href + c.label}>
                      <button
                        onClick={() => go(c.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F1F5F9]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#475569]">
                          <c.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-[#0F172A]">{c.label}</span>
                        {c.kbd && <span className="text-xs text-[#94A3B8]">{c.kbd}</span>}
                        <ChevronRight className="h-4 w-4 text-[#CBD5E1]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between border-t bg-[#F8FAFC] px-4 py-2 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {shownCredits.toLocaleString()} credits • {storageUsed} GB used
              </span>
              <span>↑↓ Navigate • Enter Go • ⌘K Toggle</span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
