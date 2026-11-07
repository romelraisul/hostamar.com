import { Pool } from '@neondatabase/serverless'

export type DBType = 'turso' | 'neon' | 'supabase' | 'local'

export interface DBHealth {
  turso: 'connected' | 'disconnected' | 'error'
  neon: 'connected' | 'disconnected' | 'error'
  supabase: 'connected' | 'disconnected' | 'error'
  local: 'connected' | 'disconnected' | 'skipped' | 'error'
  active: DBType
  syncedAt: string
  errors?: Record<string, string>
}

interface DBClients {
  turso?: any
  neon?: Pool
  supabase?: Pool
  local?: Pool
}

let clients: DBClients = {}
let lastHealthCheck = 0
let cachedHealth: DBHealth | null = null
const HEALTH_CACHE_MS = 30000

async function getTursoClient() {
  if (clients.turso) return clients.turso
  const raw = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!raw) return null
  const url = raw.replace(/^libsql:\/\//, 'https://')
  const { createClient } = await import('@libsql/client/web')
  clients.turso = createClient({ url, authToken })
  return clients.turso
}

function getNeonClient() {
  if (clients.neon) return clients.neon
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON
  if (!url) return null
  clients.neon = new Pool({ connectionString: url, max: 1 })
  return clients.neon
}

function getSupabaseClient() {
  if (clients.supabase) return clients.supabase
  const url = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_URL
  if (!url) return null
  clients.supabase = new Pool({ connectionString: url, max: 1 })
  return clients.supabase
}

function getLocalClient() {
  if (clients.local) return clients.local
  const url = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL
  if (!url || url.startsWith('libsql://')) return null
  clients.local = new Pool({ connectionString: url, max: 1 })
  return clients.local
}

const IS_CLOUDFLARE_EDGE =
  typeof (globalThis as any).CF === 'object' ||
  typeof (globalThis as any).REQUEST_ID === 'string' ||
  typeof (globalThis as any).caches !== 'undefined'

function isLocalSkipped(): boolean {
  return IS_CLOUDFLARE_EDGE
}

async function checkTurso(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getTursoClient()
    if (!client) return { ok: false, error: 'no client (TURSO_DATABASE_URL missing)' }
    await Promise.race([
      client.execute('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000)),
    ])
    return { ok: true }
  } catch (e: any) {
    console.error('[DB Failover] turso check failed:', e?.message || String(e))
    return { ok: false, error: e?.message || String(e) }
  }
}

async function checkNeon(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getNeonClient()
    if (!client) return { ok: false, error: 'no client (NEON_DATABASE_URL missing)' }
    await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000)),
    ])
    return { ok: true }
  } catch (e: any) {
    console.error('[DB Failover] neon check failed:', e?.message || String(e))
    return { ok: false, error: e?.message || String(e) }
  }
}

async function checkSupabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getSupabaseClient()
    if (!client) return { ok: false, error: 'no client (SUPABASE_DATABASE_URL missing)' }
    await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000)),
    ])
    return { ok: true }
  } catch (e: any) {
    console.error('[DB Failover] supabase check failed:', e?.message || String(e))
    return { ok: false, error: e?.message || String(e) }
  }
}

async function checkLocal(): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (isLocalSkipped()) return { ok: false, skipped: true }
  try {
    const client = getLocalClient()
    if (!client) return { ok: false, error: 'no client (LOCAL_DATABASE_URL missing)' }
    await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000)),
    ])
    return { ok: true }
  } catch (e: any) {
    console.error('[DB Failover] local check failed:', e?.message || String(e))
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function getDBHealth(): Promise<DBHealth> {
  const now = Date.now()
  if (cachedHealth && now - lastHealthCheck < HEALTH_CACHE_MS) {
    return cachedHealth
  }

  const [turso, neon, supabase, local] = await Promise.all([
    checkTurso(),
    checkNeon(),
    checkSupabase(),
    checkLocal(),
  ])

  const errors: Record<string, string> = {}
  if (!turso.ok && turso.error) errors.turso = turso.error
  if (!neon.ok && neon.error) errors.neon = neon.error
  if (!supabase.ok && supabase.error) errors.supabase = supabase.error
  if (!local.ok && local.error) errors.local = local.error

  let active: DBType = 'turso'
  if (turso.ok) active = 'turso'
  else if (neon.ok) active = 'neon'
  else if (supabase.ok) active = 'supabase'
  else if (local.ok) active = 'local'

  cachedHealth = {
    turso: turso.ok ? 'connected' : 'error',
    neon: neon.ok ? 'connected' : 'error',
    supabase: supabase.ok ? 'connected' : 'error',
    local: local.skipped ? 'skipped' : (local.ok ? 'connected' : 'error'),
    active,
    syncedAt: new Date().toISOString(),
    errors,
  }
  lastHealthCheck = now
  return cachedHealth
}

export async function getActiveDB(): Promise<{ type: DBType; client: any } | null> {
  const health = await getDBHealth()

  if (health.turso === 'connected') {
    return { type: 'turso', client: await getTursoClient() }
  }
  if (health.neon === 'connected') {
    return { type: 'neon', client: getNeonClient() }
  }
  if (health.supabase === 'connected') {
    return { type: 'supabase', client: getSupabaseClient() }
  }
  if (health.local === 'connected') {
    return { type: 'local', client: getLocalClient() }
  }
  return null
}

export async function executeWithFailover<T>(
  operation: (client: any, type: DBType) => Promise<T>
): Promise<{ result: T; dbType: DBType } | null> {
  const health = await getDBHealth()

  const order: DBType[] = ['turso', 'neon', 'supabase', 'local']

  for (const dbType of order) {
    const status = health[dbType]
    if (status !== 'connected') continue

    let client: any
    switch (dbType) {
      case 'turso':
        client = await getTursoClient()
        break
      case 'neon':
        client = getNeonClient()
        break
      case 'supabase':
        client = getSupabaseClient()
        break
      case 'local':
        client = getLocalClient()
        break
    }

    if (!client) continue

    try {
      const result = await operation(client, dbType)
      if (dbType !== 'turso' && health.turso === 'connected') {
        console.log(`[DB Failover] Using ${dbType} (Turso was primary)`)
      }
      return { result, dbType }
    } catch (e) {
      console.error(`[DB Failover] ${dbType} failed:`, e)
      continue
    }
  }

  return null
}