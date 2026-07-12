// POST /api/telegram/webhook — receives Telegram bot updates (button callbacks).
// A callback_data of `approve:<id>` / `deny:<id>` calls the internal approval
// API (which is itself guarded by INTERNAL_API_KEY). This route must be publicly
// reachable (Telegram can't send our session cookie) so it is added to the
// middleware whitelist alongside /api/internal/provision.
import { NextRequest, NextResponse } from 'next/server'
import { answerCallback } from '@/lib/harness/telegram-approvals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000'
const KEY = process.env.INTERNAL_API_KEY || ''

export async function POST(req: NextRequest) {
  const update = await req.json().catch(() => ({}))
  const cb = update?.callback_query
  if (!cb) return NextResponse.json({ ok: true })

  const data: string = cb.data || ''
  const callbackId = cb.id as string
  const match = data.match(/^(approve|deny):(.+)$/)
  if (!match) {
    await answerCallback(callbackId, 'Unknown action')
    return NextResponse.json({ ok: true })
  }
  const [, decision, id] = match
  try {
    const res = await fetch(`${BASE}/api/admin/approvals/${id}/${decision}`, {
      method: 'POST',
      headers: { 'x-internal-api-key': KEY, 'content-type': 'application/json' },
    })
    const ok = res.ok
    await answerCallback(callbackId, ok ? `Approval ${decision}ed` : `Failed: ${res.status}`)
  } catch (e) {
    await answerCallback(callbackId, 'Error calling approval API')
  }
  return NextResponse.json({ ok: true })
}
