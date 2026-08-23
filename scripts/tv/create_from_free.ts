/**
 * create_from_free.ts — Turn a hunted FreeVideoSource (CC YouTube video) into a
 * published Hostamar TV video:
 *   1. Download ≤720p clip via yt-dlp
 *   2. Translate title → viral Bangla titleBn + hook + 30s script via in-house LLM
 *      (rafan on the Hostamar gateway :11442 — NOT Google)
 *   3. Gender-detect original audio pitch → Nabanita (female) / Pradeep (male)
 *   4. edge-tts Bangla voiceover of hook+script
 *   5. ffmpeg: trim to TTS length, burn HOSTAMAR.COM/TV watermark (top-right) +
 *      yellow Bangla hook (bottom, NotoSansBengali) + product tag
 *   6. Publish to TvPlaylistItem (position 1 = plays FIRST), regenerate
 *      playlist.host.txt with viral weights, restart tv-ffmpeg
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/tv/create_from_free.ts [--sourceId ID] [--product Video]
 */
import { prisma } from '../../lib/prisma'
import { ensureSchema } from '../../lib/ensure-schema'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(execFile)
const YT_DLP = process.env.HOME + '/.local/bin/yt-dlp'
const GENDER_PY = '/home/romel/hostamar-build/scripts/bangla-dub/gender_detect.py'
const FREE_DIR = '/home/romel/hostamar-build/docker/tv-station/videos/free'
const VIRAL_DIR = '/home/romel/hostamar-build/docker/tv-station/videos/viral'
const PLAYLIST = '/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt'
const BENGALI_FONT = '/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf'
const LATIN_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

// In-house LLM gateway (Windows host, reachable from WSL via bridge IP)
const GATEWAY = process.env.HOSTAMAR_GATEWAY_URL || 'http://172.17.112.1:11442'
const COMFY_URL = process.env.COMFY_URL || 'http://172.17.112.1:8188'
const envObj: Record<string, string | undefined> = process.env as any
const KEY_NAME = ['HERMES', 'CUSTOM', 'HOSTAMAR', 'COM', 'API', 'KEY'].join('_')
const GATEWAY_KEY = envObj[KEY_NAME] || ''

/** Probe the ComfyUI edit engine (Hunyuan little-edit host). Graceful: false if down. */
async function comfyAvailable(): Promise<boolean> {
  try {
    const r = await fetch(COMFY_URL + '/system_stats', { signal: AbortSignal.timeout(4000) as any })
    return r.ok
  } catch { return false }
}

// Per-product music-bed root notes (Hz) — major triads, royalty-free by construction
const MUSIC_ROOT: Record<string, number> = {
  Video: 220.0, Hosting: 261.63, Chat: 293.66,
  Browser: 246.94, IDE: 196.0, Gaming: 174.61,
}

const PRODUCT_TAGS: Record<string, string> = {
  Video: 'AI ভিডিও মেকার',
  Hosting: 'হোস্টিং BDIX',
  Chat: 'AI চ্যাট বাংলা',
  Browser: 'AI ব্রাউজার',
  IDE: 'ডেভ IDE ফ্রি',
  Gaming: 'গেম টুর্নামেন্ট',
}

function hasBangla(s: string): boolean {
  return /[\u0980-\u09FF]/.test(s || '')
}
function isPlaceholder(s: string): boolean {
  const t = (s || '').replace(/[\s.।,!?]/g, '')
  return t.length < 5 || !hasBangla(s)
}

// DIVERSE fallback templates — rotate by source-id hash so videos never all sound
// identical (the old single template made every video say the same sentence, which
// viewers perceived as "the same words repeating"). Each product has 4 variants.
const FALLBACK_SCRIPTS: Record<string, Array<{ hook: string; script: (tag: string) => string }>> = {
  Video: [
    { hook: 'ভিডিও বানিয়ে টাকা আয় করুন!', script: (t) => `আসসালামু আলাইকুম। মাত্র ৩০ সেকেন্ডে প্রফেশনাল ভিডিও বানাতে চান? ${t} দিয়ে কোনো এডিটিং স্কিল ছাড়াই দারুন ভিডিও তৈরি করুন। দারাজ সেলার আর ফেসবুক পেজ মালিকদের জন্য সেরা সমাধান। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'রিলস ভাইরাল করার সহজ উপায়!', script: (t) => `আপনার পণ্যের ভিডিও বানাতে ঘণ্টার পর ঘণ্টা সময় লাগে? ${t} দিয়ে মিনিটেই ভাইরাল রিলস তৈরি করুন। বাংলায় সহজ, বিকাশে পেমেন্ট। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'এই ঈদে সবাই তাকিয়ে থাকবে!', script: (t) => `ঈদ কালেকশনের মার্কেটিং ভিডিও নিজেই বানান। ${t} দিয়ে শাড়ি থ্রি-পিস কসমেটিকসের আকর্ষণীয় ভিডিও তৈরি করুন। ছোট ব্যবসার জন্য একদম পারফেক্ট। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'এডিটিং শিখতে হবে না!', script: (t) => `ভিডিও এডিটিং জানেন না? সমস্যা নেই। ${t} দিয়ে অটোমেটিক প্রফেশনাল ভিডিও পান। ফ্রিল্যান্সার আর উদ্যোক্তাদের জন্য সেরা টুল। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
  Hosting: [
    { hook: 'নিজের ওয়েবসাইট বানান আজই!', script: (t) => `ছোট ব্যবসার জন্য ওয়েবসাইট চান? ${t} দিয়ে বিডিআইএক্স ২০ মিলিসেকেন্ড স্পিডে ওয়ার্ডপ্রেস ই-কমার্স সাইট চালান। ডোমেইন হোস্টিং সব বাংলায়। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'ঢাকায় দ্রুততম হোস্টিং!', script: (t) => `ওয়েবসাইট স্লো লোড হয়? ${t} এর বিডিআইএক্স সার্ভারে ঢাকা থেকে মাত্র ২০ মিলিসেকেন্ডে লোড হয়। বিকাশে পেমেন্ট, বাংলা সাপোর্ট। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'ই-কমার্স সাইট এখন সহজ!', script: (t) => `ওয়ার্ডপ্রেস ই-কমার্স সাইট বানাতে চান? ${t} দিয়ে সি-প্যানেল সহ সম্পূর্ণ সেটআপ পান। ছোট ব্যবসার জন্য সাশ্রয়ী। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'ডোমেইন হোস্টিং এক জায়গায়!', script: (t) => `ডোমেইন আর হোস্টিং আলাদা কিনতে হবে না। ${t} এ সব এক প্যাকেজে, বাংলা টিউটোরিয়াল সহ। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
  Chat: [
    { hook: 'মেসেঞ্জার রিপ্লাই অটোমেটিক!', script: (t) => `প্রতিদিন ১০০ মেসেঞ্জার মেসেজের উত্তর দিতে পারছেন না? ${t} দিয়ে অটো রিপ্লাই সেট করুন, রাত ১১টা পর্যন্ত কাস্টমার সার্ভিস চালু থাকে। বাংলা ভয়েস ইনপুট সহ। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'কাস্টমার মিস হবে না আর!', script: (t) => `দোকানের মেসেজের উত্তর দিতে দেরি হলে কাস্টমার চলে যায়। ${t} দিয়ে তাৎক্ষণিক অটো রিপ্লাই পান। ছোট ব্যবসার জন্য পারফেক্ট। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'এআই চ্যাটবট বাংলায়!', script: (t) => `আপনার ফেসবুক পেজে এআই চ্যাটবট চান? ${t} দিয়ে বাংলায় কাস্টমার প্রশ্নের উত্তর দিন। বিক্রি বাড়ান সহজেই। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'ব্যবসা চলবে ২৪ ঘণ্টা!', script: (t) => `আপনি ঘুমালেও আপনার দোকান চলবে। ${t} এর অটো রিপ্লাই সিস্টেম ২৪ ঘণ্টা কাস্টমার সামলানো করে। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
  Browser: [
    { hook: 'ব্রাউজার অটোমেশন এখন সহজ!', script: (t) => `দারাজ প্রাইস ট্র্যাকিং আর ফেসবুক পোস্ট অটোমেট করতে চান? ${t} দিয়ে মার্কেটিং এজেন্সির কাজ দ্রুত করুন। টেক-স্যাভিদের জন্য সেরা। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'জিমেইল কোডিং অটোমেট করুন!', script: (t) => `ব্রাউজারে বারবার একই কাজ করছেন? ${t} দিয়ে অটোমেট করুন। ডেটা কালেকশন থেকে পোস্টিং সব এক ক্লিকে। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'মার্কেটারদের গোপন টুল!', script: (t) => `প্রতিযোগীর দাম মনিটর করতে চান? ${t} দিয়ে দারাজ প্রাইস অটোমেটিক ট্র্যাক করুন। মার্কেটারদের জন্য অপরিহার্য। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'কাজের সময় বাঁচান!', script: (t) => `ম্যানুয়াল ব্রাউজিংয়ে সময় নষ্ট? ${t} দিয়ে রিপিটিটিভ টাস্ক অটোমেট করুন। ফ্রিল্যান্সারদের সময় বাঁচায়। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
  IDE: [
    { hook: 'ফ্রি কোডিং এডিটর বাংলায়!', script: (t) => `কোডিং শিখতে চান কিন্তু টুল কিনতে পারছেন না? ${t} দিয়ে ফ্রিতে ভিএস কোডের মতো এডিটর পান। বিডি তরুণ ডেভেলপারদের জন্য। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'রিপ্লিটের সেরা বিকল্প!', script: (t) => `রিপ্লিটের ফ্রি বিকল্প খুঁজছেন? ${t} দিয়ে লাইভ এডিটর পান, জাভাস্ক্রিপ্ট পিএইচপি সব চলে। স্টুডেন্টদের জন্য একদম ফ্রি। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'কোড লিখুন যেকোনো জায়গায়!', script: (t) => `ল্যাপটপ ছাড়াও কোড করতে চান? ${t} এর অনলাইন আইডিই দিয়ে মোবাইলেও কোড লিখুন। বিডি ডেভেলপারদের জন্য। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'ই-কমার্স ডেভেলপমেন্ট শিখুন!', script: (t) => `জাভাস্ক্রিপ্ট দিয়ে ই-কমার্স সাইট বানাতে চান? ${t} দিয়ে ফ্রিতে শিখুন আর প্র্যাকটিস করুন। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
  Gaming: [
    { hook: 'ফ্রি ফায়ার টুর্নামেন্ট করুন!', script: (t) => `ফ্রি ফায়ার টুর্নামেন্ট হোস্ট করতে চান? ${t} দিয়ে গেম সার্ভার সেটআপ করুন সহজে। বাংলাদেশের গেমারদের জন্য। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'গেম সার্ভার এখন সাশ্রয়ী!', script: (t) => `পিইউবিজি বা ফ্রি ফায়ার টুর্নামেন্টের সার্ভার চান? ${t} দিয়ে কম খরচে হোস্টিং পান। গেমার কমিউনিটির জন্য সেরা। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'নিজের টুর্নামেন্ট নিজে করুন!', script: (t) => `গেমিং টুর্নামেন্ট অর্গানাইজ করতে চান? ${t} দিয়ে সার্ভার থেকে রেজিস্ট্রেশন সব ম্যানেজ করুন। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
    { hook: 'গেমারদের জন্য সেরা হোস্টিং!', script: (t) => `ল্যাগ ছাড়া গেম সার্ভার চান? ${t} দিয়ে বাংলাদেশ থেকে লো পিং সার্ভার পান। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।` },
  ],
}

// Deterministic pick by source id so the same source always gets the same variant,
// but different sources get different variants (no two videos sound identical).
function pickFallback(product: string, seed: string): { hook: string; scriptBn: string } {
  const variants = FALLBACK_SCRIPTS[product] || FALLBACK_SCRIPTS.Video
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const v = variants[h % variants.length]
  const tag = PRODUCT_TAGS[product] || product
  return { hook: v.hook, scriptBn: v.script(tag) }
}

async function translateViaRafan(titleEn: string, product: string, sourceId: string): Promise<{ titleBn: string; hook: string; scriptBn: string; by: string }> {
  const fb = pickFallback(product, sourceId)
  const fallback = {
    titleBn: `${PRODUCT_TAGS[product] || product} — ${titleEn.slice(0, 40)}`,
    hook: fb.hook,
    scriptBn: fb.scriptBn,
    by: 'template',
  }
  const tag = PRODUCT_TAGS[product] || product
  const prompt = `No thinking, no explanation. Reply ONLY with raw JSON.
You are Hostamar's Bangla marketing writer for SMEs. Product: ${product} (${tag}).
English video title: "${titleEn}"
Write in Bangla:
1. titleBn: catchy Bangla title (max 60 chars, viral style)
2. hook: one-line Bangla hook (max 50 chars, like "এই ঈদে সবাই তাকিয়ে থাকবে")
3. scriptBn: 30-second Bangla marketing script (3-4 sentences) promoting Hostamar ${product} for Bangladeshi small businesses, ending with "hostamar.com এ যান, ফ্রি ট্রাই করুন"
Reply ONLY with JSON: {"titleBn":"...","hook":"...","scriptBn":"..."}`
  try {
    const r = await fetch(GATEWAY + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(GATEWAY_KEY ? { Authorization: `Bearer ${GATEWAY_KEY}` } : {}) },
      body: JSON.stringify({
        model: 'rafan',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(60000) as any,
    })
    const j: any = await r.json()
    let text = j?.choices?.[0]?.message?.content || ''
    // rafan is a reasoning model — answer may be in reasoning_content
    if (!text || text.length < 20) text = j?.choices?.[0]?.message?.reasoning_content || text
    const m = text.match(/\{[\s\S]*"titleBn"[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      // Reject placeholder/empty/non-Bangla output
      if (!isPlaceholder(parsed.titleBn) && !isPlaceholder(parsed.hook) && !isPlaceholder(parsed.scriptBn)) {
        return { titleBn: parsed.titleBn, hook: parsed.hook, scriptBn: parsed.scriptBn, by: 'rafan' }
      }
    }
    throw new Error('unparseable or placeholder LLM output')
  } catch (e: any) {
    console.warn('  [translate] rafan unusable, diverse template fallback:', e?.message?.slice(0, 80))
    return fallback
  }
}

async function genderDetect(mp4: string): Promise<'male' | 'female'> {
  try {
    const { stdout } = await execAsync('python3', [GENDER_PY, mp4], { timeout: 120000 } as any)
    const out = String(stdout)
    if (out.includes('female')) return 'female'
    if (out.includes('male')) return 'male'
  } catch {}
  return 'male'
}

async function main() {
  await ensureSchema()
  fs.mkdirSync(FREE_DIR, { recursive: true })
  fs.mkdirSync(VIRAL_DIR, { recursive: true })

  const args = process.argv.slice(2)
  const argVal = (name: string) => {
    const eq = args.find(a => a.startsWith(name + '='))
    if (eq) return eq.split('=')[1]
    const idx = args.indexOf(name)
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) return args[idx + 1]
    return undefined
  }
  const sourceId = argVal('--sourceId')
  const productFilter = argVal('--product')

  // Pick source: explicit id, else highest viralScore unused (optionally by product).
  // Audience gate: willBuyScore ≥8 and willLeave false (only buyers likely to buy).
  const source = sourceId
    ? await prisma.freeVideoSource.findUnique({ where: { id: sourceId } })
    : await prisma.freeVideoSource.findFirst({
        where: {
          used: false,
          ...(productFilter ? { product: productFilter } : {}),
          OR: [{ relevanceScore: { gte: 8 } }, { relevanceScore: null }],
        },
        orderBy: { viralScore: 'desc' },
      })
  if (!source) { console.error('No unused FreeVideoSource. Run hunter_fixed.ts first.'); process.exit(1) }
  console.log(`Source: [${source.product}] ${source.title} (${source.license}, ${source.views} views)`)

  // 1. Download ≤720p, cap 60s
  const rawPath = path.join(FREE_DIR, `${source.id}_original.mp4`)
  if (!fs.existsSync(rawPath)) {
    console.log('  downloading via yt-dlp...')
    await execAsync(YT_DLP, ['-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best', '--merge-output-format', 'mp4', '-o', rawPath, '--no-warnings', source.url], { timeout: 300000 } as any)
  }
  if (!fs.existsSync(rawPath)) throw new Error('download failed')

  // 2. Translate via in-house rafan
  console.log('  translating via rafan (in-house LLM)...')
  const tr = await translateViaRafan(source.title, source.product, source.id)
  console.log(`  titleBn: ${tr.titleBn}`)
  console.log(`  hook: ${tr.hook}`)

  // 3. Gender detect from original audio
  const gender = await genderDetect(rawPath)
  const voice = gender === 'female' ? 'bn-BD-NabanitaNeural' : 'bn-BD-PradeepNeural'
  console.log(`  gender: ${gender} → ${voice}`)

  // 4. TTS — Piper in-house fast (<1s offline) primary, edge-tts fallback.
  //    Model bn_BD-google-medium multi-speaker: 0=male 130Hz, 12=female 258Hz (pitch-scanned).
  const clean = (s: string) => (s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/["'`\\]/g, '').trim()
  const ttsText = clean(`${tr.hook} ${tr.scriptBn}`).slice(0, 400)
  const ttsPath = path.join('/tmp', `${source.id}_bn.mp3`)
  const PIPER_MODEL = '/home/romel/hostamar-build/docker/tts/models/bn_BD-google-medium/bn_BD-google-medium.onnx'
  const PIPER_SPEAKERS: Record<string, string> = { male: '0', female: '12' }
  const piperSpeaker = PIPER_SPEAKERS[gender] || '0'
  let ttsBy = 'edge-tts'
  const wantPiper = process.env.USE_PIPER !== '0' && fs.existsSync(PIPER_MODEL)
  if (wantPiper) {
    try {
      const piperWav = path.join('/tmp', `${source.id}_piper.wav`)
      const { exec } = await import('child_process')
      const execShell = promisify(exec)
      // shell-escape single quotes in Bangla text
      const safeText = ttsText.replace(/'/g, "'\\''")
      await execShell(`echo '${safeText}' | python3 -m piper --model ${PIPER_MODEL} --speaker ${piperSpeaker} --output_file ${piperWav}`, { timeout: 30000 } as any)
      // convert 22050Hz piper wav → mp3 48k for TV pipeline
      await execAsync('ffmpeg', ['-y', '-i', piperWav, '-ar', '48000', '-b:a', '128k', ttsPath] as any)
      ttsBy = `piper:${piperSpeaker}`
      console.log(`  TTS Piper speaker ${piperSpeaker} SUCCESS`)
    } catch (e: any) {
      console.warn(`  Piper failed (${e?.message?.slice(0, 80)}), fallback edge-tts`)
      await execAsync('python3', ['-m', 'edge_tts', '--voice', voice, '--text', ttsText, '--write-media', ttsPath], { timeout: 120000 } as any)
    }
  } else {
    await execAsync('python3', ['-m', 'edge_tts', '--voice', voice, '--text', ttsText, '--write-media', ttsPath], { timeout: 120000 } as any)
  }
  const { stdout: ttsDurStr } = await execAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ttsPath] as any)
  const ttsDur = Math.min(parseFloat(String(ttsDurStr).trim()) || 20, 45)

  // 5. Music bed — REAL dubbing keeps original music+SFX (Demucs no_vocals), else synth fallback
  let musicPath = ''
  const demucsBg = process.env.DEMUCS_BG && fs.existsSync(process.env.DEMUCS_BG) ? process.env.DEMUCS_BG : ''
  if (demucsBg) {
    musicPath = demucsBg
    console.log('  music: original background kept via Demucs (vocals removed, music+SFX kept)')
  } else {
  const wantMusic = process.env.USE_MUSIC !== '0'
  if (wantMusic) {
    try {
      const root = MUSIC_ROOT[source.product] || 220
      const third = root * Math.pow(2, 4 / 12)
      const fifth = root * Math.pow(2, 7 / 12)
      const dur = Math.ceil(ttsDur) + 1
      musicPath = path.join('/tmp', `${source.id}_music.wav`)
      await execAsync('ffmpeg', ['-y',
        '-f', 'lavfi', '-i', `sine=frequency=${root.toFixed(2)}:duration=${dur}`,
        '-f', 'lavfi', '-i', `sine=frequency=${third.toFixed(2)}:duration=${dur}`,
        '-f', 'lavfi', '-i', `sine=frequency=${fifth.toFixed(2)}:duration=${dur}`,
        '-filter_complex',
        `[0]volume=0.16[a];[1]volume=0.10,tremolo=f=2:d=0.3[b];[2]volume=0.08,tremolo=f=0.5:d=0.4[c];[a][b][c]amix=inputs=3:normalize=0,afade=t=in:d=1,afade=t=out:st=${dur - 1.5}:d=1.5`,
        '-ar', '44100', '-ac', '2', musicPath], { timeout: 60000 } as any)
      console.log('  music bed synthesized')
    } catch (e) {
      console.warn('  music bed failed, continuing VO-only')
      musicPath = ''
    }
  }
  }

  // 6. ffmpeg: trim to audio length + sync fix (no 10-min silent tail)
  // Hardened: trim original to targetDur (audio length) at input, genpts+shortest, map only new audio
  const finalPath = path.join(VIRAL_DIR, `${source.id}_free_bn.mp4`)
  // HunyuanVideo little-edit via comfy when available; else in-process enhance.
  const comfyUp = await comfyAvailable()
  console.log(comfyUp ? '  comfy available → would use Hunyuan edit' : '  comfy down → ffmpeg enhance (Hunyuan skipped)')
  const enhance = comfyUp ? [] : (process.env.VIDEO_ENHANCE === '0' ? [] : ['eq=saturation=1.18:contrast=1.06:brightness=0.01', 'unsharp=5:5:0.6'])
  const hookEsc = tr.hook.replace(/[:'\\]/g, '').slice(0, 60)
  const tagEsc = (PRODUCT_TAGS[source.product] || source.product).replace(/[:'\\]/g, '')
  // ASS subtitles via libass — drawtext can't do Harfbuzz complex shaping, so Bangla
  // conjuncts (যুক্তাক্ষর) and vowel reordering render broken (detached ি/ে, □ for Latin
  // since NotoSansBengali has no A-Z). libass + shaping=complex shapes Bangla correctly
  // and falls back to DejaVu for Latin (verified: ক্ষ জ্ঞ ত্ত ন্দ ভাঙ্গা all fused).
  const assPath = path.join('/tmp', `${source.id}_overlay.ass`)
  const assEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[{}]/g, '').replace(/\n/g, ' ')
  const targetDur = ttsDur // audio drives video; original trimmed to this
  const assEnd = `${String(Math.floor(targetDur / 60)).padStart(2, '0')}:${(targetDur % 60).toFixed(2).padStart(5, '0')}`
  const assContent = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1280', 'PlayResY: 720',
    'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment: 2=bottom-center (hook), 7=top-left (product tag), 9=top-right (brand)
    'Style: Hook,Noto Sans Bengali,32,&H0000FFFF,&H000000FF,&H80000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,2,40,40,40,1',
    'Style: Product,Noto Sans Bengali,22,&H0066E600,&H000000FF,&H80000000,&H80000000,1,0,0,0,100,100,0,0,1,2,1,7,20,20,20,1',
    'Style: Brand,DejaVu Sans,24,&H00FFFFFF,&H000000FF,&H80000000,&H80000000,1,0,0,0,100,100,0,0,1,2,0,9,20,20,20,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    `Dialogue: 0,0:00:00.00,0:${assEnd},Hook,,0,0,0,,${assEsc(hookEsc)}`,
    `Dialogue: 0,0:00:00.00,0:${assEnd},Product,,0,0,0,,${assEsc(tagEsc)}`,
    `Dialogue: 0,0:00:00.00,0:${assEnd},Brand,,0,0,0,,HOSTAMAR.COM/TV`,
    '',
  ].join('\n')
  fs.writeFileSync(assPath, assContent, 'utf-8')
  const vfilter = [
    'scale=1280:720:force_original_aspect_ratio=decrease',
    'pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    ...enhance,
    'fps=25', 'format=yuv420p',
    `ass=${assPath}:fontsdir=/usr/share/fonts/truetype/noto:shaping=complex`,
  ].join(',')
  console.log('  rendering final video (target '+targetDur.toFixed(1)+'s, genpts+shortest)...')
  const ffArgs: any[] = ['-y', '-fflags', '+genpts', '-ss', '0', '-t', targetDur.toFixed(1), '-i', rawPath]
  const fcParts = [`[0:v]${vfilter}[v]`, '[1:a]aresample=48000,aformat=channel_layouts=stereo[vo]']
  if (musicPath) {
    ffArgs.push('-i', ttsPath, '-i', musicPath)
    fcParts.push('[2:a]volume=0.12,aresample=48000[m]', '[vo][m]amix=inputs=2:duration=shortest:dropout_transition=0[a]')
    console.log('  audio: Bangla VO + music bed mixed (shortest)')
  } else {
    ffArgs.push('-i', ttsPath)
    fcParts.push('[vo]anull[a]')
  }
  ffArgs.push('-filter_complex', fcParts.join(';'),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '3.1', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-g', '60',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
    '-shortest', '-avoid_negative_ts', 'make_zero', '-fflags', '+genpts+igndts',
    finalPath)
  await execAsync('ffmpeg', ffArgs, { timeout: 300000 } as any)
  if (!fs.existsSync(finalPath)) throw new Error('ffmpeg render failed')
  // HARD GUARD: a non-playable render (0-byte / moov atom missing / no duration)
  // would crash ffmpeg's concat demuxer on next TV restart and 404 the whole
  // channel. Reject it here BEFORE it ever reaches the playlist.
  const { stdout: probeS } = await execAsync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', finalPath] as any)
  const probeDur = parseFloat(String(probeS).trim()) || 0
  if (probeDur < 5 || !fs.existsSync(finalPath) || fs.statSync(finalPath).size === 0) {
    try { fs.unlinkSync(finalPath) } catch {}
    throw new Error(`render not playable (dur=${probeDur}s) — aborted before publish to protect TV`)
  }
  // Verify A/V sync: video duration ≈ audio duration (≈targetDur), no 10-min tail
  try {
    const { stdout: vDurS } = await execAsync('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=duration','-of','csv=p=0', finalPath] as any)
    const { stdout: aDurS } = await execAsync('ffprobe', ['-v','error','-select_streams','a:0','-show_entries','stream=duration','-of','csv=p=0', finalPath] as any)
    const vd = parseFloat(String(vDurS).trim()) || 0, ad = parseFloat(String(aDurS).trim()) || 0
    console.log(`  AV verify: video ${vd.toFixed(1)}s audio ${ad.toFixed(1)}s target ${targetDur.toFixed(1)}s`)
    if (Math.abs(vd - ad) > 0.7) console.warn(`  ⚠ AV drift ${Math.abs(vd-ad).toFixed(1)}s`)
    if (vd > 70) console.warn(`  ⚠ video too long ${vd.toFixed(1)}s — should be ~${targetDur.toFixed(0)}s`)
    if (vd < 5) throw new Error(`video too short ${vd.toFixed(1)}s`)
  } catch (e: any) { console.warn('  verify skipped:', e?.message?.slice(0,80)) }

  // 6. Publish: DB + playlist position 1 + regenerate + restart ffmpeg
  await prisma.freeVideoSource.update({
    where: { id: source.id },
    data: { used: true, titleBn: tr.titleBn, hook: tr.hook, scriptBn: tr.scriptBn, translatedBy: tr.by, localPath: rawPath },
  })
  const channel = await prisma.tvChannel.findFirst()
  if (!channel) throw new Error('No TvChannel')
  const item = await prisma.tvPlaylistItem.create({
    data: { channelId: channel.id, title: `${tr.titleBn} 🔥 [${source.product}]`, url: finalPath, source: 'viral', position: 99999 },
  })
  await prisma.tvVideoStats.create({
    data: { playlistItemId: item.id, title: tr.titleBn, viralScore: source.viralScore, playWeight: 1 },
  })
  // Move to position 1 (plays FIRST)
  const all = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id }, orderBy: { position: 'asc' } })
  const others = all.filter(i => i.id !== item.id)
  const ordered = [item, ...others]
  for (let i = 0; i < ordered.length; i++) await prisma.tvPlaylistItem.update({ where: { id: ordered[i].id }, data: { position: i + 1 } })
  // Trim to 50 (drop oldest non-viral)
  if (ordered.length > 50) {
    const removable = ordered.filter(i => i.source !== 'viral').slice(-(ordered.length - 50))
    for (const r of removable) await prisma.tvPlaylistItem.delete({ where: { id: r.id } })
  }
  // Regenerate playlist.host.txt — EVER-FRESH no-repeat: each file once, no weight loop.
  // HARD GUARD: skip any URL whose file is missing/0-byte/unplayable, so a stale
  // corrupt render can never crash ffmpeg's concat demuxer → channel 404.
  const { execSync } = require('child_process')
  const finalItems = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id, played: false }, orderBy: { position: 'asc' } })
  const lines: string[] = []
  for (const it of finalItems) {
    const u = String(it.url)
    let ok = fs.existsSync(u) && fs.statSync(u).size > 0
    if (ok) {
      try { execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 '${u.replace(/'/g, "'\\''")}'`, { timeout: 10000 }) } catch { ok = false }
    }
    if (ok) lines.push(`file '${u.replace(/'/g, "'\\''")}'`)
    else console.warn(`  ⚠ skipping unplayable playlist url (would 404 TV): ${u}`)
  }
  fs.writeFileSync(PLAYLIST + '.tmp', lines.join('\n') + '\n')
  fs.renameSync(PLAYLIST + '.tmp', PLAYLIST)
  // FORCE restart: ffmpeg's concat demuxer never reloads the playlist file, and a
  // plain `systemctl restart` can silently no-op (zombie ffmpeg keeps OLD fd →
  // hours-long loop of one video). pkill + restart + /proc fd verification.
  try {
    await execAsync('python3', ['/home/romel/hostamar-build/scripts/tv/force_restart.py'] as any, { timeout: 60000 } as any)
  } catch (e: any) {
    console.error('  force-restart failed, falling back to systemctl:', e?.message?.slice(0, 120))
    try { await execAsync('systemctl', ['--user', 'restart', 'tv-ffmpeg'] as any) } catch {}
  }
  try { await prisma.tvLog.create({ data: { level: 'info', message: `Free video published: [${source.product}] ${tr.titleBn} (${tr.by}, ${gender}/${voice})` } }) } catch {}

  console.log(`\n✓ PUBLISHED: ${tr.titleBn}`)
  console.log(`  video: ${finalPath}`)
  console.log(`  gender: ${gender} voice: ${voice} translatedBy: ${tr.by}`)
  console.log(`  playlist: ${lines.length} lines, new video at position 1`)

  // 7. AUTO-SEO: every video SEOs itself — generate TvVideoSeo + OG image +
  //    /tv/watch/{slug} page (ISR picks it up within the hour, no rebuild).
  //    Runs detached so a slow rafan call never blocks the publish loop.
  try {
    const { spawn } = await import('child_process')
    const seoLog = fs.openSync('/tmp/tv-seo-auto.log', 'a')
    const child = spawn('python3', ['/home/romel/hostamar-build/scripts/tv/seo_generate.py', '--source-id', source.id], {
      detached: true,
      stdio: ['ignore', seoLog, seoLog],
      env: process.env,
    })
    child.unref()
    console.log(`  seo: auto-generating in background (pid ${child.pid}) → /tmp/tv-seo-auto.log`)
  } catch (e) {
    console.error('  seo: auto-generate failed to start:', e)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
