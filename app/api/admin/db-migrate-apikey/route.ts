import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'

// TEMPORARY migration route — creates the ApiKey / ApiRequestLog tables that
// were added to schema.prisma but never migrated to the production DB.
// Guarded by admin auth. DELETE after use.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // ApiRequestLog first (referenced by ApiKey FK)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApiRequestLog" (
        "id" TEXT NOT NULL,
        "apiKeyId" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "method" TEXT NOT NULL,
        "statusCode" INTEGER NOT NULL,
        "responseTime" INTEGER NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ApiRequestLog_apiKeyId_createdAt_idx"
        ON "ApiRequestLog" ("apiKeyId", "createdAt");
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "canGenerateImage" BOOLEAN NOT NULL DEFAULT true,
        "canGenerateVideo" BOOLEAN NOT NULL DEFAULT true,
        "canUseChat" BOOLEAN NOT NULL DEFAULT true,
        "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 10,
        "totalRequests" INTEGER NOT NULL DEFAULT 0,
        "lastUsedAt" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey" ("key");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ApiKey_customerId_idx" ON "ApiKey" ("customerId");
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_apiKeyId_fkey"
        FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `)

    return NextResponse.json({ ok: true, message: 'ApiKey + ApiRequestLog tables created' })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 })
  }
}
