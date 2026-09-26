#!/usr/bin/env node
// scripts/fix-failed-video.mjs — V87: audit + retry the failed customer video.
// WSL ONLY. @libsql/client direct (no prisma/tsx interop issues outside Next).
// Env: DATABASE_URL (Turso URL — same value as the systemd unit's Environment line).
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first') // WSL v6 egress dead — Turso connect timeouts without this
import { createClient } from '@libsql/client'

const url = process.env.DATABASE_URL || ''
if (!url) { console.error('DATABASE_URL missing'); process.exit(1) }
const db = createClient({ url: url.split('?')[0], authToken: url.split('authToken=')[1] || '' })

// 1. AUDIT — the real failed row + its REAL error from VideoQueue
const v = await db.execute({
  sql: "SELECT v.id, v.title, v.status, v.duration, v.url, c.email FROM Video v LEFT JOIN Customer c ON c.id = v.customerId WHERE v.title LIKE '%Globalization FAILED%' AND v.status = 'failed' ORDER BY v.createdAt DESC LIMIT 1",
  args: [],
})
if (!v.rows.length) { console.log('No failed Globalization video found'); process.exit(0) }
const video = v.rows[0]
console.log('VIDEO:', JSON.stringify(video))
const q = await db.execute({
  sql: 'SELECT id, status, attempts, error, renderError FROM VideoQueue WHERE videoId = ? ORDER BY createdAt DESC',
  args: [video.id],
})
console.log('QUEUE_ROWS:', JSON.stringify(q.rows, null, 1))
const realError = q.rows[0]?.error || q.rows[0]?.renderError || 'no error recorded'
console.log('REAL_ERROR:', String(realError).slice(0, 400))

// 2. REQUEUE — pending so the FIXED worker claims it (worker alive: PY /usr/bin/python3,
// FF /usr/bin/ffmpeg, COMFY_ROOT /home/romel/ComfyUI, ESR fallback, presigned B2).
await db.execute({
  sql: "UPDATE VideoQueue SET status = 'pending', renderStatus = NULL, renderError = NULL, error = NULL, attempts = 0, processedAt = NULL WHERE videoId = ?",
  args: [video.id],
})
await db.execute({
  sql: "UPDATE Video SET status = 'processing', url = '' WHERE id = ?",
  args: [video.id],
})
console.log(`REQUEUED ${video.id} -> pending (worker claims <=10s; ~18min: 6 clips x ~3min, then B2 upload -> completed)`)

// 3. H3 DIRECT RENDER — immediate proof via the PROVEN V86 workflow (TE ~105s GPU).
// Wiring verbatim from ~/ComfyUI/workflows/h3_reference_video_copy_local.json —
// only prompt/prefix/seed swapped. (The pasted V87 snippet wired negative to the
// CLIPLoader and dropped clip/vae on node 7 — would 400 value validation.)
const PROMPT_TEXT = 'Globalization FAILED! 70 bochorer purono duniya bhenge porche! OLD WORLD IS BREAKING - phone hate camera - vertical 9:16 Hostamar.com AI for Bangladesh local hosting'
const wf = {
  '1': { class_type: 'LoadImage', inputs: { image: 'h3_ref_identity.png' } },
  '2': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', device: 'cpu', type: 'minimax' } },
  '3': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: PROMPT_TEXT } },
  '4': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: 'different person, changed face, distorted anatomy, extra limbs, blurry, low quality, watermark, text overlay' } },
  '5': { class_type: 'UNETLoader', inputs: { unet_name: 'minimax_h3_ref2va_pruned_fp8_scaled.safetensors', weight_dtype: 'default' } },
  '6': { class_type: 'VAELoader', inputs: { vae_name: 'minimax_h3_video_vae_int8_convrot.safetensors' } },
  '7': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: {
    clip: ['2', 0], height: 1344, length: 129, prompt: PROMPT_TEXT,
    ref_image_size: 'match', vae: ['6', 0], width: 768,
    ref_images: { ref_image_1: ['1', 0] } } },
  '8': { class_type: 'KSampler', inputs: {
    cfg: 6.0, denoise: 1.0, latent_image: ['7', 1], model: ['5', 0],
    negative: ['4', 0], positive: ['7', 0], sampler_name: 'euler',
    scheduler: 'simple', seed: 860002, steps: 20 } },
  '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['6', 0] } },
  '10': { class_type: 'VHS_VideoCombine', inputs: {
    images: ['9', 0], frame_rate: 24, loop_count: 0,
    filename_prefix: `Globalization_FAILED_RETRY_${video.id}`,
    format: 'video/h264-mp4', pingpong: false, save_output: true } },
}
const res = await fetch('http://127.0.0.1:8188/prompt', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: wf }),
})
const rj = await res.json().catch(() => ({}))
if (!res.ok || !rj.prompt_id) {
  console.error(`ComfyUI /prompt ${res.status}: ${JSON.stringify(rj).slice(0, 300)}`)
  process.exit(1)
}
console.log(`H3 prompt ${rj.prompt_id} accepted 200 — MP4 ~/ComfyUI/output/Globalization_FAILED_RETRY_${video.id}_*.mp4 in ~2-4min`)
