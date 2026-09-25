// MUST be imported before @prisma/client so the bootstrap overrides
// node:dns.lookup before any neon-style TCP socket is created.
import './dns-bootstrap'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || ''
  
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    // Neon / PostgreSQL — use pg adapter
    const pool = new pg.Pool({ connectionString: url, max: 1 })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({
      adapter,
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  
  if (url.startsWith('libsql://') || url.startsWith('file:')) {
    // Turso / libSQL — use libsql adapter
    const cleanUrl = url.split('?')[0]
    const authToken = url.split('authToken=')[1] || ''
    const libsql = createClient({ url: cleanUrl, authToken })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({
      adapter,
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  
  // No DATABASE_URL or unsupported — return client that fails gracefully
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// ponytail: lazy Proxy init — build-time page-data collection imports this module
// with no DATABASE_URL (Vercel-only var), and eager createClient({url:''}) throws.
// Upgrade path: plain singleton if DATABASE_URL is always present at import time.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient()
  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
