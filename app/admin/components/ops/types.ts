// Shapes mirror the Employee Ops Center API contract (2026-09-14).
export interface OpsKpis {
  signupsToday?: number
  payingCustomers?: number
  targetCustomers?: number
  mrrBdt?: number
  activeLanes?: number
  alerts24h?: number
}

export interface OpsLane {
  employee: string
  role?: string | null
  schedule?: string | null
  lastRunAt?: string | null
  ageMinutes?: number | null
  verdict?: string | null
  streak?: number
  paused?: boolean
  autonomy?: string | null
  lastSnippet?: string | null
}

export interface OpsStatus {
  kpis?: OpsKpis
  lanes?: OpsLane[]
  generatedAt?: string
}

export interface OpsEvent {
  id: string
  lane: string
  type: string
  severity: string
  title: string
  body?: string | null
  meta?: string | null
  createdAt: string
}

export interface OpsControlPatch {
  paused?: boolean
  autonomy?: string
  note?: string
}
