'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/tv', label: 'TV & Streaming', icon: '📺' },
  { href: '/admin/content', label: 'Content & Automation', icon: '🎬' },
  { href: '/admin/credentials', label: 'Credentials', icon: '🔑' },
  { href: '/admin/communication', label: 'Communication', icon: '💬' },
  { href: '/admin/system', label: 'System', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen bg-[#FBF4E4]">
      <aside className="w-56 shrink-0 border-r border-[#D8CDB4] bg-[#FFFDF6] p-4">
        <Link href="/admin" className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C3A] text-sm font-bold text-white">H</span>
          <span className="text-lg font-bold text-[#1C1917]">Admin</span>
        </Link>
        <nav className="space-y-1">
          {sections.map(s => {
            const active = pathname === s.href || pathname.startsWith(s.href + '/')
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-[#0E7C3A] text-white' : 'text-[#1C1917] hover:bg-[#FBF4E4]'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
