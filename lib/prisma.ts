// MUST be imported before @prisma/client so the bootstrap overrides
// node:dns.lookup before any neon-style TCP socket is created.
import './dns-bootstrap'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  const log: any[] = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']

  return new PrismaClient({
    log,
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  })
}

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
