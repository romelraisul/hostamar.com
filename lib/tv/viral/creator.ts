/**
 * Viral video creator — turns a ViralTrend into a watermarked Bangla TV video.
 * Uses Hostamar's existing pipeline: hook + script generation (template + LLM fallback),
 * gender-aware edge-tts, Pexels stock or placeholder, normalize watermark.
 * Publishes to TvPlaylistItem and bumps play weight.
 */
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(execFile)
const VIRAL_DIR = '/home/romel/hostamar-build/docker/tv-station/videos/viral'

const HOOK_TEMPLATES: Record<string, string[]> = {
  fashion: ['এই ঈদে সবাই তাকিয়ে থাকবে 😍', 'ভাইরাল ফ্যাশন — এখনই দেখুন ✨', 'Daraz-এ হিট — স্টক শেষ হওয়ার আগে! 🔥'],
  beauty: ['রূপের জাদু — আজই ট্রাই করুন 💄', 'ভাইরাল বিউটি হ্যাক ✨'],
  ecommerce: ['Daraz বেস্টসেলার — মিস করবেন না 🛒', 'অফার শেষ হওয়ার আগে! ⚡'],
  food: ['ভাইরাল রেসিপি — ঘরেই বানান 🍳', 'মুখে পানি আসবেই 😋'],
  general: ['ভাইরাল এখন বাংলাদেশে 🔥', 'ট্রেন্ডিং — এখনই দেখুন 👀'],
}

const SCRIPT_TEMPLATES: Record<string, string> = {
  fashion: 'আসসালামু আলাইকুম। হোস্টামার টিভিতে স্বাগতম। আজকের ভাইরাল: {title}. বাংলাদেশের সেরা ফ্যাশন এখন Daraz-এ। অর্ডার করুন, হোম ডেলিভারি পান। বিকাশ পেমেন্ট।',
  beauty: 'আসসালামু আলাইকুম। আজকের ভাইরাল বিউটি ট্রেন্ড: {title}। ঘরে বসে রূপচর্চা করুন।',
  ecommerce: 'আসসালামু আলাইকুম। Daraz বেস্টসেলার: {title}। সীমিত স্টক, দ্রুত অর্ডার করুন।',
  food: 'আসসালামু আলাইকুম। ভাইরাল রেসিপি: {title}। ঘরেই বানান সহজে।',
  general: 'আসসালামু আলাইকুম। হোস্টামার টিভিতে এখন: {title}। বাংলাদেশের ভাইরাল ট্রেন্ড।',
}

function pickHook(category: string): string {
  const arr = HOOK_TEMPLATES[category] || HOOK_TEMPLATES.general
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildScript(titleBn: string, category: string): string {
  const tmpl = SCRIPT_TEMPLATES[category] || SCRIPT_TEMPLATES.general
  return tmpl.replace('{title}', titleBn)
}

function hashtagsFor(category: string, titleBn: string): string {
  const base = ['#HostamarTV', '#Bangladesh', '#ViralBD']
  if (category === 'fashion') base.push('#FashionBD', '#EidCollection', '#DarazFashion')
  if (category === 'beauty') base.push('#BeautyBD')
  if (category === 'ecommerce') base.push('#Daraz', '#OnlineShopping')
  if (category === 'food') base.push('#RecipeBD')
  return base.join(' ')
}

async function edgeTTS(text: string, voice: string, outPath: string): Promise<void> {
  // Use python edge-tts (free, already installed for bangla-dub pipeline)
  await execAsync('python3', ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', outPath] as any)
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) throw new Error('TTS failed')
}

async function fetchPexelsVideo(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  try {
    const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`, {
      headers: { Authorization: key }, signal: AbortSignal.timeout(15000) as any,
    } as any)
    const j: any = await r.json()
    const v = j?.videos?.[0]
    const file = v?.video_files?.find((f: any) => f.width >= 960 && f.width <= 1920) || v?.video_files?.[0]
    if (!file?.link) return null
    const tmp = path.join('/tmp', `pexels_${Date.now()}.mp4`)
    const resp = await fetch(file.link, { signal: AbortSignal.timeout(60000) as any } as any)
    const buf = Buffer.from(await (resp as any).arrayBuffer())
    fs.writeFileSync(tmp, buf)
    return tmp
  } catch { return null }
}

export interface CreateResult {
  viralVideoId: string
  playlistItemId: string
  videoUrl: string
  titleBn: string
  hook: string
  gender: string
  voiceUsed: string
}

export async function createViralVideo(viralTrendId: string): Promise<CreateResult> {
  await ensureSchema()
  const trend = await prisma.viralTrend.findUnique({ where: { id: viralTrendId } })
  if (!trend) throw new Error('ViralTrend not found')
  if (trend.videoCreated) throw new Error('Video already created for this trend')

  const titleBn = trend.titleBn || trend.title
  const category = trend.category || 'general'
  const hook = pickHook(category)
  const scriptBn = buildScript(titleBn, category)
  const hashtags = hashtagsFor(category, titleBn)
  const fullText = `${hook} ${scriptBn}`
  // Gender by category: fashion/beauty -> female
  const gender = (category === 'fashion' || category === 'beauty') ? 'female' : 'male'
  const voiceUsed = gender === 'female' ? 'bn-BD-NabanitaNeural' : 'bn-BD-PradeepNeural'

  fs.mkdirSync(VIRAL_DIR, { recursive: true })
  const baseName = `${trend.id}_viral_bn`
  const wavPath = path.join('/tmp', `${baseName}.mp3`)
  const rawVideo = path.join('/tmp', `${baseName}_raw.mp4`)
  const finalPath = path.join(VIRAL_DIR, `${baseName}.mp4`)

  // 1. TTS
  await edgeTTS(fullText, voiceUsed, wavPath)

  // 2. Video source: try Pexels, else use existing demo as base
  let srcVideo: string | null = await fetchPexelsVideo(category === 'fashion' ? 'fashion model Bangladesh' : category === 'food' ? 'cooking' : 'business marketing')
  if (!srcVideo) {
    // fallback: duplicate a normalized demo and extend with audio
    const demos = fs.readdirSync('/home/romel/hostamar-build/docker/tv-station/videos/normalized').filter(f => f.endsWith('.mp4'))
    srcVideo = demos.length ? path.join('/home/romel/hostamar-build/docker/tv-station/videos/normalized', demos[0]) : null
    if (!srcVideo) throw new Error('No source video available')
    // copy to tmp for processing
    const tmpCopy = path.join('/tmp', `${baseName}_src.mp4`)
    fs.copyFileSync(srcVideo, tmpCopy)
    srcVideo = tmpCopy
  }

  // 3. Mux audio + burn hook subtitle + watermark via ffmpeg
  // Use normalize's watermark filter via direct ffmpeg
  const hookEsc = hook.replace(/:/g, '\\:').replace(/'/g, '').slice(0, 60)
  const fontCandidates = ['/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
  const hookFont = '/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf'
  const font = fontCandidates.find(f => fs.existsSync(f))
  const drawtextWatermark = font
    ? `drawtext=fontfile=${font.replace(/:/g, '\\:')}:text=HOSTAMAR.COM/TV:fontcolor=white:fontsize=28:box=1:boxcolor=black@0.45:boxborderw=8:x=w-tw-20:y=20`
    : `drawtext=text=HOSTAMAR.COM/TV:fontcolor=white:fontsize=28:box=1:boxcolor=black@0.45:boxborderw=8:x=w-tw-20:y=20`
  const hookFontFile = fs.existsSync(hookFont) ? hookFont : font!
  const hookText = `drawtext=fontfile=${hookFontFile.replace(/:/g, '\\:')}:text=${hookEsc}:fontcolor=yellow:fontsize=32:box=1:boxcolor=black@0.6:boxborderw=6:x=(w-text_w)/2:y=h-th-30`

  const vfilter = `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p,${drawtextWatermark},${hookText}`

  // Probe durations
  const { stdout: durStr } = await execAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', srcVideo] as any).catch(() => ({ stdout: '30' } as any))
  const srcDur = parseFloat(String(durStr).trim()) || 30
  const { stdout: ttsDurStr } = await execAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavPath] as any).catch(() => ({ stdout: '15' } as any))
  let ttsDur = parseFloat(String(ttsDurStr).trim()) || 15
  // Loop source if shorter than TTS
  const loopNeeded = ttsDur > srcDur ? Math.ceil(ttsDur / srcDur) : 1
  const targetDur = Math.max(srcDur * loopNeeded, ttsDur + 2)

  // Build concat if looping
  let inputArgs: string[] = []
  if (loopNeeded > 1) {
    // create concat list
    const listPath = path.join('/tmp', `${baseName}_list.txt`)
    fs.writeFileSync(listPath, Array(loopNeeded).fill(`file '${srcVideo}'`).join('\n'))
    inputArgs = ['-f', 'concat', '-safe', '0', '-i', listPath]
  } else {
    inputArgs = ['-i', srcVideo]
  }

  await execAsync('ffmpeg', ['-y', ...inputArgs, '-i', wavPath, '-filter_complex', `[0:v]${vfilter}[v];[1:a]aresample=44100,aformat=channel_layouts=stereo,apad,atrim=0:${targetDur.toFixed(1)}[a]`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-t', `${Math.min(targetDur, 45).toFixed(1)}`, finalPath] as any)

  // Cleanup
  for (const p of [wavPath, rawVideo]) try { fs.unlinkSync(p) } catch {}
  if (srcVideo.startsWith('/tmp/pexels_') || srcVideo.includes('_src.mp4')) try { fs.unlinkSync(srcVideo) } catch {}

  const { stdout: finalDurStr } = await execAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', finalPath] as any).catch(() => ({ stdout: '0' } as any))
  const duration = Math.round(parseFloat(String(finalDurStr).trim()) || 0)

  // 4. DB records
  const viralVideo = await prisma.viralVideo.create({
    data: {
      viralTrendId: trend.id,
      titleBn,
      hook,
      scriptBn,
      hashtags,
      category,
      videoUrl: finalPath,
      duration,
      gender,
      voiceUsed,
      viralScore: trend.viralScore,
      status: 'READY',
    },
  })

  await prisma.viralTrend.update({ where: { id: trend.id }, data: { used: true, videoCreated: true } })

  // 5. Publish to playlist
  const channel = await prisma.tvChannel.findFirst()
  if (!channel) throw new Error('No TvChannel')
  const maxPos = await prisma.tvPlaylistItem.findFirst({ where: { channelId: channel.id }, orderBy: { position: 'desc' }, select: { position: true } })
  const nextPos = (maxPos?.position ?? 0) + 1
  const item = await prisma.tvPlaylistItem.create({
    data: { channelId: channel.id, title: `${titleBn} 🔥`, url: finalPath, source: 'viral', position: nextPos },
  })

  await prisma.viralVideo.update({ where: { id: viralVideo.id }, data: { playlistItemId: item.id, status: 'ON_TV' } })
  await prisma.tvVideoStats.create({
    data: { playlistItemId: item.id, viralTrendId: trend.id, viralVideoId: viralVideo.id, title: titleBn, viralScore: trend.viralScore, playWeight: 1 },
  })

  // Trim to 50
  const count = await prisma.tvPlaylistItem.count({ where: { channelId: channel.id } })
  if (count > 50) {
    const toRemove = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id, source: { not: 'viral' } }, orderBy: { position: 'asc' }, take: count - 50 })
    for (const r of toRemove) await prisma.tvPlaylistItem.delete({ where: { id: r.id } })
    // Reindex positions
    const all = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id }, orderBy: { position: 'asc' } })
    for (let i = 0; i < all.length; i++) await prisma.tvPlaylistItem.update({ where: { id: all[i].id }, data: { position: i + 1 } })
  }

  // Regenerate playlist.host.txt
  const allItems = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id }, orderBy: { position: 'asc' } })
  const stats = await prisma.tvVideoStats.findMany({ where: { playlistItemId: { in: allItems.map(i => i.id) } } })
  const weightMap = new Map(stats.map(s => [s.playlistItemId, s.playWeight]))
  const lines: string[] = []
  for (const it of allItems) {
    const w = weightMap.get(it.id) || 1
    for (let k = 0; k < w; k++) lines.push(`file '${it.url}'`)
  }
  const playlistPath = '/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt'
  fs.writeFileSync(playlistPath + '.tmp', lines.join('\n') + '\n')
  fs.renameSync(playlistPath + '.tmp', playlistPath)

  await prisma.tvCommand.create({ data: { action: 'RELOAD_PLAYLIST', payload: { viralVideoId: viralVideo.id } as any, status: 'PENDING' } })
  // Also restart ffmpeg directly (local)
  try { await execAsync('systemctl', ['--user', 'restart', 'tv-ffmpeg'] as any) } catch {}

  try { await prisma.tvLog.create({ data: { level: 'info', message: `Viral video published: ${titleBn} (${gender}/${voiceUsed}) hook: ${hook}` } }) } catch {}

  return { viralVideoId: viralVideo.id, playlistItemId: item.id, videoUrl: finalPath, titleBn, hook, gender, voiceUsed }
}
