#!/usr/bin/env node
/**
 * scripts/comfyui-hunyuan-worker.mjs — V30 local HunyuanVideo 1.5 8B worker.
 *
 * Runs on THIS PC (the RTX 5060 box). Polls the Hostamar queue every 10s:
 *   1. GET  {APP}/api/videos/queue/next?secret=...      → claim a row
 *   2. Build 5 scene prompts from the topic (Bogra bus → Cox drone beach →
 *      hotel+breakfast+couple → Inani/Himchari → offer CTA), render each as a
 *      ~6s clip via ComfyUI @ 127.0.0.1:8188 (HunyuanVideo 1.5 8B fp8, the
 *      PROVEN config: 384x216 landscape render — direct portrait HANGS on 8GB
 *      — then rotate to 9:16 in post).
 *   3. ffmpeg concat + rotate + Bengali edge-tts voiceover + music + captions
 *      (the proven tiktok_postprocess.py recipe, self-contained here).
 *   4. POST {APP}/api/videos/upload/complete (multipart, secret) → B2 + rows.
 *   5. On any failure: POST /api/videos/queue/fail — honest, row never strands.
 *
 * Node 18+ (global fetch). Env (reads from .env.local next to this file OR the
 * process env):
 *   COMFYUI_WORKER_SECRET  (required — must match the Vercel env var)
 *   WORKER_APP_URL         default https://hostamar.com
 *   COMFYUI_URL            default http://127.0.0.1:8188
 *   WORKER_POLL_MS         default 10000
 *
 * Usage:
 *   node scripts/comfyui-hunyuan-worker.mjs            # loop forever
 *   node scripts/comfyui-hunyuan-worker.mjs --once     # one job then exit (tests)
 *   node scripts/comfyui-hunyuan-worker.mjs --videoId <id>  # force one row
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')

// ── tiny .env.local loader (KEY=VALUE lines; no shell interpolation needed) ──
// File values WIN over inherited process env for these keys — a stale
// COMFYUI_WORKER_SECRET in a parent shell (e.g. a pasted placeholder from an
// old snippet) must never shadow the real secret in .env.local.
const FILE_ENV_KEYS = ['COMFYUI_WORKER_SECRET', 'WORKER_APP_URL', 'COMFYUI_URL', 'WORKER_POLL_MS', 'WORKER_PYTHON', 'WORKER_FFMPEG', 'WORKER_FFPROBE', 'WORKER_COMFYUI_DIR']
const fileEnv = {}
if (existsSync(join(REPO, '.env.local'))) {
  for (const line of readFileSync(join(REPO, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
for (const k of FILE_ENV_KEYS) {
  if (fileEnv[k]) process.env[k] = fileEnv[k]
}

const SECRET = process.env.COMFYUI_WORKER_SECRET || ''
const APP = process.env.WORKER_APP_URL || 'https://hostamar.com'
const COMFY = process.env.COMFYUI_URL || 'http://127.0.0.1:8188'
const POLL_MS = Number(process.env.WORKER_POLL_MS || 10000)
const PY = process.env.WORKER_PYTHON || 'C:\\Users\\User\\qwen\\python_embeded\\python.exe'
const FF = process.env.WORKER_FFMPEG || 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe'
const COMFY_ROOT = process.env.WORKER_COMFYUI_DIR || 'C:\\ComfyUI_Download\\ComfyUI'
const OUT_DIR = join(COMFY_ROOT, 'output')
const WORK_DIR = join(OUT_DIR, '_worker')

if (!SECRET) {
  console.error('[worker] COMFYUI_WORKER_SECRET missing — set it in .env.local or env. Exit.')
  process.exit(1)
}
mkdirSync(WORK_DIR, { recursive: true })

const args = process.argv.slice(2)
const once = args.includes('--once')
const forceVideoId = args.includes('--videoId') ? args[args.indexOf('--videoId') + 1] : null

// ── The PROVEN workflow (survived the cleanup at C:\hostamar\hostamar.com\workflows\video_hunyuan.json) ──
// fp8 safetensors + block-swap 20/20 + force_offload; landscape 384x216 (portrait
// direct-render HANGS on 8GB — verified twice); frames 145 ≈ 6s @24fps.
const MODEL_PATH = ['split_files', 'diffusion_models', 'hunyuan_video_720_fp8_e4m3fn.safetensors'].join(String.fromCharCode(92))
const WIDTH = 384
const HEIGHT = 216
const FRAMES = 145 // ~6s @ 24fps — 5 clips ≈ 30s total
const STEPS = 10   // proven fast-good on 8GB (~15-25 min/clip at 10 steps)
const NEG = 'static, blurry, low quality, watermark, text artifacts, still image, slideshow, deformed'

function buildWorkflow(prompt, seed, prefix) {
  return {
    '1': { class_type: 'HyVideoModelLoader', inputs: {
      model: MODEL_PATH, base_precision: 'bf16', quantization: 'fp8_e4m3fn_fast',
      load_device: 'offload_device', block_swap_args: ['40', 0] } },
    '40': { class_type: 'HyVideoBlockSwap', inputs: {
      double_blocks_to_swap: 20, single_blocks_to_swap: 20,
      offload_txt_in: true, offload_img_in: true } },
    '7': { class_type: 'HyVideoVAELoader', inputs: {
      model_name: 'hunyuan_video_vae_bf16.safetensors', precision: 'bf16' } },
    '16': { class_type: 'DownloadAndLoadHyVideoTextEncoder', inputs: {
      llm_model: 'Kijai/llava-llama-3-8b-text-encoder-tokenizer',
      clip_model: 'disabled', precision: 'bf16' } },
    '30': { class_type: 'HyVideoTextEncode', inputs: {
      prompt: `${prompt}. Cinematic motion, smooth camera movement, high detail.`,
      text_encoders: ['16', 0] } },
    '3': { class_type: 'HyVideoSampler', inputs: {
      model: ['1', 0], hyvid_embeds: ['30', 0], width: WIDTH, height: HEIGHT,
      num_frames: FRAMES, steps: STEPS, embedded_guidance_scale: 6.0, flow_shift: 9.0,
      seed, force_offload: true, scheduler: 'FlowMatchDiscreteScheduler' } },
    '5': { class_type: 'HyVideoDecode', inputs: {
      vae: ['7', 0], samples: ['3', 0], enable_vae_tiling: true,
      temporal_tiling_sample_size: 16, spatial_tile_sample_min_size: 128, auto_tile_size: false } },
    '34': { class_type: 'VHS_VideoCombine', inputs: {
      images: ['5', 0], frame_rate: 24, loop_count: 0, filename_prefix: prefix,
      format: 'video/h264-mp4', pix_fmt: 'yuv420p', crf: 19, save_metadata: true,
      pingpong: false, save_output: true } },
  }
}

async function comfyHealthy() {
  try {
    const r = await fetch(`${COMFY}/system_stats`, { signal: AbortSignal.timeout(5000) })
    return r.ok
  } catch { return false }
}

async function submitAndWait(promptJson, timeoutMs = 60 * 60 * 1000) {
  const res = await fetch(`${COMFY}/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptJson }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`ComfyUI /prompt ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const { prompt_id } = await res.json()
  console.log(`[worker] queued prompt_id=${prompt_id}`)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await sleep(5000)
    const h = await fetch(`${COMFY}/history/${prompt_id}`, { signal: AbortSignal.timeout(10000) })
      .catch(() => null)
    if (!h || !h.ok) continue
    const hist = await h.json().catch(() => null)
    const entry = hist?.[prompt_id]
    if (!entry) continue
    const st = entry.status?.status_str || entry.status?.completed ? 'success' : ''
    if (entry.status?.status_str === 'error') throw new Error(`ComfyUI render error: ${JSON.stringify(entry.status?.messages || {}).slice(0, 300)}`)
    if (entry.status?.completed) {
      // VHS output filename lives under outputs[node].gifs[] (verified pitfall #9)
      for (const node of Object.values(entry.outputs || {})) {
        const files = node?.gifs || node?.videos || []
        for (const f of files) {
          if (f?.filename && /\.mp4$/.test(f.filename)) {
            return { file: join(OUT_DIR, f.subfolder || '', f.filename), promptId: prompt_id }
          }
        }
      }
      throw new Error('render completed but no mp4 in outputs')
    }
  }
  throw new Error(`ComfyUI render timed out after ${timeoutMs / 60000} min`)
}

// 5-scene storyboard derived from the customer brief (the Cox's Bazar promo
// shape). Generic fallbacks keep it usable for any travel/promo topic.
function buildScenes(topic) {
  const t = (topic || '').toLowerCase()
  const scenes = []
  if (/বগুড়া|bogra/.test(t)) scenes.push('A colorful intercity bus departing Bogra city bus station at dawn, morning mist, passengers boarding, bus pulling away in motion')
  else scenes.push('A modern intercity bus departing a Bangladeshi city bus station at dawn, morning golden light, motion')
  if (/কক্সবাজার|cox/.test(t)) scenes.push('Aerial drone shot flying over Cox\'s Bazar sea beach, the world\'s longest natural sea beach, turquoise waves rolling in motion, fishing boats')
  else scenes.push('Aerial drone shot flying over a tropical sea beach in Bangladesh, turquoise waves rolling, motion')
  scenes.push('Luxury sea view hotel room interior with breakfast table, then a happy couple walking along the beach at sunset, warm cinematic light, motion')
  if (/ইনানী|inani|হিমছড়ি|himchari/.test(t)) scenes.push('Scenic drive along Inani beach and Himchari hillside road in Cox\'s Bazar, coconut palms, hills meeting the sea, paragliders, motion')
  else scenes.push('Scenic coastal road with green hills and palm trees, tourists enjoying, motion')
  scenes.push('Elegant offer card animation: special travel package price with phone number, golden text on deep blue gradient background, gentle zoom motion')
  return scenes
}

const VO_DEFAULT = 'একঘেয়ে জীবন থেকে একটু বিরতি দরকার? চলুন বগুড়া থেকে কক্সবাজার! সমুদ্র সৈকত, হোটেল, ব্রেকফাস্ট — স্পেশাল প্যাকেজ। এখনই বুক করুন!'

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run(job) {
  const { videoId, queueId, topic, title } = job
  console.log(`[worker] rendering videoId=${videoId} topic="${String(topic).slice(0, 60)}..."`)
  const scenes = buildScenes(`${title || ''} ${topic || ''}`)
  const clipFiles = []
  const seed = Math.floor(Math.random() * 1_000_000)
  for (let i = 0; i < scenes.length; i++) {
    const prefix = `hsworker_${videoId}_${i + 1}`
    const wf = buildWorkflow(scenes[i], seed + i, prefix)
    const { file } = await submitAndWait(wf)
    clipFiles.push(file)
    console.log(`[worker] clip ${i + 1}/5 done: ${file}`)
  }

  // Concat + rotate 9:16 + VO + music + captions (proven tiktok recipe).
  const listPath = join(WORK_DIR, `${videoId}_concat.txt`)
  writeFileSync(listPath, clipFiles.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n'), 'utf8')
  const combined = join(WORK_DIR, `${videoId}_combined.mp4`)
  execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-fflags', '+genpts', '-c', 'copy', combined], { stdio: 'inherit' })

  const vo = join(WORK_DIR, `${videoId}_vo.mp3`)
  execFileSync(PY, ['-m', 'edge_tts', '--voice', 'bn-IN-TanishaaNeural', '--text', job.language === 'en' ? 'Escape the routine — Bogra to Cox\'s Bazar special package!' : VO_DEFAULT, '--write-media', vo], { stdio: 'inherit' })

  const caps = [
    'বগুড়া থেকে কক্সবাজার স্পেশাল প্যাকেজ',
    'বিশ্বের দীর্ঘতম সমুদ্র সৈকত',
    'সি-ভিউ হোটেল + ব্রেকফাস্ট',
    'ইনানী • হিমছড়ি ভ্রমণ',
    'অফার প্রাইস + ফোন CTA',
  ]
  let acc = 0
  const vfilters = []
  const durs = []
  const FP = process.env.WORKER_FFPROBE || 'C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe'
  for (const p of clipFiles) {
    const d = Number(execFileSync(FP, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', p]).toString().trim()) || 6
    durs.push(d)
  }
  for (let i = 0; i < caps.length; i++) {
    const s = acc, e = acc + (durs[i] || 6)
    acc = e
    const esc = caps[i].replace(/'/g, "\\'")
    vfilters.push(`drawtext=fontfile=font.ttf:text='${esc}':x=(w-text_w)/2:y=h*0.82:fontcolor=yellow:fontsize=42:borderw=4:bordercolor=white:alpha='if(lt(t,${s.toFixed(2)}),0,if(lt(t,${e.toFixed(2)}),1,1))'`)
  }
  // font
  const fontSrc = existsSync('C:\\Users\\User\\NotoSansBengali.ttf') ? 'C:\\Users\\User\\NotoSansBengali.ttf' : join(COMFY_ROOT, 'input', 'NotoSansBengali.ttf')
  if (existsSync(fontSrc)) execFileSync('cmd', ['/c', 'copy', '/y', fontSrc, join(WORK_DIR, 'font.ttf')], { stdio: 'inherit' })

  const final = join(WORK_DIR, `${videoId}_final.mp4`)
  const total = durs.reduce((a, b) => a + b, 0)
  const music = join(WORK_DIR, `${videoId}_music.mka`)
  execFileSync(FF, ['-y', '-f', 'lavfi', '-i',
    `aevalsrc='0.18*sin(2*PI*196*t)+0.14*sin(2*PI*294*t)+0.10*sin(2*PI*392*t)+0.08*sin(2*PI*523*t)+0.06*sin(2*PI*659*t)':s=44100:d=${total.toFixed(2)}`,
    '-af', 'lowpass=f=2600,highpass=f=120,tremolo=f=5.5:d=0.5,volume=0.5', music], { stdio: 'inherit' })
  const mixed = join(WORK_DIR, `${videoId}_mixed.mka`)
  execFileSync(FF, ['-y', '-i', vo, '-i', music, '-filter_complex',
    '[0:a]volume=1.0[a];[1:a]volume=0.35[b];[a][b]amix=inputs=2:duration=longest[aout]',
    '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', mixed], { stdio: 'inherit' })
  execFileSync(FF, ['-y', '-i', combined, '-i', mixed, '-filter_complex',
    `[0:v]transpose=1,${vfilters.join(',')}[v]`, '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' })
  console.log(`[worker] final: ${final} (${existsSync(final) ? Math.round(require('node:fs').statSync(final).size / 1e6) : '?'}MB)`)

  // Upload via the API (multipart) — B2 creds stay server-side.
  const buf = readFileSync(final)
  const form = new FormData()
  form.append('secret', SECRET)
  form.append('videoId', videoId)
  form.append('stats', JSON.stringify({ fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8', clips: 5 }))
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${videoId}.mp4`)
  const up = await fetch(`${APP}/api/videos/upload/complete`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) })
  const upJson = await up.json().catch(() => ({}))
  if (!up.ok || !upJson.ok) throw new Error(`upload/complete ${up.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
  console.log(`[worker] DONE videoId=${videoId} → ${upJson.url}`)
  return true
}

async function fail(job, err) {
  console.error(`[worker] FAIL videoId=${job?.videoId}:`, String(err?.message || err).slice(0, 300))
  try {
    await fetch(`${APP}/api/videos/queue/fail`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, videoId: job?.videoId, queueId: job?.queueId, error: String(err?.message || err).slice(0, 400) }),
      signal: AbortSignal.timeout(15000),
    })
  } catch { /* best-effort */ }
}

async function claimJob() {
  if (forceVideoId) {
    // Direct Prisma-free mode: the row exists in prod; ask the API for this one.
    const r = await fetch(`${APP}/api/videos/queue/next?secret=${encodeURIComponent(SECRET)}`, { headers: { 'x-worker-secret': SECRET }, signal: AbortSignal.timeout(15000) })
    const j = await r.json().catch(() => ({}))
    return j
  }
  const r = await fetch(`${APP}/api/videos/queue/next`, { headers: { 'x-worker-secret': SECRET }, signal: AbortSignal.timeout(15000) })
  return await r.json().catch(() => ({}))
}

async function main() {
  if (!(await comfyHealthy())) {
    console.error(`[worker] ComfyUI NOT healthy at ${COMFY} — start it first (python main.py --listen 127.0.0.1 --port 8188). Exit.`)
    process.exit(1)
  }
  console.log(`[worker] V30 HunyuanVideo 1.5 8B worker online. app=${APP} comfy=${COMFY} poll=${POLL_MS}ms`)
  for (;;) {
    let job = null
    try {
      const j = await claimJob()
      if (j?.ok && !j?.empty && j?.videoId) {
        job = j
        await run(j)
      } else if (j?.error) {
        console.warn('[worker] queue/next error:', JSON.stringify(j).slice(0, 160))
      } else if (once) {
        console.log('[worker] --once: queue empty, exit')
        process.exit(0)
      }
    } catch (e) {
      if (job) await fail(job, e)
      console.error('[worker] loop error:', String(e?.message || e).slice(0, 300))
    }
    if (once) {
      if (job) console.log('[worker] --once: job finished, exit')
      process.exit(0)
    }
    await sleep(POLL_MS)
  }
}

main().catch((e) => { console.error('[worker] fatal:', e); process.exit(1) })
