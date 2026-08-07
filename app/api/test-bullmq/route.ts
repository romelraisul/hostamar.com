export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

export async function POST(req: Request) {
  try {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      return NextResponse.json({ error: 'REDIS_URL not set' }, { status: 500 })
    }
    
    console.log('[TestBullMQ] Creating Redis connection...')
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
    })
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
      redis.once('ready', () => {
        clearTimeout(timeout)
        resolve(true)
      })
      redis.once('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
    
    console.log('[TestBullMQ] Redis connected, creating queue...')
    const queue = new Queue('test-queue', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }
    })
    
    console.log('[TestBullMQ] Queue created, adding job...')
    const job = await Promise.race([
      queue.add('test-job', { data: 'test' }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('queue.add timeout after 30s')), 30000)
      )
    ])
    
    console.log('[TestBullMQ] Job added:', job.id)
    
    await queue.close()
    await redis.quit()
    
    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error) {
    console.error('[TestBullMQ] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
