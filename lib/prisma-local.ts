import { PrismaClient } from "@prisma/client"

/**
 * Local TV database (podman postgres on this PC, 127.0.0.1:5433).
 * Uses the SAME generated PrismaClient with a datasource URL override,
 * because the local DB carries the identical TV tables (see lib/ensure-schema.ts SQL).
 *
 * NOTE: only usable from processes running on this PC (agent, scripts).
 * Vercel serverless cannot reach a home-IP database — the site keeps using
 * Neon (prisma) for tiny JSON metadata; heavy TV data lives here.
 */
const globalForPrisma = globalThis as unknown as { prismaLocal: PrismaClient | null }

export function prismaLocal(): PrismaClient | null {
  const url = process.env.LOCAL_DATABASE_URL
  if (!url) return null
  if (!globalForPrisma.prismaLocal) {
    globalForPrisma.prismaLocal = new PrismaClient({
      datasources: { db: { url } },
    })
  }
  return globalForPrisma.prismaLocal
}
