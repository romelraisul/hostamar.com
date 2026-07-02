import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'hostamar-jwt-secret-change-in-production'

async function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  let token = ''
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  if (!token) token = req.cookies.get('auth_token')?.value || ''
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string }
  } catch {
    return null
  }
}

/**
 * POST /api/admin/users/:id/role
 * Body: { role: "customer" | "admin" | "superadmin" }
 * Only superadmin can change roles.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser(req)
    if (!me || me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden — superadmin only' }, { status: 403 })
    }
    const { role } = await req.json()
    if (!['customer', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    })
    return NextResponse.json({ success: true, user: updated })
  } catch (error: any) {
    console.error('Role update error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

/**
 * GET /api/admin/users/:id/role
 * Returns { id, email, name, role }
 * Only superadmin or admin can read.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser(req)
    if (!me || (me.role !== 'superadmin' && me.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const user = await prisma.customer.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Role read error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to read role' }, { status: 500 })
  }
}
