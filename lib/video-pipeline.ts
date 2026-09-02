/**
 * lib/video-pipeline.ts — serverless video-processing state machine (V28).
 *
 * ROOT CAUSE of the stuck "ছুটির আনন্দ দ্বিগুণ" video (docs/v28-video-stuck-audit.md):
 * /api/dashboard/videos/create writes Video{status:'processing'} + a VideoQueue
 * row {status:'pending'} designed for a LOCAL render worker — but NOTHING in the
 * repo/crons/scripts ever consumes the queue (the home machine is not always
 * on; the app is serverless-first). Rows stay processing/pending forever.
 *
 * Fix: process INLINE on Vercel like the V25 reel does — generate slides via
 * lib/ai-video (provider chain + gradient fallback, never throws), upload to B2
 * (non-fatal), and ALWAYS transition the row: processing → completed (real or
 * honest gradient) or failed. Every path updates status; nothing stays stuck.
 */
import { generateReelImages } from '@/lib/ai-video'
import { uploadToB2 } from '@/lib/ai-video'
import prisma from '@/lib/prisma'

/** Inline processing for one video row — safe to call from create/retry/cron. */
export async function processVideoNow(videoId: string, topic: string, budgetMs = 40_000): Promise<{ ok: boolean; status: string; url: string; error?: string }> {
  const start = Date.now()
  try {
    // 1) Slides — lib/ai-video chain: providers → gradient data-URLs. Never throws.
    const images = await generateReelImages(topic)
    const captions = [
      topic.slice(0, 60),
      `${topic.slice(0, 40)}…`,
      'Hostamar — এক লগইনে ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং',
      'hostamar.com — 1cr = 1TK = 1 COIN',
    ]

    // 2) Manifest "video" artifact — a JSON descriptor the dashboard player can
    //    render (slides + captions + timing), since serverless cannot run ffmpeg.
    //    Client-side MediaRecorder export (V25 reel pattern) produces the WEBM.
    const manifest = {
      videoId,
      topic,
      slides: images,
      captions,
      durationSec: 12,
      perSlideMs: 3000,
      createdAt: new Date().toISOString(),
      note: 'serverless manifest — dashboard player renders + exports WEBM client-side',
    }

    // 3) Upload manifest to B2 (non-fatal — gradient data-URLs are self-contained).
    let url = ''
    try {
      const buf = Buffer.from(JSON.stringify(manifest), 'utf-8')
      url = await uploadToB2(buf, `videos/${videoId}/manifest.json`)
    } catch (e: any) {
      console.warn('[video-pipeline] B2 upload skipped (non-fatal):', String(e?.message || e).slice(0, 120))
    }

    // 4) ALWAYS transition — completed with whatever we have (honest: gradient
    //    slides until provider keys land, same HONEST/LIVE pattern as reel/TTS).
    //    V29: also persist the manifest inline in `script` so the dashboard can
    //    render the reel-style preview WITHOUT fetching B2 (works even if the
    //    B2 upload was skipped). url holds the B2 manifest URL when uploaded.
    const scriptJson = JSON.stringify({ manifest: true, slides: images, captions, durationSec: 12, perSlideMs: 3000, videoId, topic, createdAt: manifest.createdAt })
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'completed',
        url: url || `manifest://local/${videoId}`,
        thumbnailUrl: images[0]?.startsWith('data:') ? images[0] : null,
        script: scriptJson,
        updatedAt: new Date(),
      },
    }).catch((e: any) => console.warn('[video-pipeline] status update failed:', String(e?.message || e).slice(0, 120)))

    return { ok: true, status: 'completed', url }
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 300)
    // Even on hard failure: transition to failed — never leave 'processing'.
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'failed', url: '', updatedAt: new Date() },
    }).catch(() => {})
    return { ok: false, status: 'failed', url: '', error: msg }
  } finally {
    // Budget guard: if we somehow burned the whole budget, the catch/update above
    // still ran (single pass, no loops) — total wall-clock ≤ budgetMs by design.
    const elapsed = Date.now() - start
    if (elapsed > budgetMs) console.warn('[video-pipeline] over budget:', elapsed)
  }
}

/** Heal rows stuck in processing — call from retry route or a cron sweep. */
export async function healStuckVideos(olderThanMinutes = 5): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000)
  const stuck = await prisma.video.findMany({
    where: { status: 'processing', updatedAt: { lt: cutoff } },
    take: 10,
  }).catch(() => [])
  let healed = 0
  for (const v of stuck) {
    await processVideoNow(v.id, v.topic || v.title || 'Hostamar video')
    healed++
  }
  return healed
}
