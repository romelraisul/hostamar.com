import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import type { ReactNode } from 'react'

// SECURITY FIX 2026-10-15 #2: /admin pages (e.g. /admin/videos) were serving
// customer emails and video rows to anonymous visitors. Middleware is layer 1;
// this is layer 2 — role check included: only role=admin passes.
export default async function AdminAuthGate({ children }: { children: ReactNode }) {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login?next=/admin')
  }
  if ((user.role || '').toLowerCase() !== 'admin') {
    redirect('/dashboard')
  }
  return <>{children}</>
}
