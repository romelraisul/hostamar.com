// /api/admin/fleet — V50 AI Employee Fleet API.
// GET  ?limit=  → latest FleetReport rows per employee + guardian tick summary.
// POST {employee, jobId, verdict, finished, couldnt, needsYou, raw, secret}
//      → insert a shift report (cron employees post via WSL; guarded by
//        FLEET_REPORT_SECRET so only the local employee chain can write).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMPLOYEES = [
  'Atlas', 'Echo', 'Reel', 'Bazaar', 'Quill', 'Sage',
  // V61 business lanes (hire: 2026-09-11) — fleet = 14
  'Nova', 'Forge', 'Pulse', 'Orion', 'Vertex', 'Harbor', 'Ledger', 'Scout',
] as const

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 10), 50)

  // Latest report per employee: fetch recent rows and pick the newest per employee.
  const rows = await prisma.fleetReport.findMany({
    orderBy: { runAt: 'desc' },
    take: limit * EMPLOYEES.length,
  })
  const latest: Record<string, (typeof rows)[number] | null> = {}
  for (const e of EMPLOYEES) latest[e] = rows.find((r) => r.employee === e) || null

  // Storage summary: Telegram-backed DriveFile rows + total bytes.
  const [files, agg] = await Promise.all([
    prisma.driveFile.count(),
    prisma.driveFile.aggregate({ _sum: { fileSize: true } }),
  ])

  return NextResponse.json({
    employees: EMPLOYEES.map((e) => ({
      name: e,
      lastReport: latest[e]
        ? {
            runAt: latest[e]!.runAt,
            verdict: latest[e]!.verdict,
            finished: latest[e]!.finished,
            couldnt: latest[e]!.couldnt,
            needsYou: latest[e]!.needsYou,
          }
        : null,
    })),
    recent: rows.slice(0, limit).map((r) => ({
      employee: r.employee,
      verdict: r.verdict,
      finished: r.finished,
      couldnt: r.couldnt,
      needsYou: r.needsYou,
      runAt: r.runAt,
    })),
    storage: {
      telegramFiles: files,
      telegramBytes: agg._sum.fileSize ? agg._sum.fileSize.toString() : '0',
      // B2 is the hot cache in front of Telegram; sizes reported by the local
      // WSL syncer when present (not stored in Neon).
    },
  })
}

export async function POST(req: NextRequest) {
  // Employees run on the local PC (Hermes cron) and report through the site.
  // Two accepted auth paths: admin cookie OR FLEET_REPORT_SECRET bearer.
  const secret = (process.env.FLEET_REPORT_SECRET || '').trim()
  const auth = req.headers.get('authorization') || ''
  const viaSecret = !!secret && auth === `Bearer ${secret}`
  if (!viaSecret && !(await isAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const employee = String(body.employee || '').trim()
  if (!EMPLOYEES.includes(employee as (typeof EMPLOYEES)[number])) {
    return NextResponse.json({ error: 'Unknown employee' }, { status: 400 })
  }

  // V50 dedupe guard: same employee+jobId pushing identical raw within 10 min
  // is a retry/double-push, not a new shift — return the existing row instead.
  const raw = body.raw ? String(body.raw).slice(0, 8000) : null
  const recent = await prisma.fleetReport.findFirst({
    where: { employee, jobId: String(body.jobId || '').slice(0, 64), raw },
    orderBy: { runAt: 'desc' },
  })
  if (recent && Date.now() - recent.runAt.getTime() < 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, id: recent.id, deduped: true })
  }

  const row = await prisma.fleetReport.create({
    data: {
      employee,
      jobId: String(body.jobId || '').slice(0, 64),
      verdict: body.verdict ? String(body.verdict).slice(0, 32) : null,
      finished: body.finished ? String(body.finished).slice(0, 2000) : null,
      couldnt: body.couldnt ? String(body.couldnt).slice(0, 2000) : null,
      needsYou: body.needsYou ? String(body.needsYou).slice(0, 2000) : null,
      raw,
      runAt: body.runAt ? new Date(body.runAt) : new Date(),
    },
  })
  return NextResponse.json({ ok: true, id: row.id })
}
