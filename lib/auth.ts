import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function getAuthUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const customer = await prisma.customer.findUnique({
    where: { email: session.user.email },
  })

  if (!customer) {
    return null
  }

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    customer,
  }
}

export type AuthUser = Exclude<Awaited<ReturnType<typeof getAuthUser>>, null>
