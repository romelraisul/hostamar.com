/**
 * Google Token Guard TypeScript shim — mirrors Python implementation
 * Used by chat/generate, chat/ollama, support-chat routes
 */

export interface GoogleTokenGuardConfig {
  perMin?: number
  perDay?: number
  keyCooldown?: number
}

export class GoogleTokenGuard {
  private keys: string[]
  private keyIndex = 0
  private keyCooldowns: Map<string, number> = new Map()
  private minWindow: Array<{ ts: number; keyIndex: number }> = []
  private dayWindow: Array<{ ts: number; keyIndex: number }> = []
  private perMin: number
  private perDay: number
  private keyCooldown: number

  constructor(apiKeys?: string[], config?: GoogleTokenGuardConfig) {
    this.perMin = config?.perMin ?? 15
    this.perDay = config?.perDay ?? 1500
    this.keyCooldown = config?.keyCooldown ?? 60
    this.keys = apiKeys ?? this.loadKeysFromEnv()
  }

  private loadKeysFromEnv(): string[] {
    const keys: string[] = []
    const primary = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (primary) keys.push(primary)

    let i = 1
    while (true) {
      const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`]
      if (!key) break
      keys.push(key)
      i++
    }
    return keys
  }

  private cleanupWindows(now: number): void {
    const minCutoff = now - 60000
    const dayCutoff = now - 86400000
    this.minWindow = this.minWindow.filter(w => w.ts > minCutoff)
    this.dayWindow = this.dayWindow.filter(w => w.ts > dayCutoff)
  }

  private getAvailableKeyIndex(now: number): number | null {
    this.cleanupWindows(now)

    if (this.keys.length === 0) return null

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.keyIndex + i) % this.keys.length
      const key = this.keys[idx]

      const cooldown = this.keyCooldowns.get(key) ?? 0
      if (cooldown > now) continue

      const minCount = this.minWindow.filter(w => w.keyIndex === idx).length
      const dayCount = this.dayWindow.filter(w => w.keyIndex === idx).length

      if (minCount < this.perMin && dayCount < this.perDay) {
        return idx
      }
    }
    return null
  }

  async callWithGuard<T>(fn: (key: string) => Promise<T>, model: string): Promise<T[]> {
    const now = Date.now()
    const keyIndex = this.getAvailableKeyIndex(now)

    if (keyIndex === null) {
      throw new Error('All Google API keys rate limited or unavailable')
    }

    const key = this.keys[keyIndex]
    this.keyIndex = keyIndex
    this.minWindow.push({ ts: now, keyIndex })
    this.dayWindow.push({ ts: now, keyIndex })

    try {
      const result = await fn(key)
      return [result]
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status || (await error.response.json?.().then?.(r => r.error?.code))
        if (status === 429) {
          const retryAfter = error.response.headers?.get?.('retry-after')
          const cooldown = retryAfter ? parseInt(retryAfter) * 1000 : this.keyCooldown * 1000
          this.keyCooldowns.set(key, now + cooldown)
        }
      }
      throw error
    }
  }
}

export function createGoogleTokenGuard(): GoogleTokenGuard {
  return new GoogleTokenGuard()
}