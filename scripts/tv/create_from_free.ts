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
const envObj: Record<string, string | undefined> = process.env as any
const KEY_NAME = ['HERMES', 'CUSTOM', 'HOSTAMAR', 'COM', 'API', 'KEY'].join('_')
const GATEWAY_KEY = envObj[KEY_NAME] || ''

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

async function translateViaRafan(titleEn: string, product: string): Promise<{ titleBn: string; hook: string; scriptBn: string; by: string }> {
  const fallback = {
    titleBn: `${PRODUCT_TAGS[product] || product} — ${titleEn.slice(0, 40)}`,
    hook: `${PRODUCT_TAGS[product] || product} এখন ফ্রি!`,
    scriptBn: `আসসালামু আলাইকুম। ${PRODUCT_TAGS[product] || product} নিযে এলাম আপনাদের জন্য। বাংলাদেশের ছোট ব্যবসার জন্য সেরা সমাধান। আজই hostamar.com এ যান, ফ্রি ট্রাই করুন।`,
    by: 'template',
  }
  const tag = PRODUCT_TAGS[product] || product
  const prompt = `You are Hostamar's Bangla marketing writer for SMEs. Product: ${product} (${tag}).
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
        max_tokens: 600,
        stream: false,
      }),
      signal: AbortSignal.timeout(180000) as any,
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
    console.warn('  [translate] rafan unusable, template fallback:', e?.message?.slice(0, 80))
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
  const sourceId = args.find(a => a.startsWith('--sourceId='))?.split('=')[1]
  const productFilter = args.find(a => a.startsWith('--product='))?.split('=')[1]

  // Pick source: explicit id, else highest viralScore unused (optionally by product)
  const source = sourceId
    ? await prisma.freeVideoSource.findUnique({ where: { id: sourceId } })
    : await prisma.freeVideoSource.findFirst({
        where: { used: false, ...(productFilter ? { product: productFilter } : {}) },
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
  const tr = await translateViaRafan(source.title, source.product)
  console.log(`  titleBn: ${tr.titleBn}`)
  console.log(`  hook: ${tr.hook}`)

  // 3. Gender detect from original audio
  const gender = await genderDetect(rawPath)
  const voice = gender === 'female' ? 'bn-BD-NabanitaNeural' : 'bn-BD-PradeepNeural'
  console.log(`  gender: ${gender} → ${voice}`)

  // 4. TTS (strip emoji/special chars that break edge-tts)
  const clean = (s: string) => (s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/["'`\\]/g, '').trim()
  const ttsText = clean(`${tr.hook} ${tr.scriptBn}`).slice(0, 400)
  const ttsPath = path.join('/tmp', `${source.id}_bn.mp3`)
  await execAsync('python3', ['-m', 'edge_tts', '--voice', voice, '--text', ttsText, '--write-media', ttsPath], { timeout: 120000 } as any)
  const { stdout: ttsDurStr } = await execAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ttsPath] as any)
  const ttsDur = Math.min(parseFloat(String(ttsDurStr).trim()) || 20, 45)

  // 5. ffmpeg: trim + watermark + hook + product tag
  const finalPath = path.join(VIRAL_DIR, `${source.id}_free_bn.mp4`)
  const hookEsc = tr.hook.replace(/[:'\\]/g, '').slice(0, 60)
  const tagEsc = (PRODUCT_TAGS[source.product] || source.product).replace(/[:'\\]/g, '')
  const font = fs.existsSync(BENGALI_FONT) ? BENGALI_FONT : LATIN_FONT
  const ff = font.replace(/:/g, '\\:')
  const vfilter = [
    'scale=1280:720:force_original_aspect_ratio=decrease',
    'pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    'fps=25', 'format=yuv420p',
    `drawtext=fontfile=${ff}:text=HOSTAMAR.COM/TV:fontcolor=white:fontsize=28:box=1:boxcolor=black@0.45:boxborderw=8:x=w-tw-20:y=20`,
    `drawtext=fontfile=${ff}:text=${hookEsc}:fontcolor=yellow:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=6:x=(w-text_w)/2:y=h-th-30`,
    `drawtext=fontfile=${ff}:text=${tagEsc}:fontcolor=#00E676:fontsize=22:box=1:boxcolor=black@0.5:boxborderw=5:x=20:y=20`,
  ].join(',')
  console.log('  rendering final video...')
  await execAsync('ffmpeg', ['-y', '-i', rawPath, '-i', ttsPath,
    '-filter_complex', `[0:v]${vfilter}[v];[1:a]aresample=44100,aformat=channel_layouts=stereo[a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', ttsDur.toFixed(1), finalPath], { timeout: 300000 } as any)
  if (!fs.existsSync(finalPath)) throw new Error('ffmpeg render failed')

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
  // Regenerate playlist.host.txt with weights
  const finalItems = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id }, orderBy: { position: 'asc' } })
  const stats = await prisma.tvVideoStats.findMany({ where: { playlistItemId: { in: finalItems.map(i => i.id) } } })
  const wmap = new Map(stats.map(s => [s.playlistItemId, s.playWeight]))
  const lines: string[] = []
  for (const it of finalItems) {
    const w = wmap.get(it.id) || 1
    for (let k = 0; k < w; k++) lines.push(`file '${it.url}'`)
  }
  fs.writeFileSync(PLAYLIST + '.tmp', lines.join('\n') + '\n')
  fs.renameSync(PLAYLIST + '.tmp', PLAYLIST)
  try { await execAsync('systemctl', ['--user', 'restart', 'tv-ffmpeg'] as any) } catch {}
  try { await prisma.tvLog.create({ data: { level: 'info', message: `Free video published: [${source.product}] ${tr.titleBn} (${tr.by}, ${gender}/${voice})` } }) } catch {}

  console.log(`\n✓ PUBLISHED: ${tr.titleBn}`)
  console.log(`  video: ${finalPath}`)
  console.log(`  gender: ${gender} voice: ${voice} translatedBy: ${tr.by}`)
  console.log(`  playlist: ${lines.length} lines, new video at position 1`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
