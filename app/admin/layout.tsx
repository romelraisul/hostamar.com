'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Server, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  BarChart3,
  ShoppingCart,
  Gift,
  User,
  Mail,
} from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/videos', icon: Video, label: 'Videos' },
  { href: '/admin/services', icon: Server, label: 'Services' },
  { href: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { href: '/admin/payments', icon: ShoppingCart, label: 'Payments' },
  { href: '/admin/orders', icon: Gift, label: 'Orders' },
  { href: '/admin/ecosystem', icon: BarChart3, label: 'Ecosystem' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [userLoading, setUserLoading] = useState(true)

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
      } catch (err) {
        console.error('Failed to fetch user:', err)
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
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-xl">Hostamar Admin</span>
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
      <aside className={`...`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-slate-700">
            <Link href="/admin" className="font-bold text-2xl text-blue-400">
              Hostamar
            </Link>
            <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
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
                  className={`...`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-slate-700 p-4">
            {userLoading ? (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse flex items-center justify-center" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse mt-1" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email || 'admin@hostamar.com'}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">ID: {user?.id || '—'}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-300 hover:text-red-400 w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}