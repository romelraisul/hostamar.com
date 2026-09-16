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
  Plus,
  Search,
  Command,
  Sparkles,
  HardDrive,
  Clock,
  ChevronRight,
  Tv,
  Clapperboard,
} from 'lucide-react'
import { PRODUCT_NAV } from '@/lib/products'
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes'
import dynamic from 'next/dynamic'

const DashHelpCenter = dynamic(() => import('@/components/DashHelpCenter'), { ssr: false })

// ---------- helpers ----------
const PRODUCT_ICON: Record<string, typeof Video> = {
  'ai-video': Video,
  'cloud-hosting': Server,
  'ai-chat': MessageCircle,
  'ai-browser': Globe,
  'dev-ide': Code2,
  'game': Gamepad2,
}
interface DashStats {
  creditsRemaining?: number
  creditsBalance?: number
  totalVideos?: number
  stats?: {
    videos: { total: number; thisMonth: number }
    storage: { used: number; total: number }
    subscription: { plan: string; status: string; nextBilling: string } | null
  }
  recentVideos?: { id: string; title: string; status: string; createdAt: string }[]
}

// 6000 = canonical free credit pool granted at signup (Customer.credits).
function creditsToPool(balance: number | undefined, _plan: string | null | undefined): { shown: number; pct: number } {
  if (balance === undefined || balance === null) return { shown: 6000, pct: 100 }
  const shown = Math.max(0, Math.min(balance, 6000))
  const pct = Math.max(2, Math.min(100, Math.round((shown / 6000) * 100)))
  return { shown, pct }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // bust cache 5 - ওভারভিউ x2 inside component
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
  const creditsBalance = stats?.creditsBalance
  const { shown: shownCredits, pct: creditPct } = creditsToPool(creditsBalance, plan)
  const storageUsed = stats?.stats?.storage?.used ?? 0
  const storageTotal = stats?.stats?.storage?.total ?? 5
  const storagePct = Math.min(100, Math.round((storageUsed / Math.max(1, storageTotal)) * 100))

  const recentVideos = stats?.recentVideos?.slice(0, 3) ?? []

  const navProducts = PRODUCT_NAV.map((p) => ({
    ...p,
    href: DASHBOARD_ROUTES[p.slug] ?? `/dashboard/${p.slug}`,
    icon: PRODUCT_ICON[p.slug] ?? Video,
  }))

  const secondaryNav = [
    { href: '/dashboard/ai-services', icon: Sparkles, label: 'AI Store', labelBn: 'AI স্টোর', badge: '50+', description: '50+ AI সার্ভিস — Instagram, FB Ads, YouTube' },
    { href: '/dashboard/chat', icon: MessageCircle, label: 'AI Chat', labelBn: 'AI চ্যাট', badge: '120', description: '120 মডেল ফ্রি' },
    { href: '/dashboard/videos', icon: Video, label: 'Videos', labelBn: 'ভিডিও', badge: '37', description: 'আমার ভিডিও' },
    { href: '/dashboard/drive', icon: HardDrive, label: 'Drive', labelBn: 'ড্রাইভ', badge: '∞', description: 'Hostamar Drive — Telegram-backed আনলিমিটেড স্টোরেজ' },
    { href: '/dashboard/game', icon: Gamepad2, label: 'Game', labelBn: 'গেম', description: 'গেম হোস্টিং' },
    { href: '/dashboard/ide', icon: Code2, label: 'IDE', labelBn: 'IDE', description: 'ব্রাউজার IDE' },
    { href: '/dashboard/services', icon: Server, label: 'Services', labelBn: 'সার্ভিস', description: 'VPS/RDP' },
    { href: '/dashboard/services/new', icon: Plus, label: 'New Service', labelBn: 'নতুন সার্ভিস', description: 'অর্ডার করুন' },
    { href: '/dashboard/analytics', icon: BarChart3, label: t('nav.analytics') || 'Analytics' },
    { href: '/dashboard/reel', icon: Clapperboard, label: 'AI Reel Generator', labelBn: 'AI রিল জেনারেটর', badge: 'NEW', description: 'বাংলা রিল — ৪ স্লাইড + ভয়েসওভার' },
    { href: '/dashboard/tv', icon: Tv, label: 'My TV' },
    { href: '/dashboard/payment', icon: CreditCard, label: t('nav.payment') || 'Billing' },
    { href: '/dashboard/referral', icon: Gift, label: t('nav.referral') || 'Referral' },
    { href: '/dashboard/settings', icon: Settings, label: t('nav.settings') || 'Settings' },
  ]

  const allCommands = [
    { label: 'ওভারভিউ', href: '/dashboard', icon: LayoutDashboard, kbd: 'G D' },
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
            className="flex items-center gap-2 rounded-full border bg-[#FDF8EC] px-3 py-1.5 text-sm text-[#57534E] hover:border-[#0E7C3A]/30 hover:text-[#1C1917] transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search or jump…</span>
            <span className="ml-2 hidden sm:inline-flex items-center gap-1 rounded bg-[#FDF8EC] px-1.5 py-0.5 text-[11px] font-medium text-[#57534E]">
              <Command className="h-3 w-3" /> K
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Header credit meter */}
          <div className="hidden md:flex items-center gap-3 rounded-full border bg-[#FDF8EC] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0E7C3A] animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-[#1C1917]">CREDITS</span>
            <span className="text-sm font-bold text-[#1C1917]">
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
          <div className="hidden xl:flex items-center gap-2 rounded-full border bg-[#FDF8EC] px-3 py-1.5 text-xs text-[#57534E]">
            <HardDrive className="h-3.5 w-3.5" />
            <span>{storageUsed} / {storageTotal} GB</span>
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#E2E8F0]">
              <span className="block h-full bg-[#2563EB]" style={{ width: `${storagePct}%` }} />
            </span>
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-full border bg-[#FDF8EC] px-2 py-1 text-sm hover:bg-[#F8FAFC]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline max-w-[10rem] truncate font-medium text-[#1C1917]">{session?.user?.name || 'User'}</span>
          </Link>
        </div>
      </header>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-[#FDF8EC] px-4">
        <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[#FDF8EC]">
          <Menu className="h-6 w-6 text-[#1C1917]" />
        </button>
        <span className="font-bold text-xl tracking-tight text-[#0E7C3A]">Hostamar</span>
        <button
          onClick={() => setPaletteOpen(true)}
          className="rounded-lg border p-2 hover:bg-[#FDF8EC]"
          aria-label="Open command palette"
        >
          <Search className="h-5 w-5 text-[#57534E]" />
        </button>
      </div>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#0E7C3A]/40 bg-[#FFFDF6] transition-transform duration-200 lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo row (desktop sidebar top) */}
        <div className="hidden lg:flex items-center gap-2 border-b px-6 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C3A] text-white"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5l11 7-11 7V5z" fill="currentColor" /></svg></span>
          <div>
            <p className="font-bold leading-none text-[#1C1917]">Hostamar</p>
            <p className="text-[11px] text-[#57534E]">{t('dashboard.customerPortal') || 'Customer Portal'}</p>
          </div>
        </div>
        {/* Mobile logo + close */}
        <div className="flex lg:hidden items-center justify-between border-b px-6 py-4">
          <Link href="/dashboard" className="font-bold text-xl text-[#0E7C3A]">
            Hostamar
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded p-1 hover:bg-[#FDF8EC]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live credit meter */}
        <div className="px-4 py-4">
          <div className="rounded-xl border border-[#0E7C3A]/20 bg-[#0E7C3A]/15 px-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-[#0E7C3A]">CREDITS</span>
              <span className="rounded-full bg-[#FDF8EC] px-2 py-0.5 text-[11px] font-semibold text-[#0E7C3A] border">
                {plan ? plan.toUpperCase() : 'FREE'}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-extrabold tabular-nums text-[#1C1917]">
                {statsLoading ? '—' : shownCredits.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-[#57534E]">/ 6,000</span>
              <span className="ml-auto text-[11px] font-medium text-[#0E7C3A]">{creditPct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#D1FAE5]">
              <div className="h-full rounded-full bg-[#0E7C3A] transition-all" style={{ width: `${creditPct}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-tight text-[#57534E]">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 5</p>
            <div className="mt-2 flex items-center gap-2">
              <Link href="/dashboard/payment" className="inline-flex h-7 items-center rounded-full bg-[#0E7C3A] px-3 text-xs font-semibold text-white hover:bg-[#0c6a32]">
                bKash Renew →
              </Link>
              <span className="text-[11px] text-[#57534E]">{storageUsed} GB used</span>
            </div>
          </div>
        </div>

        {/* Nav — 6 products */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[#57534E]">PRODUCTS</p>
            <div className="space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard' ? 'bg-[#0E7C3A] text-white' : 'text-[#57534E] hover:bg-[#FDF8EC] hover:text-[#1C1917]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                ওভারভিউ
              </Link>
              {navProducts.map((p) => {
                const active = pathname === p.href || pathname.startsWith(p.href + '/')
                return (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-[#0E7C3A] text-white' : 'text-[#57534E] hover:bg-[#FDF8EC] hover:text-[#1C1917]'
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
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-[#57534E]">MANAGE</p>
            <div className="space-y-1">
              {secondaryNav.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#57534E] hover:bg-[#FDF8EC]'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && item.badge ? (
                      <span className="rounded-full bg-[#0E7C3A] px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent — live from /api/dashboard/stats */}
          <div className="rounded-xl border bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#57534E]" />
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
                    <Link href="/dashboard/videos" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[#FDF8EC]">
                      <span className="flex h-7 w-7 items-center justify-center rounded bg-[#FDF8EC] border">
                        <Video className="h-3.5 w-3.5 text-[#57534E]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#1C1917]">{v.title}</span>
                      <ChevronRight className="h-3 w-3 text-[#78716C] shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[#57534E]">No recent videos yet.</p>
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
              <p className="truncate text-sm font-medium text-[#1C1917]">{session?.user?.name || 'User'}</p>
              <p className="truncate text-xs text-[#57534E]">{session?.user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#57534E] hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            {t('dashboard.logout') || 'Logout'}
          </button>
        </div>
      </aside>

      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] px-4">
          <div className="absolute inset-0 bg-[#FBF4E4]/40 backdrop-blur-sm" onClick={() => setPaletteOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-[#FDF8EC] shadow-xl">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-5 w-5 text-[#57534E]" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Jump to… (Video, Hosting, Chat, Browser, IDE, Game, Billing)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#78716C]"
              />
              <span className="rounded bg-[#FDF8EC] px-1.5 py-0.5 text-xs text-[#57534E]">ESC</span>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {filteredCommands.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#57534E]">No results for “{paletteQuery}”</p>
              ) : (
                <ul className="space-y-1">
                  {filteredCommands.map((c) => (
                    <li key={c.href + c.label}>
                      <button
                        onClick={() => go(c.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#FDF8EC]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF8EC] text-[#57534E]">
                          <c.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-[#1C1917]">{c.label}</span>
                        {c.kbd && <span className="text-xs text-[#78716C]">{c.kbd}</span>}
                        <ChevronRight className="h-4 w-4 text-[#57534E]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between border-t bg-[#F8FAFC] px-4 py-2 text-xs text-[#57534E]">
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

      {/* Docked help center — visible on every dashboard page */}
      <DashHelpCenter />
    </div>
  )
}
// bust cache 3 - force new chunk hash for ওভারভিউ x2 c44357b webhook missed
// bust cache 4 - force new chunk hash ওভারভিউ x2 - Thu Aug 27 12:28:57 +06 2026
