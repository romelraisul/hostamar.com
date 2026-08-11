import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Generate a secure API key
export function generateApiKey(): string {
  return `hk_live_${crypto.randomBytes(32).toString('hex')}`
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Validate API key and return customer info
export async function validateApiKey(key: string) {
  const keyHash = hashApiKey(key)
  
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      key: keyHash,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          credits: true,
          balance: true,
        },
      },
    },
  })

  if (!apiKey) return null

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      totalRequests: { increment: 1 },
    },
  })

  return apiKey
}

// Create API key for customer
export async function createApiKey(customerId: string, name: string, permissions?: Partial<{
  canGenerateImage: boolean
  canGenerateVideo: boolean
  canUseChat: boolean
  rateLimitPerMinute: number
} }) {
  const key = generateApiKey()
  const keyHash = hashApiKey(key)

  const apiKey = await prisma.apiKey.create({
    data: {
      key: keyHash,
      name,
      customerId,
      canGenerateImage: permissions?.canGenerateImage ?? true,
      canGenerateVideo: permissions?.canGenerateVideo ?? true,
      canUseChat: permissions?.canUseChat ?? true,
      rateLimitPerMinute: permissions?.rateLimitPerMinute ?? 10,
    },
  })

  // Return the plain key (only time it's visible)
  return { ...apiKey, key }
}

// Rate limiter for API keys
const apiKeyRateLimit = new Map<string, { count: number; resetAt: number }>()

export async function checkApiKeyRateLimit(apiKeyId: string, limit: number): Promise<boolean> {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  
  const entry = apiKeyRateLimit.get(apiKeyId)
  
  if (!entry || now > entry.resetAt) {
    apiKeyRateLimit.set(apiKeyId, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}
