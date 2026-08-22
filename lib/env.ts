/**
 * lib/env.ts — SINGLE SOURCE OF TRUTH for environment variables.
 *
 * Server-side ONLY. Do NOT import from 'use client' components
 * (NEXT_PUBLIC_* vars are inlined by Next.js at build time and must be
 * read as process.env.NEXT_PUBLIC_X in client code).
 *
 * - Validates required core vars with zod (warns, never crashes the build).
 * - Passthrough: every other var is accessible as env.X (string | undefined).
 * - All vars documented in .env.example (the only other env file allowed).
 */
import { z } from 'zod'

const serverSchema = z
  .object({
    // ── CORE (required at runtime) ──────────────────────────────
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (Postgres connection string)'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required (auth_token cookie signing)'),
    NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
    NEXTAUTH_URL: z.string().min(1, 'NEXTAUTH_URL is required (canonical site URL)'),

    // ── TUNNEL (Cloudflare — auto-exposes local HLS to public) ──
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    CLOUDFLARE_TUNNEL_TOKEN: z.string().optional(),
    CLOUDFLARE_ZONE_ID: z.string().optional(),
    TUNNEL_ID: z.string().optional(),
    CF_API_TOKEN: z.string().optional(), // alias
    TUNNEL_TOKEN: z.string().optional(), // alias

    // ── TV STATION ──────────────────────────────────────────────
    TV_HLS_URL: z.string().optional(),
    TV_RTMP_URL: z.string().optional(),
    TV_AGENT_SECRET: z.string().optional(),
    TV_CHANNEL_NAME: z.string().optional(),
    TV_AUTO_GENERATE_ENABLED: z.string().optional(),
    RSS_FEEDS: z.string().optional(),
    YOUTUBE_RTMP_URL: z.string().optional(),
    YOUTUBE_STREAM_KEY: z.string().optional(),
    FACEBOOK_RTMP_URL: z.string().optional(),
    FACEBOOK_STREAM_KEY: z.string().optional(),
    TWITCH_RTMP_URL: z.string().optional(),
    TWITCH_STREAM_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),

    // ── PAYMENTS (personal + merchant) ──────────────────────────
    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),
    BKASH_BASE_URL: z.string().optional(),
    BKASH_PERSONAL_NUMBER: z.string().optional(),
    NAGAD_PERSONAL_NUMBER: z.string().optional(),
    ROCKET_PERSONAL_NUMBER: z.string().optional(),
    PERSONAL_PAYMENT_ENABLED: z.string().optional(),
    SMS_WEBHOOK_SECRET: z.string().optional(),

    // ── OPTIONAL (validated shape when present) ──────────────────
    REDIS_URL: z.string().optional(),
    AI_GATEWAY_URL: z.string().optional(),
    COMFYUI_URL: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
  })
  .passthrough()

export type ServerEnv = z.infer<typeof serverSchema> & Record<string, string | undefined>

let validated = false

function loadEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env)

  if (!result.success && !validated) {
    validated = true
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    // During `next build` most vars are absent — warn, don't crash.
    const isBuild = !!process.env.NEXT_PHASE
    const msg = `[env] Environment validation issues:\n${issues}\n[env] Fix by copying .env.example to .env.local and filling values.`
    if (isBuild) {
      console.warn(msg)
    } else {
      console.error(msg)
    }
  }

  // Merge: validated data over raw process.env (keeps passthrough vars).
  return {
    ...(process.env as Record<string, string | undefined>),
    ...(result.data ?? {}),
  } as ServerEnv
}

/** Validated, typed access to all server environment variables. */
export const env: ServerEnv = loadEnv()

// ── Convenience helpers (honest 503s instead of mocks) ─────────────

/** True when bKash merchant (tokenized) credentials are all present. */
export function bkashMerchantConfigured(): boolean {
  return Boolean(env.BKASH_APP_KEY && env.BKASH_APP_SECRET && env.BKASH_USERNAME && env.BKASH_PASSWORD)
}

/** True when the personal Send-Money flow is enabled + has at least one number. */
export function personalPaymentsEnabled(): boolean {
  return (
    env.PERSONAL_PAYMENT_ENABLED === 'true' &&
    Boolean(env.BKASH_PERSONAL_NUMBER || env.NAGAD_PERSONAL_NUMBER || env.ROCKET_PERSONAL_NUMBER)
  )
}

/** True when ComfyUI render backend is reachable config-wise. */
export function comfyConfigured(): boolean {
  return Boolean(env.COMFYUI_URL || env.AI_GATEWAY_URL)
}

/** Resolve Cloudflare tunnel token from any alias. */
export function getTunnelToken(): string | undefined {
  return env.CLOUDFLARE_TUNNEL_TOKEN || env.TUNNEL_TOKEN || env.CF_API_TOKEN
}

/** True when tunnel token present (can auto-generate public HLS URL). */
export function tunnelConfigured(): boolean {
  return Boolean(getTunnelToken())
}

/** Resolve TV HLS URL with fallbacks. */
export function getTvHlsUrl(): string | undefined {
  if (env.TV_HLS_URL) return env.TV_HLS_URL
  const token = getTunnelToken()
  if (token) {
    // Token format is base64 JSON containing tunnel id — extract if possible
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
      if (decoded.t) return `https://${decoded.t}.cfargotunnel.com/hls/live/tv/index.m3u8`
    } catch {}
  }
  return undefined
}

/** True when running on Vercel (serverless, cannot run ffmpeg). */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL)
}
