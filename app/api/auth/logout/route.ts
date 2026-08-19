import { NextResponse } from 'next/server'

// POST /api/auth/logout
// Clears both the custom JWT cookie (auth_token) and the NextAuth session
// cookie so the dashboard logout button actually logs the user out client-side.
// The dashboard layout calls fetch('/api/auth/logout', { method: 'POST' })
// then router.push('/login').
export async function POST() {
  const res = NextResponse.json({ success: true })

  // Clear custom JWT cookie (the one middleware reads for dashboard/admin auth).
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  // Clear NextAuth session cookie too (harmless if session strategy uses it).
  res.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return res
}
