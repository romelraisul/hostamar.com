import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/email/welcome-send
 *
 * Admin-only, sends a Bangladesh-localized welcome email to any customer.
 * Anti-spam protection: refuses to re-send to the same recipient within 7
 * days of the last send (tracked via ActivityLog).
 *
 * Body:
 *   { customerId?: string, email?: string, force?: boolean }
 *
 * At least one of `customerId` or `email` is required. If both are
 * supplied, `customerId` wins.
 *
 * Behaviour when SMTP not configured (no SMTP_HOST env on prod): the
 * underlying lib/email.ts falls back to logging-only and returns
 * { success: false, fallback: true }, so this route returns 200 with a
 * `fallback: true` marker instead of 500.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json().catch(() => ({}))
    const customerId = body?.customerId ? String(body.customerId) : null
    const emailIn = body?.email ? String(body.email).trim().toLowerCase() : null
    const force = Boolean(body?.force)

    if (!customerId && !emailIn) {
      return NextResponse.json({ error: 'customerId or email required' }, { status: 400 })
    }

    const customer = customerId
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, email: true, name: true, createdAt: true },
        })
      : await prisma.customer.findUnique({
          where: { email: emailIn! },
          select: { id: true, email: true, name: true, createdAt: true },
        })

    if (!customer) {
      return NextResponse.json({ error: 'customer not found' }, { status: 404 })
    }
    if (!customer.email) {
      return NextResponse.json({ error: 'customer has no email on file' }, { status: 400 })
    }

    // Anti-spam: refuse to send if a welcome email was sent in the last 7 days
    if (!force) {
      try {
        const recent = await prisma.activityLog.findFirst({
          where: {
            customerId: customer.id,
            action: 'welcome_email_sent',
            // createdAt is timestamp-like; tolerate model that lacks the column
          },
          orderBy: undefined as any, // fallback to client-side filter below
        })
        // Cheap fallback scan when ActivityLog model lacks createdAt index ordering:
        if (recent) {
          // ActivityLog on this codebase does not always have createdAt; do
          // a raw scan of the most recent matching entry and compare via
          // email log (server-side) timestamp.
          const rawRecent = await prisma.$queryRaw<Array<{ createdAt: Date }>>`
            SELECT "createdAt" FROM "ActivityLog"
            WHERE "customerId" = ${customer.id} AND action = 'welcome_email_sent'
            ORDER BY "createdAt" DESC LIMIT 1;
          `.catch(() => [] as Array<{ createdAt: Date }>)
          if (rawRecent[0]?.createdAt) {
            const ageMs = Date.now() - new Date(rawRecent[0].createdAt).getTime()
            const sevenDays = 7 * 24 * 60 * 60 * 1000
            if (ageMs < sevenDays) {
              const retryAt = new Date(new Date(rawRecent[0].createdAt).getTime() + sevenDays).toISOString()
              return NextResponse.json(
                {
                  success: false,
                  error: 'welcome_email_sent_recently',
                  retryAt,
                  message: 'Welcome email was sent to this customer within the last 7 days. Pass {force:true} to override.',
                },
                { status: 429 },
              )
            }
          }
        }
      } catch (e) {
        // ActivityLog schema drift or column missing — non-fatal, allow send
      }
    }

    let emailResult: any = { success: false, fallback: true }
    try {
      const libEmail: any = await import('@/lib/email')
      if (libEmail?.sendWelcomeEmail) {
        emailResult = await libEmail.sendWelcomeEmail(customer.email, customer.name || customer.email)
      }
    } catch (e: any) {
      emailResult = { success: false, fallback: true, error: e?.message || emailResult?.error }
    }

    // Log the attempt regardless of SMTP success, so anti-spam catches duplicates
    try {
      await prisma.activityLog.create({
        data: {
          customerId: customer.id,
          action: 'welcome_email_sent',
          description: `Welcome email attempt to ${customer.email} — ${emailResult?.success ? 'sent' : 'fallback/no-smtp'}`,
        },
      })
    } catch {}

    return NextResponse.json({
      success: !!emailResult?.success,
      fallback: !!emailResult?.fallback,
      customer: { id: customer.id, email: customer.email, name: customer.name },
      email: emailResult,
    })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json(
      { success: false, error: error?.message || 'send failed' },
      { status },
    )
  }
}
