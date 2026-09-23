// MUST be imported before @prisma/client so the bootstrap overrides
// node:dns.lookup before any neon-style TCP socket is created.
import './dns-bootstrap'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  // Turso/libSQL adapter — works in both edge and node runtimes
  const url = process.env.DATABASE_URL?.split('?')[0] || ''
  const authToken = process.env.DATABASE_URL?.split('authToken=')[1] || ''

  const libsql = createClient({ url, authToken })
  const adapter = new PrismaLibSQL(libsql)

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// ponytail: lazy Proxy init — build-time page-data collection imports this module
// with no DATABASE_URL (Vercel-only var), and eager createClient({url:''}) throws.
// Upgrade path: plain singleton if DATABASE_URL is always present at import time.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = prismaClientSingleton()
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
