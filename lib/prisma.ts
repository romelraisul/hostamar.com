import { PrismaClient } from '@prisma/client'

// Prisma Client with Neon serverless connection pooling
// Neon uses PgBouncer which requires:
// 1. ?pgbouncer=true in connection string (set in DATABASE_URL)
// 2. connection_limit in env var or default 5
// 3. Pool timeout to prevent hanging connections

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
