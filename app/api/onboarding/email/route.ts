import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/onboarding/email
 *
 * Stores a hashed email from the onboarding flow.
 * Rate limited: 10 requests per IP per hour.
 * Idempotent: same email + source returns same result.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10
const ipRequests = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipRequests.get(ip)
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const { email, source } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })
  }

  // Hash the email for storage (never store raw)
  const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')

  // Store via Prisma (upsert — idempotent)
  try {
    const prisma = (await import('@/lib/prisma')).default
    await prisma.onboardingEmail.upsert({
      where: { emailHash },
      update: { source: source || 'onboarding', optedIn: true, updatedAt: new Date() },
      create: { emailHash, source: source || 'onboarding', optedIn: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // If table doesn't exist yet, fail gracefully
    if (err?.code === 'P2021') {
      console.warn('[onboarding/email] table not found — skipping storage')
      return NextResponse.json({ ok: true, stored: false })
    }
    console.error('[onboarding/email] storage error:', err)
    return NextResponse.json({ error: 'storage error' }, { status: 500 })
  }
}
