import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { enhanceVideoPrompt } from '@/lib/model-in-every-point'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const PLACEHOLDER_MP4 = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4'

/**
 * POST /api/generate — generate a service deliverable from the 50-service catalog.
 * Body: { serviceId, prompt, templateId? }
 * Flow: auth → lookup service + creditCost → balance check (402 + bKash on fail)
 *       → deduct → CreditTransaction audit → prisma.video (processing)
 *       → simulated render (placeholder MP4 until GPU worker wired)
 *       → video completed with URL → return video.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req).catch(() => null)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const serviceId: string = String(body.serviceId || 's01')
  const prompt: string = String(body.prompt || '').slice(0, 500)

  const service = await prisma.serviceCatalog.findUnique({ where: { id: serviceId } }).catch(() => null)
  if (!service) return NextResponse.json({ error: 'SERVICE_NOT_FOUND', serviceId }, { status: 404 })
  const creditCost = service.creditCost

  // FULL FREE (v7): no balance check, no deduction, no 402 — video generation
  // is free for testing. Balance stays 6000.
  const customer = await prisma.customer.findUnique({
    where: { id: user.id },
    select: { credits: true },
  }).catch(() => null)
  const balanceAfter = Number(customer?.credits ?? 6000)

  // MODEL IN EVERY POINT: expand the customer prompt into a render brief
  // (non-blocking: empty string if chain degraded — flow never breaks).
  const enhancedPrompt = await enhanceVideoPrompt(service.name, prompt || service.nameBn)

  const video = await prisma.video.create({
    data: {
      customerId: user.id,
      title: (prompt || service.nameBn).slice(0, 60),
      prompt: prompt || null,
      script: enhancedPrompt || null,
      templateId: service.id,
      status: 'processing',
      language: 'bn',
      duration: 30,
      format: 'mp4',
      resolution: '720p',
    },
  })

  // Audit row — non-fatal: prod CreditTransaction is the OLD accountId shape,
  // so a customerId-based Prisma insert may be rejected; log raw instead.
  await prisma.$executeRaw`
    INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter", "videoId")
    VALUES (${'ctx_' + Date.now().toString(36)}, ${user.id}, 0, 'free:generate', ${`FREE generate ${service.id}`}, ${Math.round(balanceAfter)}, ${video.id})
  `.catch(() => null)

  // Simulated render → completed with placeholder MP4 (B2 upload hook point:
  // when GPU worker is live, replace this URL with the B2 object key).
  await prisma.video.update({
    where: { id: video.id },
    data: { status: 'completed', url: PLACEHOLDER_MP4, thumbnailUrl: '/og-image.png' },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    video: {
      id: video.id,
      title: video.title,
      serviceId: service.id,
      serviceName: service.name,
      serviceNameBn: service.nameBn,
      creditCost,
      status: 'completed',
      isFree: true,
      url: PLACEHOLDER_MP4,
      createdAt: video.createdAt,
    },
    creditsRemaining: balanceAfter, isFree: true, charged: 0,
  })
}

/**
 * GET /api/generate?serviceId=s01 — service details for the /generate page
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get('serviceId') || 's01'
  const service = await prisma.serviceCatalog.findUnique({ where: { id: serviceId } }).catch(() => null)
  if (!service) return NextResponse.json({ service: null }, { status: 404 })
  return NextResponse.json({
    service: {
      id: service.id,
      name: service.name,
      nameBn: service.nameBn,
      benefitBn: service.benefitBn,
      creditCost: service.creditCost,
      dollarRange: service.dollarRange,
      icon: service.icon,
    },
  })
}
