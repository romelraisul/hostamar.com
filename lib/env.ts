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

    // ── OPTIONAL (validated shape when present) ──────────────────
    REDIS_URL: z.string().optional(),
    AI_GATEWAY_URL: z.string().optional(),
    COMFYUI_URL: z.string().optional(),
    BKASH_BASE_URL: z.string().optional(),
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
