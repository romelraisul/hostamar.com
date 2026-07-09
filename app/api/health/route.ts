import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Frontend-only health probe (Vercel).
// Under the Vercel-frontend / Railway-backend split (option B), the database
// and API live on the dedicated backend (api.hostamar.com). This route reports
// app liveness on Vercel; it must NOT hammer Neon from Vercel's serverless
// pool (it cannot reach the DB from this environment, and doing so corrupts
// the shared Prisma singleton + exhausts Neon's pooler). The backend's own
// /api/health (on Railway) is the source of truth for DB connectivity.
export async function GET() {
  const payload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      note: 'DB is owned by the dedicated backend (api.hostamar.com). See that endpoint for DB health.',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
      databaseUrlSet: Boolean(process.env.DATABASE_URL),
      apiBackend: process.env.NEXT_PUBLIC_API_URL || 'not set',
    },
    version: '1.0.0',
  }

  return NextResponse.json(payload, { status: 200 })
}
