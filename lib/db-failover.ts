import { createClient } from '@libsql/client/web'
import { Pool } from '@neondatabase/serverless'
import { createPool } from '@vercel/postgres'

export type DBType = 'turso' | 'neon' | 'supabase' | 'local'

export interface DBHealth {
  turso: 'connected' | 'disconnected'
  neon: 'connected' | 'disconnected'
  supabase: 'connected' | 'disconnected'
  local: 'connected' | 'disconnected'
  active: DBType
  syncedAt: string
}

interface DBClients {
  turso?: ReturnType<typeof createClient>
  neon?: Pool
  supabase?: Pool
  local?: Pool
}

let clients: DBClients = {}
let lastHealthCheck = 0
let cachedHealth: DBHealth | null = null
const HEALTH_CACHE_MS = 30000

function getTursoClient() {
  if (clients.turso) return clients.turso
  const raw = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!raw) return null
  const url = raw.replace(/^libsql:\/\//, 'https://')
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

async function checkTurso(): Promise<boolean> {
  try {
    const client = getTursoClient()
    if (!client) return false
    const result = await Promise.race([
      client.execute('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    return !!result
  } catch {
    return false
  }
}

async function checkNeon(): Promise<boolean> {
  try {
    const client = getNeonClient()
    if (!client) return false
    const result = await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    return !!result
  } catch {
    return false
  }
}

async function checkSupabase(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    if (!client) return false
    const result = await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    return !!result
  } catch {
    return false
  }
}

async function checkLocal(): Promise<boolean> {
  try {
    const client = getLocalClient()
    if (!client) return false
    const result = await Promise.race([
      client.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    return !!result
  } catch {
    return false
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

  let active: DBType = 'turso'
  if (turso) active = 'turso'
  else if (neon) active = 'neon'
  else if (supabase) active = 'supabase'
  else if (local) active = 'local'

  cachedHealth = {
    turso: turso ? 'connected' : 'disconnected',
    neon: neon ? 'connected' : 'disconnected',
    supabase: supabase ? 'connected' : 'disconnected',
    local: local ? 'connected' : 'disconnected',
    active,
    syncedAt: new Date().toISOString(),
  }
  lastHealthCheck = now
  return cachedHealth
}

export async function getActiveDB(): Promise<{ type: DBType; client: any } | null> {
  const health = await getDBHealth()

  if (health.turso === 'connected') {
    return { type: 'turso', client: getTursoClient() }
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
        client = getTursoClient()
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