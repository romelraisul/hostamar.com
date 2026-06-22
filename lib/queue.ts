import { Queue } from 'bullmq'

/**
 * Adds a video generation job to the BullMQ queue.
 * Uses environment variable for Redis URL, falls back gracefully if not set.
 */

function getRedisUrl(): string | null {
  const url = process.env.BULLMQ_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  if (!url) return null

  // Normalise schemes for ioredis
  if (url.startsWith('http://')) return 'redis://' + url.slice(7)
  if (url.startsWith('https://')) return 'rediss://' + url.slice(8)
  return url
}

let videoQueue: Queue | null = null

function getQueue(): Queue | null {
  if (videoQueue) return videoQueue

  const redisUrl = getRedisUrl()
  if (!redisUrl) {
    console.warn('[queue] No Redis URL configured — queue disabled')
    return null
  }

  try {
    videoQueue = new Queue('video-generation', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    })
    return videoQueue
  } catch (err) {
    console.warn('[queue] Failed to create queue:', err)
    return null
  }
}

export async function addVideoJob(data: Record<string, unknown>) {
  const queue = getQueue()
  if (!queue) {
    console.warn('[queue] Queue not available — job not enqueued')
    return null
  }

  try {
    const job = await queue.add('video-generation', data)
    return job
  } catch (err) {
    console.error('[queue] Failed to add job:', err)
    return null
  }
}
