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
import { Queue, QueueEvents, Worker, type Job, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { startRedisFailover, getActiveRedis, onFailoverEvent } from './redis-failover';

// --- Redis Connection ---

// Failover-aware URL selector. At boot, picks PRIMARY if reachable, else FALLBACK.
// Hot-swapping is provided via onFailover callback (BullMQ retries with attempts:3).
let selectedUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisConnection(): Redis {
  const connection = new Redis(selectedUrl, {
    maxRetriesPerRequest: null, // BullMQ manages its own retries
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential backoff for Redis connection: 1s, 2s, 4s, 8s… up to 30s
      return Math.min(times * 1000, 30000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  connection.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return connection;
}

let redisConnection: Redis | null = null;

/**
 * Boot the failover module so selectedUrl reflects the live Redis target,
 * not the env-var-driven default. Called once at app/worker startup.
 */
export async function initRedis(): Promise<void> {
  try {
    const active = await startRedisFailover()
    selectedUrl = (active.options as any).host
      ? `${active.options.host}:${(active.options as any).port}`
      : selectedUrl
    // If failover kicked in to a different URL, switch to that one
    const fbUrl = process.env.REDIS_FALLBACK_URL || ''
    const activeOptions = active.options as any
    if (activeOptions.url && activeOptions.url !== selectedUrl) {
      selectedUrl = activeOptions.url
    }
    onFailoverEvent((newUrl) => {
      console.warn('[Queue] Redis failover — bullmq will retry on next disconnect', { newUrl })
      selectedUrl = newUrl
      // Drop the cached connection so the next getRedisConnection() picks up the new URL.
      redisConnection?.disconnect()
      redisConnection = null
    })
    console.log('[Queue] Redis initialized', { url: selectedUrl })
  } catch (e) {
    console.warn('[Queue] initRedis failed, falling back to REDIS_URL env', (e as Error).message)
  }
}

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return redisConnection;
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
