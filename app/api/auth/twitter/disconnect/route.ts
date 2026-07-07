import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.customer.update({
    where: { email: session.user.email },
    data: {
      twitterAccessToken: null,
      twitterAccessTokenExpiry: null,
      twitterUserId: null,
      twitterUsername: null,
    },
  })

  return NextResponse.json({ success: true, message: 'Twitter disconnected' })
}