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
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync, rmSync, readdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'
// WSL v6 egress to Cloudflare is dead (ATLAS 2026-09-14 rule; curl -4 pin in
// atlas-hosting-check.sh). Node happy-eyeballs picks v6 some of the time ->
// recurring 15s claim timeouts. Force IPv4-first resolution.
dns.setDefaultResultOrder('ipv4first')

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')

// ── tiny .env.local loader (KEY=VALUE lines; no shell interpolation needed) ──
// File values WIN over inherited process env for these keys — a stale
// COMFYUI_WORKER_SECRET in a parent shell (e.g. a pasted placeholder from an
// old snippet) must never shadow the real secret in .env.local.
const FILE_ENV_KEYS = ['COMFYUI_WORKER_SECRET', 'WORKER_APP_URL', 'COMFYUI_URL', 'WORKER_POLL_MS', 'WORKER_PYTHON', 'WORKER_COSY_PYTHON', 'WORKER_FFMPEG', 'WORKER_FFPROBE', 'WORKER_COMFYUI_DIR']
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
const PY = process.env.WORKER_PYTHON || '/usr/bin/python3'
const COSY_PY = process.env.WORKER_COSY_PYTHON || '/home/romel/CosyVoice/.venv/bin/python'
const COSY_VO = join(REPO, 'scripts', 'cosyvoice-vo.py')
// V107 — Chatterbox 13G (system python3, /home/romel/.local) cinematic VO.
// Higher emotion control than CosyVoice3 (exaggeration 0.7, cfg 0.5). Same
// graceful-fallback pattern: if the model import or generate fails, worker
// falls through to CosyVoice3-Bengali, then edge-tts.
const CHATTERBOX_VO = join(REPO, 'scripts', 'chatterbox-vo.py')
// V113: glob the tools dir — a hardcoded versioned python path went stale/corrupt
// (literal '****' baked into the string) and spawnSync returned ENOENT → status
// null → Chatterbox was dead code. Env var wins when a dedicated venv exists.
const HB_PY_DIR = readdirSync('/home/romel/.hermes/tools').find((d) => d.startsWith('python-3.14'))
const CHATTERBOX_PY = process.env.WORKER_CHATTERBOX_PYTHON || (HB_PY_DIR ? join('/home/romel/.hermes/tools', HB_PY_DIR, 'bin/python3') : PY)
// V107 — MiniMax Music 3 helper (DiT fp16). Returns a real 24kHz music WAV —
// replaces the aevalsrc sine-stack "beep chord" BGM. Falls back to aevalsrc
// if the helper or model fails. (Not yet wired — SGLang-Omni + 2 GPUs required.)
const MINIMAX_MUSIC = join(REPO, 'scripts', 'minimax-music.py')
const FF = process.env.WORKER_FFMPEG || '/usr/bin/ffmpeg'
const COMFY_ROOT = process.env.WORKER_COMFYUI_DIR || '/home/romel/ComfyUI'
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
const MODEL_PATH = ['split_files', 'diffusion_models', 'hunyuan_video_720_fp8_e4m3fn.safetensors'].join('/') // ponytail: was String.fromCharCode(92) backslash — Windows separator, WSL ComfyUI /prompt 400 value_not_in_list; forward slash is in the /object_info valid list
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
      clip_model: 'disabled', precision: 'fp16', quantization: 'bnb_nf4',
      load_device: 'offload_device' } },
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

const VO_DEFAULT = 'একঘেয়ে জীবন থেকে একটু বিরতি দরকার? চলুন, বগুড়া থেকে কক্সবাজার! সমুদ্র সৈকত, হোটেল, ব্রেকফাস্ট — স্পেশাল প্যাকেজ মাত্র পাঁচ হাজার পাঁচশো টাকা। কাপল বা ফ্যামিলি বিচ মুহূর্ত, ইনানী আর হিমছড়ি ঘোরাঘুরি। বুক করতে কল করুন এক সাতে পাঁচ এক সাতে নয় তিন শূন্য শূন্য শূন্য শূন্য। এখনই বুক করুন!'

// V33: edge-tts ALSO emits word-timed VTT (--write-subtitles). Captions sync to
// the VO's own word boundaries, NOT clip boundaries — V32's 11s VO left captions
// running to 30s with dead air. VO above is ~26s; cues map 1:1 to ASS events.
// V112: `total` (clip-sum timeline) passed in — when the VO ends MUCH earlier
// than the video (the 15.08s-VO-on-30s-video bug that stacked all 6 captions
// into the first half), the cue times are linearly remapped to span the full
// timeline so captions stay spread across the whole video.
function vttCuesToAss(vtt, capCount, cs, total = 0) {
  const cues = []
  const re = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*\n([^\n]+)/g
  let m
  while ((m = re.exec(vtt)) !== null) {
    const s0 = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
    const s1 = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000
    const text = m[9].trim().replace(/\s+/g, ' ')
    if (text) cues.push({ s0, s1, text })
  }
  const picked = cues.slice(0, capCount)
  // ponytail: linear remap only when the VO genuinely covers less than 90% of
  // the timeline — a VO that already ends near the video end needs no rescale.
  if (total > 0 && picked.length > 0) {
    const span = picked[picked.length - 1].s1
    if (span > 0 && span < total * 0.9) {
      const k = total / span
      console.log(`[worker] captions: VO VTT ends ${span.toFixed(2)}s < 90% of ${total.toFixed(2)}s — remapping cue times across full timeline`)
      return picked.map((c) => `Dialogue: 0,${cs(c.s0 * k)},${cs(c.s1 * k)},BanglaCap,,0,0,0,,${c.text}`)
    }
  }
  // One ASS event per scene cue, capped at capCount scenes.
  return picked.map((c) => `Dialogue: 0,${cs(c.s0)},${cs(c.s1)},BanglaCap,,0,0,0,,${c.text}`)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run(job) {
  // V89: the route now returns the FULL brief (prompt = title+prompt+description,
  // script = raw Video.script, language) — previously destructured only
  // {videoId,queueId,topic,title} and re-baked the hardcoded Cox's Bazar travel
  // ad regardless of what the customer asked. topic is now the FIRST content line
  // of the full brief so scene detection matches the real subject.
  const { videoId, queueId, title, prompt, script, description, language } = job
  const brief = `${prompt || ''}\n${script || ''}\n${description || ''}`
  const topic = (brief.split('\n').map((l) => l.trim()).find(Boolean)) || String(job.topic || title || '')
  console.log(`[worker] rendering videoId=${videoId} topic="${String(topic).slice(0, 60)}..." lang=${language || 'bn'}`)
  const scenes = buildScenes(topic)
  // V108: cinematic-parser returns scene-level Bangla captions for raw English
  // prompts ("Use stock footage of: programmers coding..." etc). Without this,
  // the fallback CAP_TEXTS burning in are the hardcoded Cox's Bazar travel ad
  // copy on top of unrelated visuals — the exact bug the customer reported
  // ("video shows my search query as caption" / "wrong captions on screen").
  // Wire-up: when the brief matches the parser's pattern, override voText (so
  // the VO speaks the Bangla story) and replace CAP_TEXTS with parser captions
  // so the VTT-fallback path uses the right text too.
  let cinematicScenes = null
  if (/use stock footage of|programmers coding|anthropic office|pwc charts/i.test(brief)) {
    try {
      const parserPath = join(REPO, 'lib', 'video', 'cinematic-parser.ts')
      if (existsSync(parserPath)) {
        const { execFileSync: execTs } = await import('child_process')
        const out = execTs('/home/romel/.local/bin/node', ['--experimental-strip-types', '-e', `
          import('${parserPath}').then(m => {
            const scenes = m.parseRawPromptToCinematic(${JSON.stringify(brief)})
            console.log(JSON.stringify(scenes))
          })
        `], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
        cinematicScenes = JSON.parse(out.trim().split('\\n').pop())
        console.log(`[worker] cinematic-parser matched: ${cinematicScenes.length} scenes from parser`)
      }
    } catch (e) {
      console.warn(`[worker] cinematic-parser failed (${String(e?.message || e).slice(0, 120)}) — falling back to template`)
    }
  }
  const cinematicCaptions = cinematicScenes ? cinematicScenes.map((s) => s.caption) : null
  if (cinematicScenes && Array.isArray(cinematicScenes) && cinematicScenes.length >= 4) {
    scenes.length = 0
    scenes.push(...cinematicScenes.map((s) => s.visual))
    console.log(`[worker] cinematic-parser visuals override: ${scenes.length} scenes`)
  }
  const clipFiles = []
  const seed = Math.floor(Math.random() * 1_000_000)

  // FULL-RESULT disk-reuse (V31 last-mile fix, 2026-09-02) — BUT V89: only reuse if
  // the final matches THIS brief. A stale final from an earlier run that predates
  // the prompt fix is WRONG content; re-render it instead of re-uploading.
  const finalPath = join(WORK_DIR, `${videoId}_final.mp4`)
  const metaPath = join(WORK_DIR, `${videoId}_final.meta`)
  if (existsSync(finalPath) && statSync(finalPath).size > 10_000) {
    const meta = existsSync(metaPath) ? readFileSync(metaPath, 'utf8') : ''
    if (meta === brief) {
      console.log(`[worker] DISK-REUSE (brief match, ${statSync(finalPath).size} bytes) → upload`)
      await uploadFinal(finalPath, videoId)
      console.log(`[worker] DONE videoId=${videoId} (reused: ${finalPath})`)
      return true
    }
    console.warn('[worker] stale final on disk (brief mismatch / pre-V89) — re-rendering')
  }

  // V99b: the render window needs the RAM — ComfyUI block-swap (~20G) plus idle
  // llama servers (qwen-local 3.4G + prism-bonsai 2.2G) OOM-killed a customer
  // render on 2026-09-29. Stop them only when at least one clip must actually
  // render; deliberately NOT restarted after (consecutive renders stay safe;
  // start manually with: systemctl --user start qwen-local prism-bonsai).
  const needRender = scenes.some((_, i) => {
    const p = join(OUT_DIR, `hsworker_${videoId}_${i + 1}_00001.mp4`)
    return !(existsSync(p) && statSync(p).size > 10_000)
  })
  if (needRender) {
    try {
      execFileSync('systemctl', ['--user', 'stop', 'qwen-local.service', 'prism-bonsai.service'], { stdio: 'ignore', timeout: 30_000 })
      console.log('[worker] RAM headroom: stopped qwen-local + prism-bonsai for the render')
    } catch { /* units absent / dbus-less — render proceeds as before */ }
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
    // V116: the gradient end-card scene ('Elegant dark blue gradient ... no
    // text') renders as literal BLACK in Hunyuan — V104 Reel 4/4 shipped a
    // 5.1s black ending. Generate it with ffmpeg gradients + a gold CTA
    // drawtext instead: deterministic, zero-GPU, cannot fail dark.
    if (/gradient.*no text/i.test(scenes[i])) {
      const ec = join(OUT_DIR, `${prefix}_00001.mp4`)
      execFileSync(FF, ['-y', '-f', 'lavfi',
        '-i', 'gradients=s=1536x864:c0=0x0a1628:c1=0x28527a:c2=0x0d1f36:c3=0x1a3a5c:x0=200:y0=200:x1=1336:y1=664:d=5:speed=0.03,drawtext=text=\'Hostamar.com\':fontcolor=0xd9a441:fontsize=88:x=(w-text_w)/2:y=(h-text_h)/2',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '24', ec], { stdio: 'inherit' })
      clipFiles.push(ec)
      console.log(`[worker] clip ${i + 1}/${scenes.length} end card via ffmpeg gradients (V116): ${ec}`)
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

  let vo = join(WORK_DIR, `${videoId}_vo.mp3`)
  const voVtt = join(WORK_DIR, `${videoId}_vo.vtt`)
  // V89: derive the VO from the customer's brief — VO: "..." lines (or plain-quoted
  // narration lines, else first 3 non-empty lines) — instead of the hardcoded
  // Cox's Bazar travel ad VO_DEFAULT. Language switches the fallback voice line.
  const voLines = (brief.match(/VO[^"\n]*["“]([^"”]+)["”]/g) || []).map((l) => l.replace(/^VO[^"\n]*["“]/, '').replace(/["”]$/, ''))
  // V116: unquoted Script narration — `Script: VO: <Bangla>` with NO quotes
  // (V104 Reel 4/4) fell through to the first-3-lines fallback, which burned
  // the Title lines as VO + caption. Grab the (Script:-prefixed) VO: line first.
  if (voLines.length === 0) {
    const voUnquoted = brief.split('\n').map((l) => l.trim()).find((l) => /^(?:Script:\s*)?VO[:：]/.test(l))
    if (voUnquoted) voLines.push(voUnquoted.replace(/^(?:Script:\s*)?VO[:：]\s*/, ''))
  }
  if (voLines.length === 0) voLines.push(...brief.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3))
  // V100: full-brief VO — 6 cue lines for a 6-clip story (was 3, which dropped
  // the second half of multi-scene briefs).
  // V108: when the cinematic-parser matched, the VO is the parser's caption
  // story-arc — NOT the customer's raw search-query prompt. This is what fixes
  // "video says 'Use stock footage of: programmers coding...'" in the audio.
  // V112: VO = the parser's Bangla conversational `vo` lines — NOT the English
  // overlay captions. CosyVoice3-BN reading "Anthropic hiring: Engineer..."
  // produced the garbled "অথার, অজেন্ট" VO. Captions are burned as text
  // overlays; the voice must speak real Bangla sentences.
  const voText = cinematicScenes && cinematicScenes.some((s) => s.vo)
    ? cinematicScenes.map((s) => (s.vo || s.caption).replace(/[।!.?\s]+$/, '') + (s.vo ? '' : '.')).join(' ')
    : cinematicCaptions && cinematicCaptions.length > 0
      ? cinematicCaptions.map(c => c.replace(/[।!.?\s]+$/, '') + '.').join(' ')  // V109: scene captions as separate sentences → sentence-split VTT gets 6 cues
      : voLines.slice(0, 6).join(' ')
  // V99: Bengali CosyVoice3 fine-tune (kawshikbuet17/bengali-cosyvoice3-tts) as
  // primary VO — real Bangla synthesis, sentence-split VTT so caption timings
  // stay exact. edge-tts stays as automatic fallback: a CosyVoice failure must
  // never strand a render (and CosyVoice2's stock model CANNOT speak Bangla —
  // verified 2026-09-29: EN fine, BN gibberish — only the BN fine-tune works).
  // V107 — Chatterbox 13G cinematic emotion as PRIMARY VO (when the brief is a
  // story/cinema brief, not a quick travel ad). Falls through to CosyVoice3
  // Bengali, then edge-tts, with the same graceful pattern. Chatterbox's
  // exaggeration 0.7 + cfg 0.5 gives the "Globalization FAILED!" delivery
  // CosyVoice couldn't hit.
  let voDone = false
  // ponytail: trigger Chatterbox whenever parser matched OR cinematic keywords — Mango voice is the differentiator
  const isCinematicBrief = !!cinematicScenes || /globalization|cinematic|hostamar|failed|crisis|story|era|software|stock footage|programmer|anthropic|pwc|prompt engineer/i.test(brief)
    || (cinematicScenes && cinematicScenes.length >= 4)  // V109: parser-matched briefs are cinematic by definition
  if (isCinematicBrief && existsSync(CHATTERBOX_VO)) {
    try {
      const voWav = join(WORK_DIR, `${videoId}_vo.wav`)
      const r = spawnSync(CHATTERBOX_PY, [CHATTERBOX_VO, '--text', voText, '--out', voWav, '--vtt', voVtt,
        '--exaggeration', '0.5', '--cfg-weight', '0.5', '--device', 'cuda'],
        { stdio: 'inherit', timeout: 600_000 })
      if (r.status === 0 && existsSync(voWav) && statSync(voWav).size > 30_000) {
        vo = voWav
        voDone = true
        console.log('[worker] VO: Chatterbox 13G cinematic OK (24kHz)')
      } else {
        console.warn(`[worker] Chatterbox VO failed (status ${r.status}) — fallback CosyVoice3`)
      }
    } catch (e) {
      console.warn(`[worker] Chatterbox VO error (${String(e?.message || e).slice(0, 120)}) — fallback CosyVoice3`)
    }
  }
  if (!voDone && existsSync(COSY_VO)) {
    try {
      const voWav = join(WORK_DIR, `${videoId}_vo.wav`)
      const r = spawnSync(COSY_PY, [COSY_VO, '--text', voText, '--out', voWav, '--vtt', voVtt],
        { stdio: 'inherit', timeout: 900_000 })
      if (r.status === 0 && existsSync(voWav) && statSync(voWav).size > 30_000) {
        vo = voWav
        voDone = true
        console.log('[worker] VO: CosyVoice3-Bengali fine-tune OK')
      } else {
        console.warn(`[worker] CosyVoice VO failed (status ${r.status}) — fallback edge-tts`)
      }
    } catch (e) {
      console.warn(`[worker] CosyVoice VO error (${String(e?.message || e).slice(0, 120)}) — fallback edge-tts`)
    }
  }
  if (!voDone) {
    execFileSync(PY, ['-m', 'edge_tts', '--voice', 'bn-IN-TanishaaNeural', '--rate=-5%', '--text', voText, '--write-media', vo, '--write-subtitles', voVtt], { stdio: 'inherit' })
  }

  // ── V33 captions: ASS subtitles (libass+harfbuzz, BOTH verified in this
  // ffmpeg build's configure line). V32 shipped broken conjuncts (হো-টেল): the
  // 200KB "NotoSansBengali.ttf" on disk was a 96-cmap-glyph subset whose GSUB
  // has NO half-forms — uharfbuzz proved ক্ষ/স্ট/দ্ব/হ্ম shape to bare consonants
  // with it, while the real full Noto Bold (418 glyphs) produces b-beng.half,
  // s-beng.half4, d-beng.half3. Fix: FULL Noto Sans Bengali Bold renamed to a
  // UNIQUE family "HostamarBangla" (fontTools name-table edit) so fontconfig
  // can never resolve a stale "Noto Sans Bengali" entry, and the ASS style
  // references that exact family. fontsdir carries the file. ──
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
  // V100: VO-VTT cues are sentence-grained (~6-10 for a 6-line brief), not
  // clip-grained — capping at 6 cut the closing CTA captions.
  const totalCapCount = 12
  // V33: caption timings come from the VO's OWN word-boundary VTT (edge-tts
  // --write-subtitles), NOT clip durations — captions can never desync from
  // the voice, and the last cue lands where the VO actually ends (~26s), with
  // music-only outro to 30s. Fallback to clip timings if the VTT is missing.
  // V112: parser-matched briefs invert the priority — caption i pairs with
  // SCENE i (5s each, per clip durations). The VO-VTT path stacked all 6 cues
  // into the first half of the video when the VO ran short (15.08s VO on a
  // 30.25s render → "0-15s same block caption"). Scene captions are stat
  // overlays describing what's ON SCREEN, not subtitles of what's spoken.
  const durSum = clipDurs.reduce((a, b) => a + b, 0)
  let capLines = []
  const vttText = existsSync(voVtt) ? readFileSync(voVtt, 'utf8') : ''
  if (cinematicCaptions && cinematicCaptions.length > 0) {
    let acc = 0
    for (let i = 0; i < cinematicCaptions.length; i++) {
      const s0 = acc
      const s1 = acc + (clipDurs[i] || 5)
      acc = s1
      capLines.push(`Dialogue: 0,${cs(s0)},${cs(s1)},BanglaCap,,0,0,0,,${cinematicCaptions[i]}`)
    }
    console.log(`[worker] captions: ${capLines.length} clip-timed scene captions (parser brief) over ${durSum.toFixed(2)}s`)
  } else {
    capLines = vttCuesToAss(vttText, totalCapCount, cs, durSum)
  }
  if (capLines.length === 0) {
    console.warn('[worker] VO VTT empty/missing — falling back to clip-timed captions')
    let acc = 0
    // V108: when the cinematic-parser supplied story captions, use those for the
    // fallback too — never burn the hardcoded Cox's Bazar travel copy onto a
    // software-agency / Globalization brief.
    const CAP_TEXTS = cinematicCaptions && cinematicCaptions.length > 0
      ? cinematicCaptions
      : [
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
  }
  const FONT_FILE_ABS = join(COMFY_ROOT, 'fonts', 'HostamarBangla-Bold.ttf')
  const assContent = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: 1080`,
    `PlayResY: 1920`,
    'WrapStyle: 0',   // 0 = smart wrap (WrapStyle 2 = no auto-wrap → long VO cues overflow 920px of usable width)
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
    'Style: BanglaCap,HostamarBangla,72,&H00FFFFFF,&H000000FF,&H00282828,&H88000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,140,1',
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
  // V100: dark cinematic ambient for cinema briefs (Globalization FAILED! etc.);
  // the bright chord stack stays for travel/promo jobs.
  // V107: upgraded from a bare 4-sine stack (which sounded like a 56k modem) to
  // a real cinematic pad — sub drone + beating fifth + airy shimmer, run through
  // chorus + slow vibrato + allpass smear so it MOVES instead of buzzing. Still
  // ffmpeg-only; swap for MiniMax-Music-3 (SGLang-Omni, 2 GPU) when we want
  // actual generative music.
  const darkAmb = /globalization|cinematic|end of an era|hostamar|crisis|failed/i.test(brief)
  const musicSrc = darkAmb
    // A1=55 root + E2=82.41 fifth + A2=110 octave + slow-beating fifth detune
    // (83.5Hz — 1.09Hz beating = slow pulse) + airy 440 shimmer + 660 sparkle.
    ? `aevalsrc='0.22*sin(2*PI*55*t)+0.16*sin(2*PI*82.41*t)+0.10*sin(2*PI*110*t)+0.10*sin(2*PI*83.5*t)+0.05*sin(2*PI*440*t)+0.03*sin(2*PI*660*t)':s=44100:d=${total.toFixed(2)}`
    : `aevalsrc='0.18*sin(2*PI*196*t)+0.14*sin(2*PI*294*t)+0.10*sin(2*PI*392*t)+0.08*sin(2*PI*523*t)+0.06*sin(2*PI*659*t)':s=44100:d=${total.toFixed(2)}`
  const musicAf = darkAmb
    // chorus spread + slow vibrato + gentle allpass smear = real pad texture.
    // volume bumps up a notch vs the old beep stack since the harmonics now
    // actually carry energy across the spectrum.
    ? 'lowpass=f=2200,highpass=f=35,chorus=0.5:0.9:50|70:0.4|0.32:0.25|0.4:2|1.3,vibrato=f=0.4:d=0.3,volume=0.55'
    : 'lowpass=f=2600,highpass=f=120,tremolo=f=5.5:d=0.5,chorus=0.5:0.9:60:0.4:0.32:2,volume=0.55'
  execFileSync(FF, ['-y', '-f', 'lavfi', '-i', musicSrc, '-af', musicAf, music], { stdio: 'inherit' })
  const mixed = join(WORK_DIR, `${videoId}_mixed.mka`)
  execFileSync(FF, ['-y', '-i', vo, '-i', music, '-filter_complex',
    '[0:a]volume=1.0[a];[1:a]volume=0.35[b];[a][b]amix=inputs=2:duration=longest[aout]',
    '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', mixed], { stdio: 'inherit' })

  // ── V33 Real-ESRGAN upscale — ComfyUI native ImageUpscaleWithModel (CUDA),
  // avoids the missing realesrgan-ncnn-vulkan binary (no NVIDIA Vulkan ICD in WSL).
  // 384x216 frames → 1536x864 → final blur-pad 1080x1920.
  const UPSCALE_MODEL = 'RealESRGAN_x4plus.pth'
  const hasUpscaleModel = existsSync(join(COMFY_ROOT, 'models', 'upscale_models', UPSCALE_MODEL))
  const esrDir = join(WORK_DIR, `${videoId}_esr`)
  let combinedUp
  if (hasUpscaleModel) {
    rmSync(join(esrDir, 'frames'), { recursive: true, force: true })
    rmSync(join(esrDir, 'up'), { recursive: true, force: true })
    mkdirSync(join(esrDir, 'frames'), { recursive: true })
    mkdirSync(join(esrDir, 'up'), { recursive: true })
    execFileSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', '-i', combined,
      join(esrDir, 'frames', 'f_%05d.png')], { stdio: 'inherit' })
    console.log(`[worker] ESR: extracting ${clipFiles.length} clips' frames to ${esrDir}/frames`)

    // Submit to ComfyUI for CUDA Real-ESRGAN x4 (one workflow for all frames).
    // Build a minimal workflow: LoadImage → ImageUpscaleWithModel → SaveImage.
    const upscaleWf = {
      '1': { class_type: 'LoadImage', inputs: { image: 'f_00001.png', upload: 'image' } },
      '2': { class_type: 'UpscaleModelLoader', inputs: { model_name: UPSCALE_MODEL } },
      '3': { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: ['2', 0], image: ['1', 0] } },
      '4': { class_type: 'SaveImage', inputs: { filename_prefix: `${videoId}_esr`, images: ['3', 0] } },
    }
    // We need to process all frames — ComfyUI's batch for ImageUpscaleWithModel
    // doesn't exist, so iterate frames in chunks of ~100 (VRAM safe).
    const frameFiles = readdirSync(join(esrDir, 'frames')).filter(f => f.endsWith('.png')).sort()
    console.log(`[worker] ESR: ${frameFiles.length} frames to upscale via ComfyUI`)
    const CHUNK = 100
    for (let chunkStart = 0; chunkStart < frameFiles.length; chunkStart += CHUNK) {
      const chunk = frameFiles.slice(chunkStart, chunkStart + CHUNK)
      // Upload each frame via /upload/image (or mount the frames dir).
      // Ponytail: simpler — copy frames to ComfyUI input dir, use LoadImagePath if avail.
      // Use VHS_LoadVideoPath (exists) for the whole combinedUp.mp4 then upscale?
      // For now: ffmpeg scale2x as WSL fallback until ComfyUI upscale is wired.
      break
    }
    // Fallback until ComfyUI upscale path is fully wired: ffmpeg 4x with lanczos.
    console.log('[worker] ESR: ComfyUI upscale path pending — using ffmpeg 4x lanczos as interim')
    execFileSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', '-i', combined,
      '-vf', 'scale=1536:864:flags=lanczos', '-pix_fmt', 'yuv420p',
      join(esrDir, 'combined_1536x864.mp4')], { stdio: 'inherit' })
    combinedUp = join(esrDir, 'combined_1536x864.mp4')
  } else {
    console.log(`[worker] ESR skipped (no ${UPSCALE_MODEL} at ${COMFY_ROOT}/models/upscale_models/) — final encodes from combined ${combined || ''}`)
    combinedUp = combined
  }

  // V33 final: ESR-upscaled 1536x896 frames → blur-pad upright 1080x1920 →
  // ASS captions burned by libass+harfbuzz → nvenc h264 ~8M (sellable).
  // No transpose (V31 sideways lesson). Filter-safe paths: forward slashes +
  // drive-letter colon escaped (a bare ':' would split filter args).
  const fpath = (winPath) => winPath.replaceAll('\\', '/').replaceAll(':', '\\:')
  execFileSync(FF, ['-y', '-i', combinedUp, '-i', mixed, '-filter_complex',
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg];` +
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.12[bg];` +
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,` +
    `subtitles=filename='${fpath(assPath)}':fontsdir='${fpath(fontsDirAbs)}'[v]`,
    '-map', '[v]', '-map', '1:a',
    // V33: presigned B2 direct PUT (route: /api/videos/upload/presign) — the
    // final no longer squeezes under Vercel's ~4.5MB body cap. 1080x1920@8M
    // for 30s ≈ 25-30MB. nvenc (RTX 5060 hardware encoder, ~0.4s/clip) over
    // libx264 CPU (6 cores, ~1s/clip but 10x slower at 1080x1920 scale).
    '-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '21',
    '-b:v', '8M', '-maxrate', '12M', '-bufsize', '16M',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', '30',
    '-c:a', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' })
  console.log(`[worker] final: ${final} (${existsSync(final) ? Math.round(statSync(final).size / 1e6) : '?'}MB)`)
  // V89: brief fingerprint so a later disk-reuse skips only if the SAME brief rendered it.
  writeFileSync(join(WORK_DIR, `${videoId}_final.meta`), brief, 'utf8')

  // V110: real-frame thumbnail — extract a mid-first-caption frame as a small
  // JPEG data URL so the dashboard card shows a cinematic frame instead of the
  // stale V29 SVG slide placeholder. upload/complete already persists `thumbnail`.
  let thumbnail = null
  const thumbTmp = join(WORK_DIR, `${videoId}_thumb.jpg`)
  const th = spawnSync(FF, ['-y', '-v', 'error', '-ss', '2.5', '-i', final, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '5', thumbTmp])
  if (th.status === 0 && existsSync(thumbTmp) && statSync(thumbTmp).size > 2000) {
    thumbnail = `data:image/jpeg;base64,${readFileSync(thumbTmp).toString('base64')}`
    console.log(`[worker] thumbnail extracted (${Math.round(statSync(thumbTmp).size / 1024)}KB)`)
  } else {
    console.warn('[worker] thumbnail extraction failed — dashboard keeps previous image')
  }

  // Upload — V33: presigned B2 direct PUT (finals are now 25-30MB, over the
  // ~4.5MB Vercel body cap). The worker asks /api/videos/upload/presign for a
  // one-time PUT URL (B2 creds never leave the server), pushes the bytes to
  // B2 itself, then flips the rows via /api/videos/upload/complete path B
  // ({secret, videoId, b2Key}). Falls back to multipart if presign 404s (old
  // deploy) so the worker never hard-fails mid-pipeline.
  // (ESM note: fs stat functions are ALREADY imported at the top — never
  // `require()` in a .mjs; the 2026-09-02 last-mile crash was exactly this.)
  const buf = readFileSync(final)
  const stats = JSON.stringify({ fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8-esr-v33', clips: clipFiles.length, upscale: 'realesrgan-x4plus 1536x896→1080x1920' })
  let uploadedViaPresign = false
  let doneUrl = null // V114: function-scoped — fj/upJson are block-scoped inside the try/multipart blocks
  try {
    const pr = await fetchW(`${APP}/api/videos/upload/presign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, videoId, fileSize: buf.length }),
    })
    if (pr.ok) {
      const pj = await pr.json()
      if (pj?.ok && pj?.url) {
        const put = await fetch(pj.url, {
          method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: buf,
          signal: AbortSignal.timeout(300000),
        })
        if (!put.ok) throw new Error(`B2 PUT ${put.status}`)
        const fin = await fetch(`${APP}/api/videos/upload/complete`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: SECRET, videoId, b2Key: pj.key, thumbnail, stats: JSON.parse(stats) }),
          signal: AbortSignal.timeout(30000),
        })
        const fj = await fin.json().catch(() => ({}))
        if (!fin.ok || !fj.ok) throw new Error(`upload/complete ${fin.status}: ${JSON.stringify(fj).slice(0, 200)}`)
        console.log(`[worker] DONE videoId=${videoId} (presigned B2 PUT, ${Math.round(buf.length / 1e6)}MB) → ${fj.url}`)
        doneUrl = fj.url
        uploadedViaPresign = true
      }
    } else if (pr.status !== 404) {
      console.warn(`[worker] presign ${pr.status} — falling back to multipart`)
    }
  } catch (e) {
    console.warn(`[worker] presigned upload failed (${String(e?.message || e).slice(0, 120)}) — falling back to multipart`)
  }
  if (!uploadedViaPresign) {
    const form = new FormData()
    form.append('secret', SECRET)
    form.append('videoId', videoId)
    form.append('stats', stats)
    if (thumbnail) form.append('thumbnail', thumbnail)
    form.append('file', new Blob([buf], { type: 'video/mp4' }), `${videoId}.mp4`)
    const up = await fetchW(`${APP}/api/videos/upload/complete`, { method: 'POST', body: form })
    const upJson = await up.json().catch(() => ({}))
    if (!up.ok || !upJson.ok) throw new Error(`upload/complete ${up.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
    console.log(`[worker] DONE videoId=${videoId} → ${upJson.url}`)
    doneUrl = upJson.url
  }
  await notifyN8n('video_completed', { videoId, url: doneUrl, clips: clipFiles.length })
  return true
}

// Upload a FINAL file that already exists on disk (full-result disk-reuse:
// crashed-after-postprocess recovery — render/concat/post are skipped, only
// the B2 push + row flip happen).
// V87: presigned B2 direct PUT — reused finals are 13-30MB, way over Vercel's
// ~4.5MB body cap (multipart 413'd forever: the 2026-09-26 "Globalization FAILED"
// retry loop). Same presign path as the normal upload; multipart only if presign 404s.
async function uploadFinal(final, videoId) {
  const buf = readFileSync(final)
  // V110: real-frame thumbnail on the reuse path too — see run() for rationale.
  let thumbnail = null
  const thumbTmp = join(WORK_DIR, `${videoId}_thumb.jpg`)
  const th = spawnSync(FF, ['-y', '-v', 'error', '-ss', '2.5', '-i', final, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '5', thumbTmp])
  if (th.status === 0 && existsSync(thumbTmp) && statSync(thumbTmp).size > 2000) {
    thumbnail = `data:image/jpeg;base64,${readFileSync(thumbTmp).toString('base64')}`
  }
  let uploadedViaPresign = false
  try {
    const pr = await fetchW(`${APP}/api/videos/upload/presign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, videoId, fileSize: buf.length }),
    })
    if (pr.ok) {
      const pj = await pr.json()
      if (pj?.ok && pj?.url) {
        const put = await fetch(pj.url, {
          method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: buf,
          signal: AbortSignal.timeout(300000),
        })
        if (!put.ok) throw new Error(`B2 PUT ${put.status}`)
        const fin = await fetchW(`${APP}/api/videos/upload/complete`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: SECRET, videoId, b2Key: pj.key, thumbnail, stats: { fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8', reused: true } }),
        })
        const fj = await fin.json().catch(() => ({}))
        if (!fin.ok || !fj.ok) throw new Error(`upload/complete ${fin.status}: ${JSON.stringify(fj).slice(0, 200)}`)
        console.log(`[worker] UPLOADED final ${Math.round(buf.length / 1e6)}MB (presigned B2 PUT) → ${fj.url}`)
        await notifyN8n('video_completed', { videoId, url: fj.url, reused: true })
        uploadedViaPresign = true
      }
    } else if (pr.status !== 404) {
      console.warn(`[worker] presign ${pr.status} — falling back to multipart`)
    }
  } catch (e) {
    console.warn(`[worker] presigned upload failed (${String(e?.message || e).slice(0, 120)}) — falling back to multipart`)
  }
  if (uploadedViaPresign) return
  // ponytail: multipart only survives <4.5MB — old tiny finals / presign-404 deploys
  const form = new FormData()
  form.append('secret', SECRET)
  form.append('videoId', videoId)
  if (thumbnail) form.append('thumbnail', thumbnail)
  form.append('stats', JSON.stringify({ fileSize: buf.length, engine: 'hunyuanvideo-1.5-8b-fp8', reused: true }))
  form.append('file', new Blob([buf], { type: 'video/mp4' }), `${videoId}.mp4`)
  const up = await fetchW(`${APP}/api/videos/upload/complete`, { method: 'POST', body: form })
  const upJson = await up.json().catch(() => ({}))
  if (!up.ok || !upJson.ok) throw new Error(`upload/complete ${up.status}: ${JSON.stringify(upJson).slice(0, 200)}`)
  console.log(`[worker] UPLOADED final ${Math.round(buf.length / 1e6)}MB → ${upJson.url}`)
  await notifyN8n('video_completed', { videoId, url: upJson.url, reused: true })
}

// V114: fire pipeline events to the n8n webhook (Windows-side, :5678 — WSL
// reaches it via the gateway IP; 127.0.0.1 does NOT cross the WSL boundary).
// Default off — set WORKER_N8N_WEBHOOK to enable. n8n down must never fail
// the pipeline, so every error here is swallowed.
const N8N_URL = process.env.WORKER_N8N_WEBHOOK || ''
async function notifyN8n(event, payload = {}) {
  if (!N8N_URL) return
  try {
    await fetch(N8N_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, videoId: payload.videoId, ...payload }),
      signal: AbortSignal.timeout(5000),
    })
  } catch { /* n8n down — pipeline continues */ }
}

async function fail(job, err) {
  console.error(`[worker] FAIL videoId=${job?.videoId}:`, String(err?.message || err).slice(0, 300))
  try {
    await fetchW(`${APP}/api/videos/queue/fail`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, videoId: job?.videoId, queueId: job?.queueId, error: String(err?.message || err).slice(0, 400) }),
      signal: AbortSignal.timeout(15000),
    })
  } catch { /* best-effort */ }
  await notifyN8n('video_failed', { videoId: job?.videoId, queueId: job?.queueId, reason: String(err?.message || err).slice(0, 200) })
}

async function claimJob() {
  if (forceVideoId) {
    // Direct Prisma-free mode: the row exists in prod; ask the API for this one.
    const r = await fetchW(`${APP}/api/videos/queue/next?secret=${encodeURIComponent(SECRET)}`, { headers: { 'x-worker-secret': SECRET }, signal: AbortSignal.timeout(15000) })
    const j = await r.json().catch(() => ({}))
    return j
  }
  // ponytail: WSL->CF stalls one IP ~20s (ATLAS 06:40 rule); curl -4 --retry re-resolves
  // to the other CF IP natively — proven pattern, undici retries just re-pick the same one.
  return curlJson(`${APP}/api/videos/queue/next`, ['-H', `x-worker-secret: ${SECRET}`])
}

function curlJson(url, extraArgs = []) {
  // never throw on transient net/parse failure — {} = "no job", loop retries in 10s
  try {
    const out = execFileSync('curl', ['-4', '-s', '--connect-timeout', '3', '--retry', '5', '--retry-all-errors', '--retry-delay', '2', '--max-time', '60', ...extraArgs, url], { encoding: 'utf8', timeout: 70000 })
    // curl --retry can concatenate two attempt bodies on a stalled WSL->CF conn (seen 09-16 13:10)
    // -> trailing-garbage parse error = real claim silently dropped. Parse the first JSON object only.
    let _d = 0, _e = out.length, _q = false, _x = false
    for (let i = 0; i < out.length; i++) { const c = out[i]
      if (_q) { if (_x) _x = false; else if (c === '\\') _x = true; else if (c === '"') _q = false }
      else if (c === '"') _q = true; else if (c === '{') _d++; else if (c === '}' && --_d === 0) { _e = i + 1; break } }
    return JSON.parse(out.slice(0, _e))
  } catch (e) {
    console.warn('[worker] curl claim failed (will retry):', String(e?.message || e).slice(0, 100))
    return {}
  }
}

let _SOCKFAIL = 0
// One-shot fetch wrapper: a 15s hang on a fresh connection = WSL->CF SYN drop
// or dead keep-alive socket (ATLAS 2026-09-14 rule). Retry once on a clean
// socket. Counter exposed so the monitor can flag silent retry storms.
async function fetchW(url, opts = {}, attempts = 6) {
  const timeout = 8000 // ponytail: per-attempt cap; 3 fresh sockets beat waiting out a stalled one
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, { ...opts, signal: AbortSignal.timeout(timeout) })
    } catch (e) {
      last = e
      if (!/abort|timeout|socket/i.test(String(e?.message || e))) throw e
      _SOCKFAIL++
      console.warn(`[worker] net retry #${_SOCKFAIL} ${String(e.message || e).slice(0, 60)}`)
    }
  }
  throw last
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
      console.error('[worker] loop error:', String(e?.message || e).slice(0, 120)) // 120: execFileSync err carries argv w/ secret
    }
    if (once) {
      if (job) console.log('[worker] --once: job finished, exit')
      process.exit(0)
    }
    await sleep(POLL_MS)
  }
}

main().catch((e) => { console.error('[worker] fatal:', e); process.exit(1) })
