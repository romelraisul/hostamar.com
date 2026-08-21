export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: authUser.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const notifications = await prisma.notification.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, markAll } = await req.json()
    const user = await prisma.customer.findUnique({
      where: { email: authUser.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (markAll) {
      await prisma.notification.updateMany({
        where: { customerId: user.id },
        data: { read: true }
      })
      return NextResponse.json({ success: true, message: 'সব নোটিফিকেশন পঠিত হয়েছে' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })

    return NextResponse.json({ success: true, message: 'নোটিফিকেশন পঠিত হয়েছে' })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}