import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { recordOpsEvent, verdictSeverity } from "@/lib/ops-events";
import { executeWithFailover } from "@/lib/db-failover";

const EMPLOYEES = [
  'Atlas', 'Echo', 'Reel', 'Bazaar', 'Quill', 'Sage',
  // V61 business lanes (hire: 2026-09-11) — fleet = 14
  'Nova', 'Forge', 'Pulse', 'Orion', 'Vertex', 'Harbor', 'Ledger', 'Scout',
  // V65/V66: Layer-5 triage + trend forecast — fleet = 16
  'Warden', 'Oracle',
  // consolidated fleet heartbeat card
  'Fleet-Heartbeat',
  // V71: TV Station Operator — owns the 24/7 live channel + edge shelf
  'Channel',
  // V72: Account Safety Officer — owns suspension/termination prevention
  'Guard',
] as const;

const BRAIN_MODELS_URL = process.env.BRAIN_MODELS_URL || 'http://localhost:4000/v1/models';

// Single source of truth for model count - cached for 30s
let modelCountCache: { count: number; at: number } | null = null;
const MODEL_COUNT_CACHE_MS = 30000;

async function fetchModelCount(): Promise<number> {
  const now = Date.now();
  if (modelCountCache && now - modelCountCache.at < MODEL_COUNT_CACHE_MS) {
    return modelCountCache.count;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(BRAIN_MODELS_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data.data) ? data.data.length : 71;
      modelCountCache = { count, at: now };
      return count;
    }
  } catch {
    // fall through to default
  }
  return 71; // fallback
}

// Promise.race wrapper with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin');
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'নিষিদ্ধ: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403, headers: corsHeaders() });
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 10), 50);

  // Fetch model count in parallel with DB query
  const modelCountPromise = fetchModelCount();

  // Try with db-failover first, fall back to static data
  const dbPromise = executeWithFailover(async (client, dbType) => {
    // Latest report per employee: fetch recent rows and pick the newest per employee.
    const rows = dbType === 'turso'
      ? (await Promise.race([
          client.execute({
            sql: `SELECT * FROM "FleetReport" ORDER BY "runAt" DESC LIMIT ?`,
            args: [limit * EMPLOYEES.length],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('turso timeout')), 5000)),
        ])) as any
      : (await Promise.race([
          client.query(`SELECT * FROM "FleetReport" ORDER BY "runAt" DESC LIMIT $1`, [limit * EMPLOYEES.length]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('pg timeout')), 5000)),
        ])) as any;

    const latest: Record<string, (typeof rows.rows)[number] | null> = {};
    for (const e of EMPLOYEES) latest[e] = rows.rows.find((r) => r.employee === e) || null;

    // Storage summary: Telegram-backed DriveFile rows + total bytes.
    const [files, agg] = await Promise.all([
      dbType === 'turso'
        ? Promise.race([
            client.execute({ sql: `SELECT COUNT(*) as cnt FROM "DriveFile"`, args: [] }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('turso timeout')), 3000)),
          ])
        : Promise.race([
            client.query(`SELECT COUNT(*) as cnt FROM "DriveFile"`, []),
            new Promise((_, reject) => setTimeout(() => reject(new Error('pg timeout')), 3000)),
          ]),
      dbType === 'turso'
        ? Promise.race([
            client.execute({ sql: `SELECT COALESCE(SUM("fileSize"), 0) as sum FROM "DriveFile"`, args: [] }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('turso timeout')), 3000)),
          ])
        : Promise.race([
            client.query(`SELECT COALESCE(SUM("fileSize"), 0) as sum FROM "DriveFile"`, []),
            new Promise((_, reject) => setTimeout(() => reject(new Error('pg timeout')), 3000)),
          ]),
    ]);

    return {
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
        hasReport: !!latest[e],
      })),
      recent: rows.rows.slice(0, limit).map((r) => ({
        employee: r.employee,
        verdict: r.verdict,
        finished: r.finished,
        couldnt: r.couldnt,
        needsYou: r.needsYou,
        runAt: r.runAt,
      })),
      storage: {
        telegramFiles: Number(files.rows?.[0]?.cnt || 0),
        telegramBytes: (agg.rows?.[0]?.sum || '0').toString(),
      },
    };
  });

  // Race DB query against 8s timeout, then fall back
  const [modelCount, dbResult] = await Promise.all([
    modelCountPromise,
    withTimeout(dbPromise, 8000, null),
  ]);

  const elapsed = Date.now() - startTime;

  if (dbResult) {
    return NextResponse.json({
      ...dbResult.result,
      models: modelCount,
      sops: 65,
      roster: EMPLOYEES.length,
      fleet: [],
      fallback: dbResult.dbType,
      responseTimeMs: elapsed,
    }, { headers: corsHeaders() });
  }

  // All DBs down or timeout - return static fallback with model count
  return NextResponse.json({
    employees: EMPLOYEES.map((e) => ({ name: e, lastReport: null, hasReport: false })),
    recent: [],
    storage: { telegramFiles: 0, telegramBytes: '0' },
    models: modelCount,
    sops: 65,
    roster: EMPLOYEES.length,
    fleet: [],
    fallback: 'timeout',
    warning: `DB timeout/error after ${elapsed}ms - returned static fallback`,
    responseTimeMs: elapsed,
  }, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  console.log('[fleet] POST called with url:', req.url);
  // Employees run on the local PC (Hermes cron) and report through the site.
  // Two accepted auth paths: admin cookie OR FLEET_REPORT_SECRET bearer.
  // Fallback to NEXTAUTH_SECRET if FLEET_REPORT_SECRET not set (for Cloudflare Worker env).
  const secret = ((process.env.FLEET_REPORT_SECRET || process.env.NEXTAUTH_SECRET || '') as string).trim();
  const auth = req.headers.get('authorization') || '';
  const viaSecret = !!secret && auth === `Bearer ${secret}`;
  console.log('[fleet] FLEET_REPORT_SECRET present?', !!secret);
  console.log('[fleet] viaSecret?', viaSecret);
  if (!viaSecret && !(await isAdmin(req))) {
    console.log('[fleet] auth failed');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  console.log('[fleet] parsed body employee:', body.employee);
  const employee = String(body.employee || '').trim();
  if (!EMPLOYEES.includes(employee as (typeof EMPLOYEES)[number])) {
    return NextResponse.json({ error: 'Unknown employee' }, { status: 400 });
  }

  // V70: self-heal the FleetReport table on first use. The schema has the
  // model but no migration created it (same pattern as ensureOpsSchema for
  // FleetEvent) — without this every POST 500s on a fresh DB.
  // MUST run before any Prisma fleetReport calls (findFirst, create).
  let tableReady = false;
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FleetReport" (
      "id" TEXT NOT NULL,
      "employee" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "verdict" TEXT,
      "finished" TEXT,
      "couldnt" TEXT,
      "needsYou" TEXT,
      "raw" TEXT,
      "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FleetReport_pkey" PRIMARY KEY ("id")
    )`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FleetReport_employee_runAt_idx" ON "FleetReport"("employee", "runAt" DESC)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FleetReport_jobId_idx" ON "FleetReport"("jobId")`);
    tableReady = true;
    console.log('[fleet] FleetReport table ready');
  } catch (ddlErr) {
    // Best-effort: if the table already exists or DDL is rejected (Neon quota),
    // fall through to the create() call below.
    console.error('[fleet] FleetReport DDL failed (likely Neon quota):', ddlErr instanceof Error ? ddlErr.message : ddlErr);
  }

  const raw = body.raw ? String(body.raw).slice(0, 8000) : null;

  // V50 dedupe guard: same employee+jobId pushing identical raw within 10 min
  // is a retry/double-push, not a new shift — return the existing row instead.
  // V77: Neon is quota-locked; the create() call is individually try/catch so
  // a quota error can't turn the report into a 500. The report is always acked.
  let row: any;
  if (tableReady) {
    try {
      const recent = await prisma.fleetReport.findFirst({
        where: { employee, jobId: String(body.jobId || '').slice(0, 64), raw },
        orderBy: { runAt: 'desc' },
      });
      if (recent && Date.now() - recent.runAt.getTime() < 10 * 60 * 1000) {
        return NextResponse.json({ ok: true, id: recent.id, deduped: true });
      }
      row = await prisma.fleetReport.create({
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
      });
    } catch (createErr) {
      console.error('[fleet] fleetReport create failed (Neon quota?):', createErr instanceof Error ? createErr.message : createErr);
      row = { id: `accepted-${Date.now()}`, degraded: true };
    }
  } else {
    // Table unavailable (Neon quota) — accept the report but don't persist.
    // Return ok with a synthetic id so the client knows the report was received.
    row = { id: `accepted-${Date.now()}`, degraded: true };
  }

  // V70 Ops Center: mirror the shift into the live feed + lane grid.
  // Best-effort and fully isolated — a failure here must never fail the report.
  // V77: Neon is quota-locked; each DB call is individually try/catch so a
  // missing table / quota error can't turn a 200 into a 500.
  const verdict = row.verdict;
  const snippet = (row.needsYou || row.finished) ? String(row.needsYou || row.finished).slice(0, 240) : null;
  const runAt = new Date();
  try {
    await recordOpsEvent({
      lane: employee,
      type: 'REPORT',
      severity: verdictSeverity(verdict),
      title: `Shift report — ${employee}${verdict ? ` (${verdict})` : ''}`,
      body: snippet,
      meta: { jobId: row.jobId, verdict },
    });
  } catch (e) { console.error('[fleet] recordOpsEvent failed:', e instanceof Error ? e.message : e); }
  try {
    await prisma.fleetLaneStatus.upsert({
      where: { employee },
      create: { employee, lastRunAt: runAt, verdict, lastSnippet: snippet },
      update: { lastRunAt: runAt, verdict, lastSnippet: snippet },
    });
  } catch (e) { console.error('[fleet] fleetLaneStatus.upsert failed:', e instanceof Error ? e.message : e); }

  return NextResponse.json({ ok: true, id: row.id }, { headers: corsHeaders() });
}