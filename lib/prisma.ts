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
  
  if (!url) {
    throw new Error('DATABASE_URL not configured — Prisma client cannot be created')
  }
  
  // ponytail: schema is sqlite (Turso/libsql). All paths use PrismaLibSQL.
  // postgresql:// URLs (local dev) are redirected to a local file DB so the
  // same sqlite schema works everywhere. Upgrade path: point local dev at
  // the cloud Turso instance instead of redirecting.
  let cleanUrl: string
  let authToken: string
  if (url.startsWith('libsql://') || url.startsWith('file:')) {
    cleanUrl = url.split('?')[0]
    authToken = url.split('authToken=')[1] || ''
  } else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    cleanUrl = 'file:/home/romel/hostamar-local.db'
    authToken = ''
  } else {
    cleanUrl = url.split('?')[0]
    authToken = url.split('authToken=')[1] || ''
  }
  const libsql = createClient({ url: cleanUrl, authToken })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// ponytail: truly lazy — no throw on import, only on first actual method call.
// Vercel build-time imports this module without DATABASE_URL; checkout route
// checks hasDb at runtime and only calls prisma if DB is configured.
let prismaInstance: PrismaClient | null = null
let prismaInitError: Error | null = null

function getPrisma(): PrismaClient {
  if (prismaInitError) throw prismaInitError
  if (!prismaInstance) {
    try {
      prismaInstance = createPrismaClient()
    } catch (e) {
      prismaInitError = e as Error
      throw prismaInitError
    }
  }
  return prismaInstance
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined // avoid Promise-like coercion
    const client = getPrisma()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
