export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, currentPassword, newPassword } = await req.json()
    const updates: Record<string, any> = {}

    if (name) updates.name = name

    if (currentPassword && newPassword) {
      const customer = await prisma.customer.findUnique({ where: { id: authUser.id } })
      if (!customer) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const valid = await bcrypt.compare(currentPassword, customer.password)
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }

      updates.password = await bcrypt.hash(newPassword, 12)
    }

    await prisma.customer.update({
      where: { id: authUser.id },
      data: updates,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update profile error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}