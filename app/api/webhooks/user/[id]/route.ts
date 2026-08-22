export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

/**
 * DELETE /api/webhooks/user/[id] — delete one of the user's webhooks
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureSchema()

  const hook = await prisma.userWebhook.findUnique({ where: { id: params.id } })
  if (!hook) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (hook.customerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.userWebhook.delete({ where: { id: hook.id } })
  return NextResponse.json({ ok: true, message: 'Webhook deleted.' })
}
