// ============================================================================
// lib/ops-lanes.ts — the 16 AI employee lanes + their display metadata.
// Single source of truth for the Ops Center lane grid (role + schedule) and
// for the /api/ops/control-sync lane allowlist consumed by the WSL Hermes job.
// Names MUST stay in sync with EMPLOYEES in app/api/admin/fleet/route.ts.
// ============================================================================

export const OPS_EMPLOYEES = [
  'Atlas', 'Echo', 'Reel', 'Bazaar', 'Quill', 'Sage',
  'Nova', 'Forge', 'Pulse', 'Orion', 'Vertex', 'Harbor', 'Ledger', 'Scout',
  'Warden', 'Oracle',
] as const

export type OpsEmployee = (typeof OPS_EMPLOYEES)[number]

export const LANE_META: Record<string, { role: string; schedule: string }> = {
  Atlas:  { role: 'Ops Coordinator',        schedule: '*/5 * * * *' },
  Echo:   { role: 'Content & Comms',        schedule: '*/30 * * * *' },
  Reel:   { role: 'Video Production',       schedule: '0 * * * *' },
  Bazaar: { role: 'Commerce & Store',       schedule: '0 */2 * * *' },
  Quill:  { role: 'Copywriter / SEO',       schedule: '0 */3 * * *' },
  Sage:   { role: 'Strategy Advisor',       schedule: '0 6 * * *' },
  Nova:   { role: 'Growth & Activation',    schedule: '*/30 * * * *' },
  Forge:  { role: 'Engineering & Infra',    schedule: '*/20 * * * *' },
  Pulse:  { role: 'Analytics & Health',     schedule: '*/10 * * * *' },
  Orion:  { role: 'Product Research',       schedule: '0 */4 * * *' },
  Vertex: { role: 'AI Gateway / Models',    schedule: '0 * * * *' },
  Harbor: { role: 'Hosting / VPS Ops',      schedule: '*/15 * * * *' },
  Ledger: { role: 'Finance & Revenue',      schedule: '0 * * * *' },
  Scout:  { role: 'Lead Research',          schedule: '*/30 * * * *' },
  Warden: { role: 'Security & Triage',      schedule: '*/10 * * * *' },
  Oracle: { role: 'Forecasting',            schedule: '0 7 * * *' },
}

export function isOpsEmployee(name: string): name is OpsEmployee {
  return (OPS_EMPLOYEES as readonly string[]).includes(name)
}
