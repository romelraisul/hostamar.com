'use client'

import { useEffect, useState } from 'react'
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
  Coins,
} from 'lucide-react'

type CreditSummary = {
  credits: number
  consumed: number
  videoCredits: number
  imageCredits: number
  chatCredits: number
  browserCredits: number
  ideCredits: number
  gameCredits: number
  hostingCredits: number
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()
    const { t } = useLocale()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [credits, setCredits] = useState<CreditSummary | null>(null)
    const [profile, setProfile] = useState<{ name?: string; email?: string } | null>(null)

    useEffect(() => {
      let cancelled = false
      const load = async () => {
        try {
          const res = await fetch('/api/credits/me', { credentials: 'include', cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json()
          if (!cancelled) setCredits(data)
        } catch (err) {
          // non-fatal: dashboard works without credit badge
        }
      }
      load()
      const interval = setInterval(load, 30_000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }, [])

    // Auth is cookie-based (auth_token), not NextAuth session. Fetch the real
    // profile so the sidebar shows the logged-in user's name/email.
    useEffect(() => {
      let cancelled = false
      const loadProfile = async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json()
          if (!cancelled && data?.user) setProfile(data.user)
        } catch {
          // non-fatal: falls back to session or placeholder
        }
      }
      loadProfile()
      return () => {
        cancelled = true
      }
    }, [])

  const navItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
      { href: '/dashboard/videos', icon: Video, label: t('nav.videos') },
      { href: '/dashboard/analytics', icon: BarChart3, label: t('nav.analytics') },
      { href: '/dashboard/services', icon: Server, label: t('nav.services') },
      { href: '/dashboard/payment', icon: CreditCard, label: t('nav.payment') },
      { href: '/dashboard/referral', icon: Gift, label: t('nav.referral') },
      { href: '/dashboard/settings', icon: Settings, label: t('nav.settings') },
    ]

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-xl text-blue-600">Hostamar</span>
        <div className="w-10" />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r z-50 
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b">
            <Link href="/dashboard" className="font-bold text-2xl text-blue-600">
              Hostamar
            </Link>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.customerPortal')}</p>
          </div>

          {/* Close button for mobile */}
          <button 
            className="lg:hidden absolute top-3 right-3 p-2"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-4 space-y-3">
            {credits && (
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">Credit Balance</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{credits.credits.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-gray-500">Used {credits.consumed.toLocaleString()} of {(credits.credits + credits.consumed).toLocaleString()}</div>
                <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] text-gray-500">
                  <span>🎬 {credits.videoCredits}</span>
                  <span>🖼️ {credits.imageCredits}</span>
                  <span>💬 {credits.chatCredits}</span>
                  <span>🌐 {credits.browserCredits}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{profile?.name || session?.user?.name || 'User'}</p>
                            <p className="text-xs text-gray-500 truncate">{profile?.email || session?.user?.email || 'user@email.com'}</p>
                          </div>
                        </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 w-full px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{t('dashboard.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}