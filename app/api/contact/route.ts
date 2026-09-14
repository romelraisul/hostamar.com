export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// POST /api/contact — public lead capture (no external account required).
//
// The /contact form used to POST to /api/email/test, which (a) requires a
// {to, name} body it never received and (b) sends mail via SMTP — so with no
// mail provider configured every submission silently failed and the lead was
// lost. This route is the durable path:
//
//   1. persist the lead in the existing Lead/LeadLog models (Neon),
//      with a JSONL file store under data/leads/ (then /tmp) as a fallback;
//   2. notify the owner best-effort through the WORKING FleetReport channel
//      (admin Fleet tab) + the Telegram helper when it is configured;
//   3. always answer with a clear success state for the visitor.
//
// Email delivery is NOT required for any of the three steps.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { notify as telegramNotify } from '@/lib/support/telegram'
import { pushFleetNote, LEAD_LANE } from '@/lib/support/fleet-push'
import { recordOpsEvent } from '@/lib/ops-events'

const TOPICS = ['billing', 'video', 'hosting', 'gaming', 'other'] as const

function clean(v: unknown, max: number): string {
  return String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max)
}

function storeDirs(): string[] {
  const dirs: string[] = []
  if (process.env.LEAD_STORE_DIR) dirs.push(process.env.LEAD_STORE_DIR)
  dirs.push(path.join(process.cwd(), 'data', 'leads'))
  dirs.push(path.join('/tmp', 'hostamar-leads'))
  return dirs
}

/** Durable fallback when the DB write fails: append one JSON line to disk. */
async function persistToFile(record: Record<string, unknown>): Promise<boolean> {
  const line = JSON.stringify(record) + '\n'
  for (const dir of storeDirs()) {
    try {
      await fs.mkdir(dir, { recursive: true })
      await fs.appendFile(path.join(dir, 'contact-inbox.jsonl'), line, 'utf8')
      return true
    } catch {
      /* try next candidate */
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    // Spam guard: 10 contact submissions / 10 min per IP. Fail-open by design.
    const rl = await checkRateLimit(
      ip,
      { bucket: 'contact.submit', limit: 10, windowMs: 10 * 60_000 },
      '/api/contact',
      'POST'
    )
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: 'RATE_LIMITED', message: 'অনেকবার পাঠানো হয়েছে — কিছুক্ষণ পরে আবার চেষ্টা করুন।' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))

    const rawTopic = clean(body.topic, 32).toLowerCase()
    const topic = (TOPICS as readonly string[]).includes(rawTopic) ? rawTopic : 'other'
    const name = clean(body.name, 120)
    const email = clean(body.email, 200)
    const phone = clean(body.phone, 40)
    const message = clean(body.message, 4000)
    const attachment = clean(body.attachment, 300)

    if (!name || !message || (!email && !phone)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_INPUT', message: 'নাম, মেসেজ আর ইমেইল বা ফোন নম্বর দরকার।' },
        { status: 400 }
      )
    }

    const notes = [
      `topic: ${topic}`,
      `attachment: ${attachment || 'none'}`,
      `ip: ${ip}`,
      '',
      message,
    ].join('\n')

    const fallbackId = `contact-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const createdAt = new Date().toISOString()

    // (1a) Durable: existing Lead model.
    let id = fallbackId
    let persisted: 'db' | 'file' | 'none' = 'none'
    try {
      const lead = await prisma.lead.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          source: 'contact-form',
          status: 'new',
          score: 0,
          tags: topic,
          notes,
        },
      })
      id = lead.id
      persisted = 'db'
      // Best-effort audit trail; never fatal.
      await prisma.leadLog
        .create({
          data: { leadId: lead.id, action: 'created', notes: `source: contact-form (${topic})`, outcome: 'new' },
        })
        .catch(() => undefined)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[contact] DB persist failed, falling back to file store:', err instanceof Error ? err.message : err)
    }

    const record = { id, name, email, phone, topic, message, attachment, source: 'contact-form', createdAt }

    // (1b) Durable fallback: JSONL file (only when the DB write failed).
    if (persisted === 'none') {
      if (await persistToFile(record)) persisted = 'file'
    }

    if (persisted === 'none') {
      // Nothing durable anywhere — surface the failure instead of pretending.
      return NextResponse.json(
        { ok: false, error: 'PERSIST_FAILED', message: 'সেভ করা যায়নি — একটু পরে আবার চেষ্টা করুন বা সরাসরি WhatsApp করুন।' },
        { status: 500 }
      )
    }

    // (2) Notify the owner — both channels are best-effort and never throw.
    const contactMethod = email || phone
    const summary = `নতুন লিড (${topic}) — ${name} · ${contactMethod} · ${message.slice(0, 280)}`

    // V70 Ops Center live feed (best-effort, never throws).
    void recordOpsEvent({
      lane: LEAD_LANE,
      type: 'LEAD',
      severity: 'info',
      title: `New lead — ${name}`,
      body: summary,
      meta: { id, topic, source: 'contact-form' },
    })
    await Promise.allSettled([
      pushFleetNote({
        employee: LEAD_LANE,
        jobId: `lead-${id}`,
        verdict: 'NEW_LEAD',
        needsYou: summary,
        raw: JSON.stringify(record),
      }),
      telegramNotify('ops', summary),
    ])

    // (3) Clear success state for the visitor.
    return NextResponse.json({
      ok: true,
      id,
      stored: persisted,
      message: 'আপনার মেসেজ পৌঁছে গেছে — বাংলাদেশ টিম দেখছে।',
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[contact] unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message: 'সাময়িক সমস্যা — একটু পরে আবার চেষ্টা করুন।' },
      { status: 500 }
    )
  }
}
