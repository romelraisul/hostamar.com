import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { pinnedChatMessage } from '@/lib/pinned-chat'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET  /api/ai-services/chat/[chatId]/messages — full history (permanent)
 * POST /api/ai-services/chat/[chatId]/messages — customer message:
 *   collecting_material → AI parses fields → generating → delivered,
 *   after delivery each message is a revision (-5cr, same thread forever).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { chatId } = await params

  const chat = await prisma.serviceChat.findUnique({ where: { id: chatId } }).catch(() => null)
  if (!chat || chat.userId !== user.id) return NextResponse.json({ error: 'CHAT_NOT_FOUND' }, { status: 404 })

  const order = await prisma.serviceOrder.findUnique({ where: { id: chat.orderId } }).catch(() => null)
  const messages = await prisma.serviceChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  }).catch(() => [])

  return NextResponse.json({
    success: true,
    chat: { chatId, title: chat.title, status: order?.status || 'queued', resultUrl: order?.resultUrl, resultJson: order?.resultJson },
    messages: messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, attachments: m.attachments, creditCost: m.creditCost, createdAt: m.createdAt })),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const rl = slidingWindow(`pinned:${getClientIpEdge(req)}`, 30, 60_000)
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit — try again shortly' }, { status: 429 })

  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { chatId } = await params

  const body = await req.json().catch(() => ({}))
  const content = String(body.content || '').slice(0, 4000)
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : undefined
  if (!content.trim() && !attachments?.length) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const r = await pinnedChatMessage(user, chatId, content, attachments)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ success: true, aiMessage: r.aiMessage, status: r.status })
}
