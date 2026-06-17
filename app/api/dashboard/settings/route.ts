import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: authUser.id },
      include: {
        business: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
      },
      business: customer.business || null,
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profile, business, password } = body

    // Update password if provided
    if (password?.current && password?.new) {
      const customer = await prisma.customer.findUnique({
        where: { id: authUser.id },
      })

      if (!customer?.password) {
        return NextResponse.json({ error: 'Cannot change password for this account' }, { status: 400 })
      }

      const isValid = await bcrypt.compare(password.current, customer.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password.new, 12)

      await prisma.customer.update({
        where: { id: authUser.id },
        data: { password: hashedPassword },
      })
    }

    // Update profile
    if (profile) {
      await prisma.customer.update({
        where: { id: authUser.id },
        data: {
          name: profile.name,
          phone: profile.phone,
        },
      })
    }

    // Update business info
    if (business) {
      const existing = await prisma.business.findUnique({
        where: { customerId: authUser.id },
      })

      if (existing) {
        await prisma.business.update({
          where: { customerId: authUser.id },
          data: business,
        })
      } else {
        await prisma.business.create({
          data: {
            ...business,
            customerId: authUser.id,
          },
        })
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'settings_updated',
        description: 'Updated account settings',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
