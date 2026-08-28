'use client'

import { useState, useEffect } from 'react'
import StorageDashboard from '@/app/components/storage-dashboard'

function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=')
    if (key === 'auth_token' && value) {
      try {
        const payload = JSON.parse(atob(value.split('.')[1]))
        if (payload?.id) return payload.id
      } catch {
        // ignore decode errors
      }
    }
  }
  return null
}

export default function StoragePage() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const id = getUserIdFromCookie()
    setUserId(id ?? 'anonymous')
  }, [])

  if (!userId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 animate-pulse">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-8 text-gray-900">
        আমার স্টোরেজ / My Storage
      </h1>
      <StorageDashboard userId={userId} />
    </div>
  )
}
