'use client'

import { useState, useEffect } from 'react'
import StorageDashboard from '@/app/components/storage-dashboard'

export default function StoragePage() {
  const [me, setMe] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => {
    // SECURITY: identity comes from the SERVER (/api/auth/me reads the
    // HttpOnly cookie) — no client-side JWT decode, no localStorage.
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMe(d?.user ?? d ?? null))
      .catch(() => setMe(null))
  }, [])

  if (!me) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        স্টোরেজ লোড হচ্ছে… লগ ইন না থাকলে <a className="text-[#0E7C3A] underline" href="/login">লগ ইন করুন</a>।
      </div>
    )
  }

  return <StorageDashboard userId={me.id} />
}
