export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customer = await prisma.customer.findUnique({
    where: { email: authUser.email },
    select: {
      twitterAccessToken: true,
      twitterAccessTokenExpiry: true,
      twitterUserId: true,
      twitterUsername: true,
    },
  })

  const connected = !!(customer?.twitterAccessToken &&
    customer?.twitterAccessTokenExpiry &&
    customer.twitterAccessTokenExpiry > new Date())

  return NextResponse.json({
    connected,
    username: customer?.twitterUsername || null,
    userId: customer?.twitterUserId || null,
    expiresAt: customer?.twitterAccessTokenExpiry?.toISOString() || null,
  })
}