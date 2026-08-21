export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.customer.update({
    where: { email: authUser.email },
    data: {
      twitterAccessToken: null,
      twitterAccessTokenExpiry: null,
      twitterUserId: null,
      twitterUsername: null,
    },
  })

  return NextResponse.json({ success: true, message: 'Twitter disconnected' })
}