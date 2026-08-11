'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/app/admin/layout'

export default function AdminDebugClient() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setSession(d))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/login'
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Session Debug</h3>
        <pre className="text-xs text-slate-300 overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
        <button
          onClick={handleLogout}
          className="mt-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Force Logout
        </button>
      </div>
    </div>
  )
}
