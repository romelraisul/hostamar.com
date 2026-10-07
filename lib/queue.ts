/**
 * BullMQ Queue Setup
 *
 * Central queue configuration with Redis connection and default job options.
 * Supports local Redis (redis://localhost:6379) for dev, override via REDIS_URL in prod.
 *
 * Failover: if REDIS_URL points at the WSL-bridge tunnel and it's unreachable,
 * the worker (lib/redis-failover.ts) selects the fallback URL. We read the
 * selected URL via getSelectedRedisUrl() below.
 *
 * LAZY LOADING (workerd fix): bullmq + ioredis are imported on FIRST USE, never
 * at module load. Importing this module is therefore cheap and safe on the edge,
 * so a route that merely imports it — e.g. a GET against a POST-only route —
 * no longer stalls in module evaluation before its handler ever runs.
 *
 * The edge has no TCP and no Redis, so on workerd every queue op fails fast with
 * QueueUnavailableError (503) instead of retrying a dead localhost Redis for 25s.
 */
import type { Queue, QueueEvents, Job, JobsOptions } from 'bullmq';
import type Redis from 'ioredis';
import { env } from '@/lib/env'

// ponytail: same runtime probe already used in lib/api/validator.ts + lib/sso/saml.ts.
const ON_WORKERD =
  typeof navigator !== 'undefined' &&
  (navigator as any).userAgent === 'Cloudflare-Workers'

/** Thrown instead of hanging when the queue backend cannot exist on this runtime. */
export class QueueUnavailableError extends Error {
  readonly status = 503
  constructor(detail = 'video queue runs on the local Redis worker, not the edge') {
    super(detail)
    this.name = 'QueueUnavailableError'
  }
}

// --- Redis Connection ---

// Failover-aware URL selector. At boot, picks PRIMARY if reachable, else FALLBACK.
// Hot-swapping is provided via onFailover callback (BullMQ retries with attempts:3).
let selectedUrl = env.REDIS_URL || 'redis://localhost:6379';

let redisConnection: Redis | null = null;

async function createRedisConnection(): Promise<Redis> {
  const { default: RedisCtor } = await import('ioredis');
  const connection = new RedisCtor(selectedUrl, {
    maxRetriesPerRequest: null, // BullMQ manages its own retries
    enableReadyCheck: false,
    retryStrategy(times: number) {
      // Exponential backoff for Redis connection: 1s, 2s, 4s, 8s… up to 30s
      return Math.min(times * 1000, 30000);
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  connection.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  connection.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return connection;
}

/**
 * Boot the failover module so selectedUrl reflects the live Redis target,
 * not the env-var-driven default. Called once at app/worker startup.
 */
export async function initRedis(): Promise<void> {
  if (ON_WORKERD) return; // no Redis on the edge; nothing to fail over to
  try {
    const { startRedisFailover, onFailoverEvent } = await import('./redis-failover')
    const active = await startRedisFailover()
    selectedUrl = (active.options as any).host
      ? `${(active.options as any).host}:${(active.options as any).port}`
      : selectedUrl
    // If failover kicked in to a different URL, switch to that one
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

export async function getRedisConnection(): Promise<Redis> {
  if (ON_WORKERD) throw new QueueUnavailableError();
  if (!redisConnection) {
    redisConnection = await createRedisConnection();
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

export async function getQueue(name: string): Promise<Queue> {
  if (!queues.has(name)) {
    const { Queue } = await import('bullmq');
    const q = new Queue(name, {
      connection: await getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(name, q);
    console.log(`[Queue] Created queue: ${name}`);
  }
  return queues.get(name)!;
}

export function getVideoGenerationQueue(): Promise<Queue> {
  return getQueue(QUEUE_NAMES.VIDEO_GENERATION);
}

// --- Queue Events (for real-time progress monitoring) ---

const queueEventsMap = new Map<string, QueueEvents>();

export async function getQueueEvents(name: string): Promise<QueueEvents> {
  if (!queueEventsMap.has(name)) {
    const { QueueEvents } = await import('bullmq');
    const qe = new QueueEvents(name, {
      connection: await getRedisConnection(),
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
  const queue = await getVideoGenerationQueue();
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
  initRedis,
  QueueUnavailableError,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
};
