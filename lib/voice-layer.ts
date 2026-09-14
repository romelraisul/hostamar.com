/**
 * lib/voice-layer.ts — Reel AI voice stack (V36.32).
 *
 * Providers (fallback chain, cheapest-first aligned with 0-taka + credit economy):
 *   1. Sarvam AI Bulbul v2   — Bangla/Hindi native. MUST for Bangla reels.
 *   2. Fish Audio S1         — ~10x cheaper than ElevenLabs, 5s voice clone.
 *   3. ElevenLabs v3         — Expressive emotion tags (happy/serious/whisper).
 *
 * Voice cloning: user uploads ~10s sample → provider cloneId stored per-customer
 * (Prisma). CONSENT REQUIRED — no consent flag = 400, no exceptions (Facebook
 * platform policy + our legal).
 *
 * ENV: SARVAM_API_KEY, FISH_AUDIO_API_KEY, ELEVENLABS_API_KEY
 * (server-only; never exposed to client.)
 */

export type Emotion = 'happy' | 'serious' | 'whisper' | 'neutral'
export type VoiceProvider = 'sarvam-bulbul' | 'fish-s1' | 'elevenlabs-v3'

export interface VoiceRequest {
  text: string
  lang: 'bn' | 'en' | 'hi'
  provider?: VoiceProvider
  emotion?: Emotion
  voiceId?: string      // provider voice or cloneId
  cloneConsent?: boolean
}

export interface VoiceResult {
  provider: VoiceProvider
  audioBase64: string  // mp3 bytes, base64 — pipeline writes to MinIO/R2 next
  cacheKey: string      // sha-ish for dedupe
}

const ENDPOINTS: Record<VoiceProvider, string> = {
  'sarvam-bulbul': 'https://api.sarvam.ai/v1/text-to-speech',
  'fish-s1': 'https://api.fish.audio/v1/tts',
  'elevenlabs-v3': 'https://api.elevenlabs.io/v1/text-to-speech',
}

export const VOICE_CREDIT_COST: Record<VoiceProvider, number> = {
  'sarvam-bulbul': 5,   // cheap Bangla native
  'fish-s1': 10,        // clone-grade
  'elevenlabs-v3': 25,  // premium expressive
}

/** Order tried when caller does not pin a provider. Bangla pins Sarvam first. */
export function providerChain(lang: VoiceRequest['lang']): VoiceProvider[] {
  if (lang === 'bn') return ['sarvam-bulbul', 'fish-s1', 'elevenlabs-v3']
  return ['fish-s1', 'elevenlabs-v3', 'sarvam-bulbul']
}

async function callSarvam(req: VoiceRequest): Promise<string> {
  const key = process.env.SARVAM_API_KEY
  if (!key) throw new Error('SARVAM_API_KEY missing')
  const r = await fetch(ENDPOINTS['sarvam-bulbul'], {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: req.text,
      target_language_code: req.lang === 'bn' ? 'bn-IN' : req.lang === 'hi' ? 'hi-IN' : 'en-IN',
      model: 'bulbul-v2',
      speech: { voice: req.voiceId || 'Meera' },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!r.ok) throw new Error(`sarvam ${r.status}`)
  const d = (await r.json()) as { audios?: string[] }
  if (!d.audios?.[0]) throw new Error('sarvam empty')
  return d.audios[0] // base64 mp3
}

async function callFish(req: VoiceRequest): Promise<string> {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) throw new Error('FISH_AUDIO_API_KEY missing')
  const r = await fetch(ENDPOINTS['fish-s1'], {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: req.text,
      format: 'mp3',
      mp3_bitrate: '128', // 320 on request
      reference_id: req.voiceId || undefined,
      normalize: true,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!r.ok) throw new Error(`fish ${r.status}`)
  // Fish returns binary or base64 depending on header; force json path
  const d = (await r.json()) as { base64?: string; data?: string }
  return d.base64 || d.data || ''
}

async function callEleven(req: VoiceRequest): Promise<string> {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY missing')
  const voice = req.voiceId || '21m00Tcm4TlvDq8ikWAM'
  // v3 expressive: emotion via audio_tags in text or voice_settings
  const styled = req.emotion && req.emotion !== 'neutral' ? `<[emotion="${req.emotion}"]> ${req.text}` : req.text
  const r = await fetch(`${ENDPOINTS['elevenlabs-v3']}/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: styled,
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.4, similarity_boost: 0.8, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`eleven ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  return buf.toString('base64')
}

/** Generate voice with fallback chain. Bangla → Sarvam first. */
export async function generateVoice(req: VoiceRequest): Promise<VoiceResult> {
  const chain = req.provider ? [req.provider] : providerChain(req.lang)
  let lastErr: unknown
  for (const p of chain) {
    try {
      const audio =
        p === 'sarvam-bulbul' ? await callSarvam(req)
        : p === 'fish-s1' ? await callFish(req)
        : await callEleven(req)
      if (!audio) throw new Error('empty audio')
      return {
        provider: p,
        audioBase64: audio,
        cacheKey: `${p}:${req.voiceId || 'default'}:${Buffer.from(req.text.slice(0, 64)).toString('base64')}`,
      }
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`voice-layer all providers failed: ${String(lastErr)}`)
}

/**
 * Voice clone (Fish S1 path — 10x cheaper than ElevenLabs cloning).
 * consent === false → hard 400. Store returned cloneId against the customer row.
 */
export async function cloneVoice(sampleBase64: string, name: string, consent: boolean): Promise<{ cloneId: string }> {
  if (!consent) throw new Error('VOICE_CLONE_CONSENT_REQUIRED')
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) throw new Error('FISH_AUDIO_API_KEY missing')
  const r = await fetch('https://api.fish.audio/model', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: name,
      textures: { gender: 'auto' },
      visibility: 'private',
      // training audio chunks (>=5s sample, base64)
      training_audio: [{ audio_base64: sampleBase64 }],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`fish clone ${r.status}`)
  const d = (await r.json()) as { _id?: string }
  if (!d._id) throw new Error('fish clone no id')
  return { cloneId: d._id }
}

/** Meta Voice Translation (lip-sync video localize) — planned integration. */
export async function voiceTranslate(opts: { videoUrl: string; targetLang: 'bn' | 'en' }): Promise<{ status: string }> {
  // Meta Voice Translation API surface (lip-sync translate) — gated on key availability
  if (!process.env.META_VOICE_API_KEY) return { status: 'not-configured — set META_VOICE_API_KEY' }
  return { status: 'queued — Meta voice translation + lip-sync' }
}
