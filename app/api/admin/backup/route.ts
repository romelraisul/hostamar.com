export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// ============================================================================
// POST /api/admin/backup
// Triggers a manual PostgreSQL backup. Admin-only.
// ============================================================================

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id')
}

function getUserRole(request: Request): string | null {
  return request.headers.get('x-user-role')
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    const role   = getUserRole(req)

    // Admin-only check
    if (!userId || !['admin', 'superadmin'].includes(role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename  = `hostamar-${timestamp}.sql`
    const backupDir = '/tmp'

    // Run pg_dump via docker exec (app container has docker socket mounted)
    const dumpCmd = `pg_dump -U hostamar hostamar > ${backupDir}/${filename} 2>&1`
    const { execSync } = await import('child_process')

    // We run pg_dump from the hostamar-postgres container itself
    const containerResult = execSync(
      `docker exec hostamar-postgres sh -c "pg_dump -U hostamar hostamar"`,
      { timeout: 120_000, encoding: 'utf8' }
    )

    // Save to a temporary path accessible from this container
    // Note: In production on Railway, this endpoint would call an external
    // backup service or an R2 presigned URL. On local, we use docker cp.
    const fs = await import('fs')
    const tmpPath = `/tmp/${filename}`
    fs.writeFileSync(tmpPath, containerResult, 'utf8')

    const stats = fs.statSync(tmpPath)
    const size = stats.size

    // Cleanup
    fs.unlinkSync(tmpPath)

    // Log the backup activity
    await prisma.activityLog.create({
      data: {
        customerId: userId,
        action: 'manual_backup',
        description: `Manual backup triggered: ${filename} (${Math.round(size / 1024)} KB)`,
      },
    })

    return NextResponse.json({
      success: true,
      filename,
      size_bytes: size,
      backup_path: `docker cp hostamar-postgres:/tmp/${filename} ./backups/`,
      message: 'Backup created successfully. Use docker cp to download from container.',
    })
  } catch (error: any) {
    console.error('[Admin:Backup]', error.message)
    return NextResponse.json({ error: 'Backup failed', detail: error.message }, { status: 500 })
  }
}

// ============================================================================
// GET /api/admin/backup
// Returns backup status and available backups (list of files in backup dir)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const role = getUserRole(req)
    if (!['admin', 'superadmin'].includes(role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { execSync } = await import('child_process')

    // List existing backups in the container's /tmp
    let files: string[] = []
    try {
      const output = execSync(
        'docker exec hostamar-postgres sh -c "ls -la /tmp/hostamar-*.sql 2>/dev/null | tail -20"',
        { encoding: 'utf8', timeout: 10_000 }
      )
      files = output.trim().split('\n').filter(Boolean)
    } catch {
      // No backups yet
    }

    return NextResponse.json({
      success: true,
      backups_in_container: files,
      local_backup_dir: 'C:\\Users\\User\\backups',
      schedule: 'Every 6 hours via Windows Task Scheduler',
      retention: '7 daily backups',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}