import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ensurePinnedChatSchema } from '@/lib/pinned-chat-schema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/ai-services/chats — the user's 📌 pinned chats for the left
 * sidebar: status, credits, last message preview. Permanent (never disappears).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensurePinnedChatSchema()

  const chats = await prisma.serviceChat.findMany({
    where: { userId: user.id, isPinned: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => [])

  const enriched = await Promise.all(chats.map(async (c: any) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: c.orderId } }).catch(() => null)
    const last = await prisma.serviceChatMessage.findFirst({
      where: { chatId: c.id },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)
    return {
      chatId: c.id,
      orderId: c.orderId,
      title: c.title,
      status: order?.status || 'queued',
      creditCost: order?.creditCost || 0,
      createdAt: c.createdAt,
      lastMessage: last?.content?.slice(0, 90) || '',
      serviceId: order?.serviceId || '',
    }
  }))

  return NextResponse.json({ success: true, chats: enriched, total: enriched.length })
}
