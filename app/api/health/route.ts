import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  let database: { connected: boolean; error?: string } = { connected: false }
  try {
    await prisma.$connect()
    await prisma.customer.count()
    database = { connected: true }
  } catch (error) {
    database.error = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    try {
      await prisma.$disconnect()
    } catch {
      // ignore shutdown issues in health checks
    }
  }

  const payload = {
    status: database.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
      databaseUrlSet: Boolean(process.env.DATABASE_URL),
    },
    version: '1.0.0',
  }

  return NextResponse.json(payload, { status: database.connected ? 200 : 503 })
}
