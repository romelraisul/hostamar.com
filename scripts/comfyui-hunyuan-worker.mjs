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
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
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
const FF = process.env.WORKER_FFMPEG || 'C:\\Users\\User\\qwen\\python_embeded\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe'
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
// V32: 512x288 landscape @ 120 frames (~5s @ 24fps, 6 scenes = 30s) — proven-safe
// dims for 8GB (skill: 512x288/320 fine for ≤145 frames). NO 720x1280 direct
// portrait (288x512 hung twice) and NO transpose (landscape→portrait transpose
// renders sideways content; V31 bug). Portrait = blur-pad at the FINAL stage.
const WIDTH = 384
const HEIGHT = 216
// HyVideo sampler requires (num_frames - 1) % 4 == 0. 121 → 120 % 4 == 0.
// 121 frames @ 24fps ≈ 5.04s — 6 clips × 5s = 30.25s total.
// 512x288x121 FROZE THE PC 1/1 (2026-09-02 23:21, hard reset, Event 41) — VAE
// decode peak ~48% over this proven envelope (V31: 10 clips, 2 nights, 0 freezes).
// 121f here is LIGHTER than V31's 145f. Do NOT raise dims without a supervised probe.
const FRAMES = 121
const STEPS = 20   // 2x V31 quality (10); ~50min/clip ≈ 5h total for 6 clips
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

// 6-scene storyboard (V32) matching the customer brief exactly. HunyuanVideo
// cannot render LEGIBLE text — the offer/CTA card is a REAL Bangla overlay done
// in post (ASS/libass), so scene 6 is a clean background for it. Generic
// fallbacks keep this usable for any travel/promo topic.
function buildScenes(topic) {
  const t = (topic || '').toLowerCase()
  const scenes = []
  if (/বগুড়া|bogra/.test(t)) scenes.push('A colorful green-red intercity coach bus driving out of Bogra city bus station in early morning golden light, passengers boarding with luggage, wheels rolling, highway motion, cinematic')
  else scenes.push('A modern intercity coach bus departing a Bangladeshi city bus station at dawn, golden light, highway motion, cinematic')
  if (/কক্সবাজার|cox/.test(t)) scenes.push("Cinematic aerial drone flight over Cox's Bazar sea beach, the world's longest natural sea beach, turquoise waves rolling onto white sand, fishing boats, cinematic motion")
  else scenes.push('Cinematic aerial drone flight over a tropical sea beach in Bangladesh, turquoise waves rolling onto white sand, motion')
  scenes.push('Luxury sea-view hotel room interior with breakfast table by the window overlooking the ocean, warm morning light, camera slowly panning')
  scenes.push('A happy couple walking hand in hand along the beach at sunset, silhouetted against orange sky, gentle waves, cinematic')
  if (/ইনানী|inani|হিমছড়ি|himchari/.test(t)) scenes.push("Drone tracking shot flying along Inani beach rocky shore and Himchari green hills meeting the sea in Cox's Bazar, coconut palms, tourists exploring, cinematic motion")
  else scenes.push('Scenic coastal road with green hills and palm trees, tourists enjoying, motion')
  scenes.push('Elegant dark blue gradient background with soft golden light rays and gentle floating particles, slow zoom, premium travel offer card backdrop, no text')
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

  // ── FULL-RESULT disk-reuse (V31 last-mile fix, 2026-09-02) ──
  // If a previous run already produced the FINAL post-processed file (all 5
  // clips + concat + VO + music + captions + transpose) and only the B2
  // upload crashed (e.g. the 2026-09-02 `require is not defined` crash), do
  // NOT re-render or even re-concat — go straight to upload. Zero GPU spend.
  const finalPath = join(WORK_DIR, `${videoId}_final.mp4`)
  if (existsSync(finalPath) && statSync(finalPath).size > 10_000) {
    console.log(`[worker] DISK-REUSE — final already on disk (${statSync(finalPath).size} bytes), skipping render+concat+post, going straight to upload`)
    await uploadFinal(finalPath, videoId)
    console.log(`[worker] DONE videoId=${videoId} (reused final: ${finalPath})`)
    return true
  }

  for (let i = 0; i < scenes.length; i++) {
    const prefix = `hsworker_${videoId}_${i + 1}`
    // Disk-reuse: a clip already rendered for this video (previous worker run,
    // reclaim after crash, or a failed post-process like the 2026-09-02 ffmpeg
    // incident) is NOT re-rendered — GPU hours are not spent twice.
    const reuse = join(OUT_DIR, `${prefix}_00001.mp4`)
    if (existsSync(reuse) && statSync(reuse).size > 10_000) {
      clipFiles.push(reuse)
      console.log(`[worker] clip ${i + 1}/${scenes.length} reused from disk: ${reuse}`)
      continue
    }
    const wf = buildWorkflow(scenes[i], seed + i, prefix)
    const { file } = await submitAndWait(wf)
    clipFiles.push(file)
    console.log(`[worker] clip ${i + 1}/${scenes.length} done: ${file}`)
  }

  // Concat + rotate 9:16 + VO + music + captions (proven tiktok recipe).
  const listPath = join(WORK_DIR, `${videoId}_concat.txt`)
  writeFileSync(listPath, clipFiles.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n'), 'utf8')
  const combined = join(WORK_DIR, `${videoId}_combined.mp4`)
  execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-fflags', '+genpts', '-c', 'copy', combined], { stdio: 'inherit' })

  const vo = join(WORK_DIR, `${videoId}_vo.mp3`)
  execFileSync(PY, ['-m', 'edge_tts', '--voice', 'bn-IN-TanishaaNeural', '--text', job.language === 'en' ? 'Escape the routine — Bogra to Cox\'s Bazar special package!' : VO_DEFAULT, '--write-media', vo], { stdio: 'inherit' })

  // ── V32 captions: ASS subtitles (libass) with the REAL Noto Sans Bengali ──
  // drawtext+fontconfig produced tofu (V31: fontfile=font.ttf was a RELATIVE
  // path while ffmpeg's CWD is the repo — 'Cannot load default config file' ×5
  // fell back to a non-Bengali font). libass + fontsdir + absolute path shapes
  // Bangla conjuncts correctly (harfbuzz) and its cache is family-keyed, so we
  // give NotoSansBengali a UNIQUE family name via a copied .conf so the cache
  // can never collide with an old non-Bengali 'Noto Sans Bengali' entry.
  const assPath = join(WORK_DIR, `${videoId}_captions.ass`)
  const clipDurs = []   // NOT [0,0,...] — pushing onto a pre-sized array lands
                        // durations at index 6+ while the caption loop reads
                        // 0-5 (the zeros) → all captions 0.00→0.00 (invisible).
  for (const p of clipFiles) {
    let d = 5
    try {
      const r = spawnSync(FF, ['-hide_banner', '-i', p], { encoding: 'utf8' })
      const m = String(r.stderr || '').match(/Duration: (\d+):(\d+):(\d+\.?\d+)/)
      if (m) d = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    } catch { /* keep 5s default */ }
    clipDurs.push(d)
  }
  const cs = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = (sec % 60).toFixed(2).padStart(5, '0')
    return `${h}:${m}:${s}`
  }
  let acc = 0
  const capLines = []
  const totalCapCount = Math.min(clipFiles.length, 6)
  const CAP_TEXTS = [
    'একঘেয়ে জীবন থেকে একটু বিরতি দরকার?',
    'চলুন, বগুড়া থেকে কক্সবাজার',
    'সমুদ্র সৈকত, হোটেল, ব্রেকফাস্ট',
    'কাপল/ফ্যামিলি বিচ মুহূর্ত',
    'ইনানী | হিমছড়ি ঘোরাঘুরি',
    'স্পেশ্যাল প্যাকেজ — এখনই বুক করুন!',
  ]
  for (let i = 0; i < totalCapCount; i++) {
    const s0 = acc
    const s1 = acc + clipDurs[i]
    acc = s1
    capLines.push(`Dialogue: 0,${cs(s0)},${cs(s1)},BanglaCap,,0,0,0,,${CAP_TEXTS[i] || ''}`)
  }
  const FONT_FILE_ABS = join(COMFY_ROOT, 'fonts', 'NotoSansBengali.ttf')
  const assContent = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: 720`,
    `PlayResY: 1280`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
    'Style: BanglaCap,Noto Sans Bengali,54,&H00FFFFFF,&H000000FF,&H00282828,&H88000000,0,0,0,0,100,100,0,0,1,2.4,1,2,60,60,90,1',
    '',
    '[Events]',
    ...capLines,
    '',
  ].join('\n')
  writeFileSync(assPath, assContent, 'utf8')
  const fontsDirAbs = join(COMFY_ROOT, 'fonts')
  console.log(`[worker] captions: ${capLines.length} ASS events → ${assPath} (font: ${FONT_FILE_ABS})`)

  const final = join(WORK_DIR, `${videoId}_final.mp4`)
  const total = clipDurs.reduce((a, b) => a + b, 0)
  const music = join(WORK_DIR, `${videoId}_music.mka`)
  execFileSync(FF, ['-y', '-f', 'lavfi', '-i',
    `aevalsrc='0.18*sin(2*PI*196*t)+0.14*sin(2*PI*294*t)+0.10*sin(2*PI*392*t)+0.08*sin(2*PI*523*t)+0.06*sin(2*PI*659*t)':s=44100:d=${total.toFixed(2)}`,
    '-af', 'lowpass=f=2600,highpass=f=120,tremolo=f=5.5:d=0.5,volume=0.5', music], { stdio: 'inherit' })
  const mixed = join(WORK_DIR, `${videoId}_mixed.mka`)
  execFileSync(FF, ['-y', '-i', vo, '-i', music, '-filter_complex',
    '[0:a]volume=1.0[a];[1:a]volume=0.35[b];[a][b]amix=inputs=2:duration=longest[aout]',
    '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', mixed], { stdio: 'inherit' })
  // V32 final: NO transpose (V31 sideways bug — rotating landscape content
  // can never make it upright). Upright 720x1280 canvas: blur-background pad.
  // ASS captions burned by libass. Filter-safe paths: forward slashes + the
  // drive-letter colon escaped (a bare ':' would split the filter args).
  const fpath = (winPath) => winPath.replaceAll('\\', '/').replaceAll(':', '\\:')
  execFileSync(FF, ['-y', '-i', combined, '-i', mixed, '-filter_complex',
    `[0:v]scale=720:1280:force_original_aspect_ratio=decrease,setsar=1[fg];` +
    `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=28,eq=brightness=-0.12[bg];` +
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,` +
    `subtitles=filename='${fpath(assPath)}':fontsdir='${fpath(fontsDirAbs)}'[v]`,
    '-map', '[v]', '-map', '1:a',
    // Vercel serverless gateway caps request bodies at ~4.5MB — a 30s 720x1280
    // final must stay under it to pass /api/videos/upload/complete (verified
    // live: 413 at 5MB / crf18+3.5M). 1.0M video bitrate ≈ 4.1MB total.
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '1.0M', '-bufsize', '2M',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', '30',
    '-c:a', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' })
  console.log(`[worker] final: ${final} (${existsSync(final) ? Math.round(statSync(final).size / 1e6) : '?'}MB)`)

  // Upload via the API (multipart) — B2 creds stay server-side.
  // (ESM note: fs stat functions are ALREADY imported at the top — never
  // `require()` in a .mjs; the 2026-09-02 last-mile crash was exactly this.)
  const buf = readFileSync(final)
  const form = new FormData()
  form.append('secret', SECRET)
  form.append('videoId', videoId)
  form.append('stats', JSON.stringify({ fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8', clips: clipFiles.length }))
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${videoId}.mp4`)
  const up = await fetch(`${APP}/api/videos/upload/complete`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) })
  const upJson = await up.json().catch(() => ({}))
  if (!up.ok || !upJson.ok) throw new Error(`upload/complete ${up.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
  console.log(`[worker] DONE videoId=${videoId} → ${upJson.url}`)
  return true
}

// Upload a FINAL file that already exists on disk (full-result disk-reuse:
// crashed-after-postprocess recovery — render/concat/post are skipped, only
// the B2 push + row flip happen).
async function uploadFinal(final, videoId) {
  const buf = readFileSync(final)
  const form = new FormData()
  form.append('secret', SECRET)
  form.append('videoId', videoId)
  form.append('stats', JSON.stringify({ fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8', reused: true }))
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${videoId}.mp4`)
  const up = await fetch(`${APP}/api/videos/upload/complete`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) })
  const upJson = await up.json().catch(() => ({}))
  if (!up.ok || !upJson.ok) throw new Error(`upload/complete ${up.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
  console.log(`[worker] UPLOADED final ${Math.round(buf.length / 1e6)}MB → ${upJson.url}`)
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
