import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import type { ReactNode } from 'react'

// SECURITY FIX 2026-10-15: server-side auth for EVERY /dashboard/* page.
// Middleware is layer 1; this is layer 2 — runs per-request on the server and
// redirects to /login before any layout/credits markup ships to an anonymous
// visitor. Uses the existing shared helper (NextAuth session OR auth_token
// JWT cookie), same as every /api/dashboard route.
export default async function DashboardAuthGate({ children }: { children: ReactNode }) {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login?next=/dashboard')
  }
  return <>{children}</>
}
