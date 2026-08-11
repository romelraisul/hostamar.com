import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // SSO
  SSO_CLIENT_ID: z.string().optional(),
  SSO_CLIENT_SECRET: z.string().optional(),
  SSO_AUTHORIZE_URL: z.string().url().optional(),
  SSO_TOKEN_URL: z.string().url().optional(),
  SSO_USERINFO_URL: z.string().url().optional(),
  SSO_SCOPE: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OLLAMA_BASE_URL: z.string().url().optional(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Storage
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),

  // Payments (personal)
  BKASH_API_KEY: z.string().optional(),
  BKASH_API_SECRET: z.string().optional(),
  NAGAD_API_KEY: z.string().optional(),
  NAGAD_API_SECRET: z.string().optional(),
  ROCKET_API_KEY: z.string().optional(),
  ROCKET_API_SECRET: z.string().optional(),

  // Bootstrap
  BOOTSTRAP_SECRET: z.string().min(8).optional(),

  // Feature flags
  NEXT_PUBLIC_BUILD_TARGET: z.enum(['frontend', 'api']).optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Environment validation failed:\n${missing}`)
  }

  cached = result.data
  return cached
}
