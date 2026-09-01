export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateReelImages, generateBanglaVoiceover } from '@/lib/ai-video'
import { getBanglaScript, REEL_CAPTIONS } from '@/lib/tts'

/**
 * POST /api/video/reel/generate — AI Reel (V25).
 * Body: { type: 'graphene' | 'custom', script?, captions?, logoUrl? }
 * Auth: getAuthUser() (cookie/Bearer) OR x-user-id header for public preview.
 * Returns 4 slide images + Bangla captions + voiceover plan. Never 500: image
 * chain degrades to gradient slides, voiceover to browser TTS.
 */
export async function POST(req: NextRequest) {
  let user: { id: string } | null = null
  try { user = await getAuthUser(req) } catch { user = null }
  const userId = user?.id || req.headers.get('x-user-id') || ''
  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHENTICATED', message: 'Login or send x-user-id for preview' },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body?.type || 'graphene')
  if (type !== 'graphene' && type !== 'custom') {
    return NextResponse.json({ error: 'Invalid type. Choose: graphene, custom' }, { status: 400 })
  }

  const script = getBanglaScript(type, body?.script)
  const captions: string[] = Array.isArray(body?.captions) && body.captions.length
    ? body.captions.slice(0, 4).map((c: any) => String(c).slice(0, 120))
    : REEL_CAPTIONS

  // Images: chain (OpenAI → Replicate → gradients), 1h cache.
  const imagePrompt = type === 'custom'
    ? String(body?.script || 'custom Bangla reel').slice(0, 200)
    : 'plastic waste transformed into graphene, flash joule heating, green chemistry, Bangladesh science reel'
  const images = await generateReelImages(imagePrompt)

  // Voiceover: ElevenLabs → browser TTS.
  const voice = await generateBanglaVoiceover(script)

  // Optional ledger — non-fatal if prisma unavailable.
  try {
    const prisma = (await import('@/lib/prisma')).default
    await (prisma as any).agentTask.create({
      data: {
        id: `reel_${Date.now().toString(36)}`,
        type: 'reel-generate',
        status: 'completed',
        input: { type, userId: userId.slice(0, 40) } as any,
        output: { images: images.length, useBrowserTTS: voice.useBrowserTTS } as any,
      },
    }).catch(() => {})
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok: true,
    images,
    captions,
    script,
    audioUrl: voice.audioUrl,
    useBrowserTTS: voice.useBrowserTTS,
    duration: 12,
    logoUrl: String(body?.logoUrl || ''),
    userId: userId === 'audit-customer-001' ? userId : undefined,
  }, {
    headers: { 'Cache-Control': 'no-cache, no-store, max-age=0' }, // dynamic per request
  })
}
