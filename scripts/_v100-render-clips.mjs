#!/usr/bin/env node
/**
 * scripts/_v100-render-clips.mjs — V100 cinema driver (WSL only).
 *
 * Renders the 6 "Globalization FAILED!" clips in the PROVEN worker naming
 * convention (hsworker_{videoId}_{i}_00001.mp4) so the existing
 * comfyui-hunyuan-worker picks them up as disk-reuse and does post+upload
 * unchanged. Two phases per clip list: ALL keyframes first (Qwen stays
 * resident), then ALL clips (H3 stays resident) — 12 model swaps avoided.
 *
 *   node _v100-render-clips.mjs <videoId> [clip list, default 1,2,3,4,5,6]
 *
 * Graphs are the PROVEN ones, extracted from this box's own history:
 *  - keyframe: v78/v79 Qwen-Image 2.1 t2i (UNETLoader bf16 + CLIPLoader
 *    qwen3.5_9b pe_t2i + CLIPTextEncode + EmptyLatentImage 768x1344,
 *    euler/normal 20 steps cfg 5)
 *  - clip: h3_reference_video_copy_local.json (MiniMaxH3ReferenceToVideo,
 *    nested ref_images {ref_image_1}, 768x1344 length 129, euler/simple
 *    20 steps cfg 6) — the format that RENDERED (2026-09-26); the flattened
 *    ref_image_1 shape is what TypeError'd.
 * Resumable: existing keyframes/clips are skipped, never re-rendered.
 */
import { existsSync, statSync, readdirSync, copyFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const COMFY = 'http://127.0.0.1:8188'
const OUT = '/home/romel/ComfyUI/output'
const IN = '/home/romel/ComfyUI/input'
const FFPROBE = '/usr/bin/ffprobe'

const VIDEO_ID = process.argv[2] || ''
const CLIPS = (process.argv[3] || '1,2,3,4,5,6').split(',').map(Number).filter((n) => n >= 1 && n <= 6)
const KF_ONLY = process.argv.includes('--kf-only')
if (!VIDEO_ID || !CLIPS.length) {
  console.error('usage: node _v100-render-clips.mjs <videoId> [clips e.g. 1 or 1,2,3,4,5,6]')
  process.exit(1)
}
mkdirSync('/tmp/v100', { recursive: true })
writeFileSync('/tmp/v100/videoId.txt', VIDEO_ID, 'utf8')

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[v100]', ...a)

const STYLE = 'cinematic film still, anamorphic lens 35mm, golden hour sunset haze, film grain, shallow depth of field, highly detailed, photorealistic, 8k, moody, vertical 9:16 composition'
const NEG_IMG = 'cartoon, anime, illustration, low quality, blurry, watermark, text, deformed hands, oversaturated'
const NEG_VID = 'different scene, changed content, distorted anatomy, extra limbs, blurry, low quality, watermark, text overlay, static image'

const KEYFRAMES = {
  1: 'silhouette of buses and a person walking on highway overpass at intense orange sunset, anamorphic sun flare, dark foreground, cinematic haze, ultra realistic',
  2: 'top-down drone aerial of turquoise ocean meeting white sandy beach, waves texture, deep teal water, cinematic drone shot',
  3: 'view from airplane window over endless ocean at sunset, soft window frame, cinematic',
  4: 'silhouette of couple holding hands walking on beach at orange sunset, romantic cinematic, blurred foreground silhouettes, film grain',
  5: 'lush green misty hills of Bangladesh, drone aerial over foggy mountains near sea, cinematic',
  6: 'dark navy blue background with subtle light leak, cinematic end card, no text',
}
const MOTIONS = {
  1: 'the exact same scene as the reference image, subtle slow dolly forward, buses moving left to right on the overpass, haze drifting, golden sunset light, cinematic',
  2: 'the exact same scene as the reference image, slow drone push forward over the ocean toward the beach, waves rolling onto the sand, cinematic',
  3: 'the exact same scene as the reference image, gentle airplane vibration, clouds drifting past the window, warm sunset light, cinematic',
  4: 'the exact same scene as the reference image, couple walking away in slow motion, gentle waves rolling, warm sunset light, cinematic',
  5: 'the exact same scene as the reference image, slow drone orbit over misty green hills, fog drifting through the valleys, cinematic',
  6: 'the exact same scene as the reference image, subtle light leak pulsing, very slow zoom in, minimal motion, dark navy ambience, cinematic',
}

function qwenGraph(i) {
  // V100 VALIDATED graph (smoke D, 2026-09-29, vision-confirmed 9/10 cinematic):
  // the DiT text encoder is qwen3vl_8b — NOT qwen3.5_9b_..._pe_t2i (that's the
  // PROMPT-ENHANCER model; feeding it to the DiT = noise output, verified).
  // Official template params: int8 unet, EmptyLatentImage, steps 25 cfg 1
  // euler/simple. Renders 768x1344 in ~24s.
  return {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: 'qwen_image_2.1_int8_convrot.safetensors', weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_8b_int8_convrot.safetensors', type: 'qwen_image' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: 'qwen_image_2.1_vae_bf16.safetensors' } },
    '4': { class_type: 'TextEncodeQwenImage21', inputs: { clip: ['2', 0], prompt: `${KEYFRAMES[i]}, ${STYLE}`, negative_prompt: '', resolution: 1024 } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 768, height: 1344, batch_size: 1 } },
    '6': { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['4', 0], negative: ['4', 1], latent_image: ['5', 0], seed: 860000 + i * 7, steps: 25, cfg: 1.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0 } },
    '7': { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['3', 0] } },
    '8': { class_type: 'SaveImage', inputs: { images: ['7', 0], filename_prefix: `v100_kf${i}` } },
  }
}

function h3Graph(i) {
  return {
    '1': { class_type: 'LoadImage', inputs: { image: `v100_kf${i}.png` } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors', device: 'cpu', type: 'minimax' } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: NEG_VID, clip: ['2', 0] } },
    '5': { class_type: 'UNETLoader', inputs: { unet_name: 'minimax_h3_ref2va_pruned_fp8_scaled.safetensors', weight_dtype: 'default' } },
    '6': { class_type: 'VAELoader', inputs: { vae_name: 'minimax_h3_video_vae_int8_convrot.safetensors' } },
    '7': { class_type: 'MiniMaxH3ReferenceToVideo', inputs: {
      clip: ['2', 0], vae: ['6', 0],
      prompt: MOTIONS[i],
      width: 768, height: 1344, length: 129,
      ref_image_size: 'match',
      ref_images: { ref_image_1: ['1', 0] },
    } },
    '8': { class_type: 'KSampler', inputs: { model: ['5', 0], positive: ['7', 0], negative: ['4', 0], latent_image: ['7', 1], seed: 870000 + i * 13, steps: 20, cfg: 6.0, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0 } },
    '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['6', 0] } },
    '10': { class_type: 'VHS_VideoCombine', inputs: { images: ['9', 0], frame_rate: 24, loop_count: 0, filename_prefix: `hsworker_${VIDEO_ID}_${i}`, format: 'video/h264-mp4', pix_fmt: 'yuv420p', crf: 19, save_metadata: true, pingpong: false, save_output: true } },
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function submitAndWait(graph, label, timeoutMs = 2.5 * 60 * 60 * 1000) {
  const res = await fetch(`${COMFY}/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: graph }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`/prompt ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const { prompt_id } = await res.json()
  log(`${label}: queued prompt_id=${prompt_id}`)
  const start = Date.now()
  let lastLog = 0
  for (;;) {
    if (Date.now() - start > timeoutMs) throw new Error(`${label}: timed out after ${Math.round(timeoutMs / 60000)} min`)
    await sleep(10000)
    // check queue first — if prompt_id still in queue_running/pending, it's working
    const q = await fetch(`${COMFY}/queue`, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (q?.ok) {
      const qd = await q.json().catch(() => null)
      const inQueue = qd && (qd.queue_running?.some(x => x[1] === prompt_id) || qd.queue_pending?.some(x => x[1] === prompt_id))
      if (inQueue) {
        const elapsed = Math.round((Date.now() - start) / 60000)
        if (elapsed - lastLog >= 10) { log(`${label}: still running (${elapsed}min)`); lastLog = elapsed }
        continue
      }
    }
    // not in queue → check history
    const h = await fetch(`${COMFY}/history/${prompt_id}`, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!h || !h.ok) continue
    const entry = (await h.json().catch(() => null))?.[prompt_id]
    if (!entry) {
      // queued and history empty = still starting; wait one more cycle
      continue
    }
    if (entry.status?.status_str === 'error') throw new Error(`${label}: render error: ${JSON.stringify(entry.status?.messages || {}).slice(0, 300)}`)
    if (entry.status?.completed) return { promptId: prompt_id, outputs: entry.outputs || {} }
  }
}

function newestOutput(prefix, ext) {
  const files = readdirSync(OUT).filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .map((f) => ({ f, m: statSync(join(OUT, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
  return files.length ? join(OUT, files[0].f) : null
}

function ffprobeOk(path, minDur = 4) {
  try {
    const out = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'csv=p=0', path], { encoding: 'utf8' })
    const [dur, size] = out.trim().split(',').map(Number)
    return dur >= minDur && size > 500_000
  } catch { return false }
}

async function ensureKeyframe(i) {
  const dst = join(IN, `v100_kf${i}.png`)
  if (existsSync(dst) && statSync(dst).size > 50_000) { log(`keyframe ${i}: exists, skip`); return }
  log(`keyframe ${i}: rendering (Qwen 768x1344)…`)
  await submitAndWait(qwenGraph(i), `keyframe ${i}`)
  const src = newestOutput(`v100_kf${i}`, '.png')
  if (!src || statSync(src).size < 50_000) throw new Error(`keyframe ${i}: no output png`)
  copyFileSync(src, dst)
  log(`keyframe ${i}: done → ${dst} (${Math.round(statSync(dst).size / 1024)}KB)`)
}

async function ensureClip(i) {
  const clip = join(OUT, `hsworker_${VIDEO_ID}_${i}_00001.mp4`)
  if (existsSync(clip) && statSync(clip).size > 500_000 && ffprobeOk(clip)) { log(`clip ${i}: exists, skip`); return }
  log(`clip ${i}: rendering (H3 768x1344 x129f ~60min)…`)
  const t0 = Date.now()
  await submitAndWait(h3Graph(i), `clip ${i}`)
  if (!existsSync(clip) || !ffprobeOk(clip)) throw new Error(`clip ${i}: missing/invalid output ${clip}`)
  log(`clip ${i}: done in ${Math.round((Date.now() - t0) / 60000)}min → ${clip}`)
}

async function main() {
  for (const i of CLIPS) await ensureKeyframe(i)
  if (KF_ONLY) { log(`KF-ONLY done: ${CLIPS.length} keyframe(s)`); return }
  for (const i of CLIPS) await ensureClip(i)
  log(`ALL DONE: ${CLIPS.length} clip(s) ready for videoId=${VIDEO_ID}`)
}

main().catch((e) => { console.error('[v100] FATAL:', String(e?.message || e).slice(0, 400)); process.exit(1) })
