'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Coins,
  Receipt,
  Cpu,
  Package,
  Server,
  LogOut,
  Menu,
  X,
  User,
  Tv,
  BarChart3,
  MessageSquare,
} from 'lucide-react'

const navItems = [
  { id: 'overview', href: '/admin?tab=overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'chat', href: '/admin/chat', icon: MessageSquare, label: 'Chat OS' },
  { id: 'users', href: '/admin?tab=users', icon: Users, label: 'Users' },
  { id: 'credits', href: '/admin?tab=credits', icon: Coins, label: 'Credits' },
  { id: 'transactions', href: '/admin?tab=transactions', icon: Receipt, label: 'Transactions' },
  { id: 'models', href: '/admin?tab=models', icon: Cpu, label: 'Models' },
  { id: 'products', href: '/admin?tab=products', icon: Package, label: 'Products' },
  { id: 'hosting', href: '/admin?tab=hosting', icon: Server, label: 'Hosting' },
  { id: 'tv', href: '/admin/tv', icon: Tv, label: 'TV Station' },
  { id: 'tv-analytics', href: '/admin/tv-analytics', icon: BarChart3, label: 'TV Analytics' },
  { id: 'nodes', href: '/admin/nodes', icon: Server, label: 'Nodes' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [live, setLive] = useState<'checking' | 'online' | 'offline'>('checking')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [clock, setClock] = useState('')

  // Global LIVE monitor: probe /api/health every 10s; 1s clock for "updated Xs ago".
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!cancelled) { setLive(res.ok ? 'online' : 'offline'); setLastCheck(new Date()) }
      } catch {
        if (!cancelled) { setLive('offline'); setLastCheck(new Date()) }
      }
    }
    check()
    const t1 = setInterval(() => { if (!document.hidden) check() }, 10000)
    const t2 = setInterval(() => {
      setClock(lastCheckRef.current ? `${Math.max(0, Math.round((Date.now() - lastCheckRef.current.getTime()) / 1000))}s ago` : '')
    }, 1000)
    return () => { cancelled = true; clearInterval(t1); clearInterval(t2) }
  }, [])
  const lastCheckRef = useRef<Date | null>(null)
  useEffect(() => { lastCheckRef.current = lastCheck }, [lastCheck])

  // Derive active tab from ?tab= query; defaults to overview.
  // Also supports legacy /admin/users style via pathname fallback.
  const tabParam = searchParams.get('tab')
  const pathTab = pathname?.startsWith('/admin/') ? pathname.split('/')[2] : null
  const activeTab = tabParam || pathTab || 'overview'

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser({
              id: data.user.id,
              name: data.user.name || 'Admin',
              email: data.user.email || 'admin@hostamar.com',
            })
          }
        }
      } catch {
        // ignore
      } finally {
        setUserLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (e) {
      console.error('Logout failed', e)
    }
  }

  return (
    <div className="min-h-screen bg-[#050A06] text-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#0E7C3A]/30 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[#0E7C3A]/20 border border-transparent hover:border-[#0E7C3A]/30">
          <Menu className="w-6 h-6 text-[#10B981]" />
        </button>
        <span className="font-bold text-lg tracking-widest text-white">
          HOSTAMAR <span className="text-[#10B981]">ADMIN</span>
        </span>
        <div className="w-10" />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - green/black hybrid */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-black border-r border-[#0E7C3A]/30 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-[#0E7C3A]/20">
            <Link href="/admin?tab=overview" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0E7C3A] to-[#10B981] flex items-center justify-center font-black text-white text-sm">
                H
              </div>
              <div>
                <div className="font-black tracking-widest text-white text-[15px] leading-none">HOSTAMAR</div>
                <div className="text-[10px] tracking-[0.2em] text-[#10B981] font-semibold -mt-0.5">ADMIN CONSOLE</div>
              </div>
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] tracking-widest text-zinc-500">GREEN / BLACK HYBRID</span>
            </div>
          </div>

          <button className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-[#0E7C3A]/10 border border-[#0E7C3A]/20" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-[#10B981]" />
          </button>

          {/* Navigation - 7 tabs */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <div className="text-[10px] tracking-[0.18em] text-zinc-600 px-3 mb-2 font-semibold">NAVIGATION</div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border ${
                    isActive
                      ? 'bg-[#0E7C3A] text-white border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.25)] font-semibold'
                      : 'text-zinc-400 border-transparent hover:bg-[#0E7C3A]/10 hover:text-white hover:border-[#0E7C3A]/20'
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-[#0E7C3A]/10">
              <div className="text-[10px] tracking-[0.18em] text-zinc-600 px-3 mb-2 font-semibold">SYSTEM</div>
              <div className="px-3 py-2 rounded-xl bg-[#0E7C3A]/10 border border-[#0E7C3A]/20">
                <div className="text-xs text-zinc-300">6 Products · BDIX</div>
                <div className="text-[11px] text-zinc-500">99.97% uptime · 18-22ms</div>
              </div>
            </div>
          </nav>

          {/* User */}
          <div className="border-t border-[#0E7C3A]/20 p-4 bg-gradient-to-t from-[#0E7C3A]/10 to-transparent">
            {userLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse" />
                  <div className="h-2 bg-zinc-800 rounded w-1/2 animate-pulse mt-2" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0E7C3A] to-[#10B981] flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-white">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email || 'admin@hostamar.com'}</p>
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5 font-mono">ID: {(user?.id || '—').slice(0, 12)}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white w-full px-3 py-2 rounded-xl hover:bg-[#0E7C3A]/10 border border-transparent hover:border-[#0E7C3A]/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[280px]">
        <div className="pt-[56px] lg:pt-0">
          {/* Global LIVE status bar */}
          <div className={`sticky top-0 lg:top-0 z-30 flex items-center justify-between px-4 py-2 border-b backdrop-blur ${live === 'offline' ? 'bg-red-950/80 border-red-500/40' : 'bg-black/80 border-[#0E7C3A]/20'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${live === 'online' ? 'bg-[#10B981] animate-pulse' : live === 'offline' ? 'bg-red-500' : 'bg-zinc-600 animate-pulse'}`} />
              <span className={`text-[11px] font-bold tracking-widest ${live === 'online' ? 'text-[#10B981]' : live === 'offline' ? 'text-red-400' : 'text-zinc-500'}`}>
                {live === 'online' ? 'LIVE' : live === 'offline' ? 'OFFLINE' : 'CHECKING'}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline">hostamar.com · auto-refresh on</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{clock ? `updated ${clock}` : '…'}</span>
          </div>
          <div className="min-h-screen bg-[#050A06]">{children}</div>
        </div>
      </div>
    </div>
  )
}
