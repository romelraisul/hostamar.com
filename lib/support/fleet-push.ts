// ============================================================================
// lib/support/fleet-push.ts — in-process FleetReport push (owner notification).
//
// The Hermes cron lanes report to the admin Fleet tab by POSTing to
// /api/admin/fleet with a Bearer FLEET_REPORT_SECRET. In-app events (a new
// lead, a contact-form submission) cannot know that secret and must not depend
// on any external provider — so they write the SAME FleetReport row directly.
//
// The admin Fleet tab (/admin → GET /api/admin/fleet → FleetTab) renders these
// rows, which makes this the one owner-notification channel that works with
// zero accounts and zero extra keys. Email is deliberately NOT required.
//
// Contract: best-effort, never throws, never blocks the request path.
// ============================================================================
import { prisma } from '@/lib/prisma'

/**
 * Lane label used for CRM/lead events. Deliberately NOT one of the 16 AI
 * employee names: the Fleet tab shows one "latest report" card per employee,
 * so writing as an existing lane would clobber that lane's real shift report.
 * A distinct label shows up in the live "Recent shift reports" stream only.
 */
export const LEAD_LANE = 'Leads'

export interface FleetNote {
  employee?: string
  jobId: string
  verdict?: string
  finished?: string
  couldnt?: string
  needsYou?: string
  raw?: string
}

/**
 * Push one report row to the admin Fleet tab. Returns the row id, or null when
 * the push failed — callers must treat null as "not notified", never as fatal.
 */
export async function pushFleetNote(note: FleetNote): Promise<string | null> {
  try {
    const row = await prisma.fleetReport.create({
      data: {
        employee: (note.employee || LEAD_LANE).slice(0, 64),
        jobId: note.jobId.slice(0, 64),
        verdict: note.verdict ? note.verdict.slice(0, 32) : null,
        finished: note.finished ? note.finished.slice(0, 2000) : null,
        couldnt: note.couldnt ? note.couldnt.slice(0, 2000) : null,
        needsYou: note.needsYou ? note.needsYou.slice(0, 2000) : null,
        raw: note.raw ? note.raw.slice(0, 8000) : null,
      },
    })
    return row.id
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fleet-push] non-fatal:', err instanceof Error ? err.message : err)
    return null
  }
}
