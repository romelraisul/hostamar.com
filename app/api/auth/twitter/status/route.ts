import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customer = await prisma.customer.findUnique({
    where: { email: session.user.email },
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