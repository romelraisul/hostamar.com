export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import Redis from 'ioredis'

export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL
    console.log('[TestRedis] REDIS_URL:', redisUrl ? 'SET (length: ' + redisUrl.length + ')' : 'NOT SET')
    
    if (!redisUrl) {
      return NextResponse.json({ error: 'REDIS_URL not set' }, { status: 500 })
    }
    
    // Test connection
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    })
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000)
      redis.once('ready', () => {
        clearTimeout(timeout)
        resolve(true)
      })
      redis.once('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
    
    // Test ping
    const pong = await redis.ping()
    console.log('[TestRedis] Ping result:', pong)
    
    await redis.quit()
    
    return NextResponse.json({ 
      success: true, 
      ping: pong,
      url: redisUrl.substring(0, 20) + '...' 
    })
  } catch (error) {
    console.error('[TestRedis] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
