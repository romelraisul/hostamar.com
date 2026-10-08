import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { enhanceVideoPrompt } from '@/lib/model-in-every-point'
import { deductCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  // PAID (v12): single source of truth — atomic debit + CreditTransaction audit
  // row (written by deductCredits). Insufficient → 402 with exact balance so
  // the client routes to bKash. No free bypass — every catalog service is metered.
  const spend = await deductCredits(user.id, -creditCost, 'spend', `generate ${service.id}`)
  if (!spend.ok) {
    return NextResponse.json(
      {
        error: 'INSUFFICIENT_CREDITS',
        message: 'ক্রেডিট শেষ। bKash 01822417463-এ পেমেন্ট করে ক্রেডিট কিনুন।',
        balance: spend.balance ?? 0,
        required: creditCost,
        bkash: '01822417463',
      },
      { status: 402 },
    )
  }
  const balanceAfter = spend.creditsRemaining

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

  // Skipped: no phantom audit row — deductCredits already wrote the real one
  // (with balanceAfter read back inside the same atomic step).

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
      isFree: false,
      url: PLACEHOLDER_MP4,
      createdAt: video.createdAt,
    },
    creditsRemaining: balanceAfter,
    charged: creditCost,
    isFree: false,
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
