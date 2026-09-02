/**
 * lib/ai-video.ts — AI Reel Generator backend (V25).
 * 4 slides (720x1280), Bangla captions, optional Bangla voiceover, B2 upload.
 * NEVER throws to 500: every provider degrades to the next, ending in
 * deterministic gradient data-URL slides + browser TTS — same philosophy as
 * lib/ai-fallback's unlimited chain. Server-side only.
 */

const REEL_W = 720
const REEL_H = 1280

// ── image cache (1h) ──
const imgCache = new Map<string, { at: number; urls: string[] }>()
const IMG_TTL = 60 * 60 * 1000

/** SVG gradient slide → data URL (base64 so canvas drawImage works after fetch). */
function gradientSlide(i: number, caption: string): string {
  const grads = [
    ['#052e16', '#0a0a0a'], ['#1e1b4b', '#0a0a0a'], ['#3b0764', '#0a0a0a'], ['#0c0a09', '#1c1917'],
  ]
  const [c1, c2] = grads[i % grads.length]
  // Bangla text inside SVG needs a font the browser has — the CLIENT redraws the
  // caption over the image in the player, so this is a decorative backdrop.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${REEL_W}" height="${REEL_H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${REEL_W * 0.75}" cy="${REEL_H * 0.25}" r="180" fill="#10b981" opacity="0.18"/>
  <circle cx="${REEL_W * 0.2}" cy="${REEL_H * 0.7}" r="240" fill="#0ea5e9" opacity="0.10"/>
  <text x="50%" y="52%" text-anchor="middle" font-size="64" fill="#34d399" font-family="sans-serif" opacity="0.35">Hostamar</text>
  <text x="50%" y="58%" text-anchor="middle" font-size="26" fill="#a7f3d0" font-family="sans-serif" opacity="0.5">Reel ${i + 1}/4</text>
</svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

async function tryOpenAIImage(prompt: string): Promise<string[] | null> {
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key) return null
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'dall-e-3', prompt: `vertical 9:16 social media reel slide, ${prompt}, bold clean composition, no text`, n: 1, size: '1024x1792',
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!r.ok) return null
    const j: any = await r.json()
    return [j?.data?.[0]?.url]
  } catch { return null }
}

async function tryReplicate(prompt: string): Promise<string[] | null> {
  try {
    const key = process.env.REPLICATE_API_TOKEN
    if (!key) return null
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        version: 'stability-ai/sdxl',
        input: { prompt: `vertical reel slide, ${prompt}`, aspect_ratio: '9:16' },
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!create.ok) return null
    const cj: any = await create.json()
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      const p = await fetch(`https://api.replicate.com/v1/predictions/${cj.id}`, { headers: { Authorization: `Bearer ${key}` } })
      const pj: any = await p.json()
      if (pj.status === 'succeeded' && pj.output?.length) return Array.isArray(pj.output) ? pj.output : [pj.output]
      if (pj.status === 'failed') return null
    }
    return null
  } catch { return null }
}

/**
 * Generate 4 reel slide images for a prompt.
 * Chain: OpenAI (if key) → Replicate (if token) → deterministic SVG gradients.
 * Real providers return fewer than 4 → pad with gradients so callers ALWAYS get 4.
 */
export async function generateReelImages(prompt: string): Promise<string[]> {
  const cached = imgCache.get(prompt)
  if (cached && Date.now() - cached.at < IMG_TTL) return cached.urls

  let urls: string[] | null = await tryOpenAIImage(prompt)
  if (!urls || !urls.length) urls = await tryReplicate(prompt)

  const four: string[] = []
  for (let i = 0; i < 4; i++) {
    const gen = urls && urls.length ? urls[i % urls.length] : null
    four.push(gen || gradientSlide(i, ''))
  }
  imgCache.set(prompt, { at: Date.now(), urls: four })
  return four
}

/**
 * Bangla voiceover: ElevenLabs → (placeholder for Google TTS) → browser TTS flag.
 * Returns useBrowserTTS:true with empty audioUrl when no cloud TTS is configured —
 * the client then speaks via speechSynthesis (bn-BD) — honest fallback, no fake audio.
 */
export async function generateBanglaVoiceover(
  text: string,
): Promise<{ audioUrl: string; duration: number; useBrowserTTS: boolean }> {
  // ElevenLabs
  try {
    const key = process.env.ELEVENLABS_API_KEY
    const voice = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'
    if (key && text) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': key, Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: text.slice(0, 2500), model_id: 'eleven_multilingual_v2' }),
        signal: AbortSignal.timeout(20_000),
      })
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        const key2 = `voiceover/${Date.now()}.mp3`
        const url = await uploadToB2(buf, key2)
        if (url) return { audioUrl: url, duration: 12, useBrowserTTS: false }
      }
    }
  } catch { /* next */ }
  // Browser TTS fallback — client-side speechSynthesis bn-BD
  return { audioUrl: '', duration: 12, useBrowserTTS: true }
}

/**
 * Upload a buffer to B2 (bucket hostamar-prod) and return the public URL.
 * Returns '' on failure (callers treat as optional enhancement, never fatal).
 */
export async function uploadToB2(buffer: Buffer, key: string, contentType?: string): Promise<string> {
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: process.env.B2_REGION || 'us-east-005',
      endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.B2_ACCOUNT_ID || process.env.B2_APPLICATION_KEY_ID || '',
        secretAccessKey: process.env.B2_APPLICATION_KEY || '',
      },
    })
    const type = contentType || (key.endsWith('.json') ? 'application/json' : key.endsWith('.webm') ? 'video/webm' : key.endsWith('.png') ? 'image/png' : key.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream')
    await client.send(new PutObjectCommand({
      Bucket: process.env.B2_BUCKET || 'hostamar-prod',
      Key: key,
      Body: buffer,
      ContentType: type,
    }))
    return `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET || 'hostamar-prod'}/${key}`
  } catch (e: any) {
    console.warn('[ai-video] B2 upload failed:', String(e?.message || e).slice(0, 120))
    return ''
  }
}
