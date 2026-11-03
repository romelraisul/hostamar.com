export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const NextAuth = (await import('next-auth')).default
    const { authOptions } = await import('@/lib/auth-config')
    
    const handler = NextAuth(authOptions)
    return NextResponse.json({ ok: true, handler: typeof handler })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message, stack: e?.stack }, { status: 500 })
  }
}
