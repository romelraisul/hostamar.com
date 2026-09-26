import { NextRequest, NextResponse } from 'next/server'
import { pushFleetNote } from '@/lib/support/fleet-push'


// One-time route to push Warden report from local cron
// Call with: curl -X POST https://hostamar.com/api/admin/warden-report -H "Content-Type: application/json" -d '{"report":"..."}'
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const report = body.report
    if (!report) {
      return NextResponse.json({ error: 'missing report' }, { status: 400 })
    }
    const id = await pushFleetNote({
      employee: 'Warden',
      jobId: 'fceba9fd85e3',
      verdict: 'ALERT',
      finished: report,
      couldnt: '',
      needsYou: 'NEEDS YOU — Neon free tier quota exhausted',
      raw: report,
    })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
