import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, details, modelId, success = true, errorMsg = null } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               '127.0.0.1'

    const userAgent = request.headers.get('user-agent') || null

    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null

    const record = await prisma.$queryRawUnsafe<Array<{ log_admin_action: string }>>(
      `SELECT log_admin_action($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      action,
      session.user.id || 'unknown',
      session.user.email,
      ip,
      detailsStr,
      modelId || null,
      userAgent,
      success,
      errorMsg
    )

    return NextResponse.json({ success: true, id: record[0]?.log_admin_action }, { status: 201 })
  } catch (err) {
    console.error('Audit log error:', err)
    return NextResponse.json({ success: false, error: 'Failed to log audit entry' }, { status: 500 })
  }
}
