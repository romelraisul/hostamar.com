/**
 * BullMQ Queue Setup
 *
 * Central queue configuration with Redis connection and default job options.
 * Supports local Redis (redis://localhost:6379) for dev, override via REDIS_URL in prod.
 *
 * Failover: if REDIS_URL points at the WSL-bridge tunnel and it's unreachable,
 * the worker (lib/redis-failover.ts) selects the fallback URL. We read the
 * selected URL via getSelectedRedisUrl() below.
 */
import { Queue, QueueEvents, Worker, type Job, type JobsOptions } from 'bullmq'
import Redis from 'ioredis'
import { startRedisFailover, getActiveRedis, onFailoverEvent } from './redis-failover'

// --- Redis Connection ---
// Use the failover module's active Redis connection directly
let redisConnection: Redis | null = null

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    // This will be initialized by initRedis()
    throw new Error('Redis not initialized. Call initRedis() first.')
  }
  return redisConnection
}

export async function initRedis(): Promise<void> {
  try {
    redisConnection = await startRedisFailover()
    onFailoverEvent((newUrl) => {
      console.warn('[Queue] Redis failover — bullmq will retry on next disconnect', { newUrl })
      // The failover module handles connection swapping internally
    })
    console.log('[Queue] Redis initialized via failover module')
  } catch (e) {
    console.error('[Queue] initRedis failed', (e as Error).message)
    throw e
  }
}

export async function closeRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit()
    redisConnection = null
    console.log('[Redis] Connection closed')
  }
}

// --- Queue Names ---

export const QUEUE_NAMES = {
  VIDEO_GENERATION: 'video-generation',
} as const;

// --- Default Job Options ---

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // first retry after 2s, then 4s, 8s
  },
  removeOnComplete: {
    age: 3600 * 24, // keep completed jobs for 24h
    count: 100,     // keep last 100 completed
  },
  removeOnFail: {
    age: 3600 * 48, // keep failed jobs for 48h
  },
};

// --- Queue Factory ---

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const q = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(name, q);
    console.log(`[Queue] Created queue: ${name}`);
  }
  return queues.get(name)!;
}

export function getVideoGenerationQueue(): Queue {
  return getQueue(QUEUE_NAMES.VIDEO_GENERATION);
}

// --- Queue Events (for real-time progress monitoring) ---

const queueEventsMap = new Map<string, QueueEvents>();

export function getQueueEvents(name: string): QueueEvents {
  if (!queueEventsMap.has(name)) {
    const qe = new QueueEvents(name, {
      connection: getRedisConnection(),
    });
    queueEventsMap.set(name, qe);
  }
  return queueEventsMap.get(name)!;
}

// --- Helper: Enqueue a video generation job ---

export interface VideoGenerationJobData {
  script: string
  style: string
  voiceOver: string
  duration: number
  userId: string
  previewId?: string
  videoId?: string
}

export async function enqueueVideoGeneration(
  data: VideoGenerationJobData,
  opts?: JobsOptions
): Promise<Job<VideoGenerationJobData>> {
  const queue = getVideoGenerationQueue();
  const job = await queue.add('generate-video', data, {
    ...DEFAULT_JOB_OPTIONS,
    ...opts,
  });
  console.log(`[Queue] Enqueued video generation job ${job.id} for user ${data.userId}`);
  return job;
}

// --- Graceful Shutdown ---

export async function closeQueues(): Promise<void> {
  for (const [name, q] of queues) {
    await q.close();
    console.log(`[Queue] Closed queue: ${name}`);
  }
  queues.clear();

  for (const [name, qe] of queueEventsMap) {
    await qe.close();
    console.log(`[Queue] Closed queue events: ${name}`);
  }
  queueEventsMap.clear();

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('[Redis] Connection closed');
  }
}

export default {
  getRedisConnection,
  getQueue,
  getVideoGenerationQueue,
  getQueueEvents,
  enqueueVideoGeneration,
  closeQueues,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
};
