'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, KeyRound, X } from 'lucide-react'

interface ReAuthModalProps {
  action: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ReAuthModal({ action, onConfirm, onCancel }: ReAuthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/re-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Re-authentication failed')
      }

      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Re-authentication Required</h2>
              <p className="text-sm text-gray-500">Confirm your identity to {action}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            This action is sensitive and requires you to re-enter your password.
            Your session will be verified for the next 10 minutes after this.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!password || loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Verifying...' : 'Confirm Action'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// API Route: /api/auth/re-auth
// Create this file at: app/api/auth/re-auth/route.ts
// ============================================================
//
// import { NextRequest, NextResponse } from 'next/server'
// import bcrypt from 'bcryptjs'
// import { prisma } from '@/lib/prisma'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth-config'
//
// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
//     }
//
//     const { password } = await request.json()
//     if (!password) {
//       return NextResponse.json({ error: 'Password required' }, { status: 400 })
//     }
//
//     const user = await prisma.customer.findUnique({
//       where: { email: session.user.email }
//     })
//
//     if (!user || !user.password) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 })
//     }
//
//     const isValid = await bcrypt.compare(password, user.password)
//     if (!isValid) {
//       return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
//     }
//
//     // Set re-auth cookie (valid 10 min)
//     const response = NextResponse.json({ success: true })
//     response.cookies.set('re-auth-token', Date.now().toString(), {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 600, // 10 minutes
//       path: '/',
//     })
//
//     return response
//   } catch (error) {
//     return NextResponse.json({ error: 'Re-authentication failed' }, { status: 500 })
//   }
// }

// ============================================================
// Usage in any admin page:
// ============================================================
//
// import { ReAuthModal } from '@/components/admin/ReAuthModal'
//
// function SubscriptionPage() {
//   const [showReAuth, setShowReAuth] = useState(false)
//   const [pendingAction, setPendingAction] = useState<string | null>(null)
//
//   const handleCancelSubscription = async () => {
//     // Check re-auth first
//     const reAuthRes = await fetch('/api/auth/re-auth-check')
//     if (reAuthRes.status === 401) {
//       setPendingAction('cancel this subscription')
//       setShowReAuth(true)
//       return
//     }
//     await performCancel()
//   }
//
//   const handleReAuthConfirm = async () => {
//     // re-auth cookie is set, now perform the action
//     await performCancel()
//     setShowReAuth(false)
//     setPendingAction(null)
//   }
//
//   return (
//     <>
//       {showReAuth && (
//         <ReAuthModal
//           action={pendingAction || 'perform this action'}
//           onConfirm={handleReAuthConfirm}
//           onCancel={() => { setShowReAuth(false); setPendingAction(null) }}
//         />
//       )}
//       <button onClick={handleCancelSubscription}>Cancel Subscription</button>
//     </>
//   )
// }

// ============================================================
// Middleware check snippet (add to middleware.ts):
// ============================================================
//
// // In the sensitive paths check:
// const sensitivePaths = ['/admin/subscriptions', '/admin/settings']
// if (sensitivePaths.some(p => url.pathname.startsWith(p))) {
//   const reAuthCookie = req.cookies.get('re-auth-token')
//   const reAuthAge = reAuthCookie?.value
//     ? Date.now() - parseInt(reAuthCookie.value)
//     : Infinity
//   if (reAuthAge > 600000) { // 10 min
//     const loginUrl = new URL('/login', url)
//     loginUrl.searchParams.set('callbackUrl', url.pathname)
//     loginUrl.searchParams.set('reauth', 'true')
//     return NextResponse.redirect(loginUrl)
//   }
// }
