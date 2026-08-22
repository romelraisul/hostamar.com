export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/affiliate/track
 * Public endpoint: records that a visitor arrived via an affiliate link.
 * Body: { ref: string }  (the affiliate code from ?ref=CODE)
 * Sets a first-party cookie so signup can attribute the referral.
 * No auth required (runs before the user has an account).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const ref = String(body.ref || '').trim().toUpperCase()
    if (!ref) {
      return NextResponse.json({ error: 'INVALID_REF', message: 'Provide { ref: "CODE" }' }, { status: 400 })
    }

    // Validate the code belongs to a real customer
    const affiliate = await prisma.customer.findUnique({ where: { referralCode: ref } })
    if (!affiliate) {
      return NextResponse.json({ error: 'UNKNOWN_REF', message: 'Referral code not found.' }, { status: 404 })
    }

    // Set attribution cookie (30 days)
    const res = NextResponse.json({ ok: true, ref })
    res.cookies.set('affiliate_ref', ref, {
      httpOnly: false, // signup page (client) reads it
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[affiliate/track] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
