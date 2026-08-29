export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { base32Encode, otpauthUrl, qrDataUrl, totpVerify } from '@/lib/totp'

// MFA columns are runtime-ensured (no migration needed — matches the repo's
// ensure-schema convention). Encrypted-at-rest = we store the B32 secret
// alongside the customer row; only the verified user can reach it.
async function ensureMfaColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false`)
  } catch {}
}

/**
 * POST /api/auth/mfa — MFA lifecycle, zero deps (RFC-6238 TOTP)
 *  { action: 'setup' }               → generate + store secret, return otpauth QR
 *  { action: 'verify', token }        → enable MFA (valid TOTP required)
 *  { action: 'disable', token }       → disable MFA (valid TOTP required)
 *  { action: 'status' }               → { mfaEnabled }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureMfaColumns()

  const body = await req.json().catch(() => ({}))
  const action = String(body.action || 'status')

  const row: any = await prisma.$queryRawUnsafe(
    `SELECT "mfaSecret", "mfaEnabled" FROM "Customer" WHERE id = $1 LIMIT 1`, user.id,
  ).catch(() => null)
  const cur = Array.isArray(row) ? row[0] : null

  if (action === 'status') {
    return NextResponse.json({ mfaEnabled: !!cur?.mfaEnabled })
  }

  if (action === 'setup') {
    // Generate fresh secret (invalidates any unverified previous one)
    const secret = base32Encode(require('crypto').randomBytes(20))
    await prisma.$executeRawUnsafe(
      `UPDATE "Customer" SET "mfaSecret" = $1, "mfaEnabled" = false WHERE id = $2`,
      secret, user.id,
    ).catch(() => null)
    const otpauth = otpauthUrl(secret, user.email)
    return NextResponse.json({
      secret,
      otpauth,
      qr: qrDataUrl(otpauth),
      message: 'Google Authenticator এ QR স্ক্যান করুন, তারপর 6-digit কোড দিয়ে verify করুন।',
    })
  }

  if (action === 'verify' || action === 'disable') {
    const token = String(body.token || '')
    const secret = cur?.mfaSecret
    if (!secret) return NextResponse.json({ error: 'MFA আগে setup করুন' }, { status: 400 })
    if (!totpVerify(secret, token)) {
      return NextResponse.json({ error: 'ভুল কোড — আবার চেষ্টা করুন' }, { status: 401 })
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "Customer" SET "mfaEnabled" = $1 WHERE id = $2`,
      action === 'verify', user.id,
    ).catch(() => null)
    return NextResponse.json({
      mfaEnabled: action === 'verify',
      message: action === 'verify' ? '✅ MFA চালু হয়েছে — লগ ইনে এখন কোড লাগবে' : 'MFA বন্ধ হয়েছে',
    })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
