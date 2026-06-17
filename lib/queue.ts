import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'

const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://redis:6379'
// Normalise http://redis:6379 → redis://redis:6379 (ioredis needs the redis:// scheme)
const normalised = redisUrl.startsWith('http://')
  ? 'redis://' + redisUrl.slice(7)
  : redisUrl.startsWith('https://')
  ? 'rediss://' + redisUrl.slice(8)
  : redisUrl

const redisConnection = new Redis(normalised, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: true,
  lazyConnect: true,
})

export interface VideoGenerationJob {
  videoId: string
  prompt: string
  style: string
  duration: number
  userId: string
  priority: number
}

export interface PaymentJob {
  paymentId: string
  amount: number
  method: 'bkash' | 'nagad' | 'rocket' | 'crypto'
  userId: string
}

export interface EmailJob {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export interface AnalyticsJob {
  event: string
  userId: string
  properties: Record<string, any>
}

export const queueNames = {
  VIDEO_GENERATION: 'video-generation',
  PAYMENT_PROCESSING: 'payment-processing',
  EMAIL_SENDING: 'email-sending',
  ANALYTICS_TRACKING: 'analytics-tracking',
  WEBHOOK_DELIVERY: 'webhook-delivery',
} as const

function createQueue(name: string) {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  })
}

export const videoQueue = createQueue(queueNames.VIDEO_GENERATION)
export const paymentQueue = createQueue(queueNames.PAYMENT_PROCESSING)
export const emailQueue = createQueue(queueNames.EMAIL_SENDING)
export const analyticsQueue = createQueue(queueNames.ANALYTICS_TRACKING)
export const webhookQueue = createQueue(queueNames.WEBHOOK_DELIVERY)

export async function addVideoJob(data: VideoGenerationJob, priority = 0) {
  return videoQueue.add('generate', data, { priority })
}

export async function addPaymentJob(data: PaymentJob) {
  return paymentQueue.add('process', data)
}

export async function addEmailJob(data: EmailJob) {
  return emailQueue.add('send', data)
}

export async function addAnalyticsJob(data: AnalyticsJob) {
  return analyticsQueue.add('track', data)
}

export async function addWebhookJob(data: { url: string; payload: any; retries: number }) {
  return webhookQueue.add('deliver', data, { attempts: 5 })
}

// Worker setup (run separately)
export function createWorkers() {
  const workers = [
    new Worker(queueNames.VIDEO_GENERATION, async (job) => {
      const { videoId, prompt, style, duration, userId } = job.data
      // Call Replicate/Fal.ai API
      console.log(`Generating video ${videoId}`)
      // Implementation here
    }, { connection: redisConnection }),

    new Worker(queueNames.PAYMENT_PROCESSING, async (job) => {
      const { paymentId, amount, method, userId } = job.data
      // Process payment via bKash/Nagad/Rocket API
      console.log(`Processing payment ${paymentId}`)
    }, { connection: redisConnection }),

    new Worker(queueNames.EMAIL_SENDING, async (job) => {
      const { to, subject, template, data } = job.data
      // Send via SendGrid/Resend
      console.log(`Sending email to ${to}`)
    }, { connection: redisConnection }),

    new Worker(queueNames.ANALYTICS_TRACKING, async (job) => {
      const { event, userId, properties } = job.data
      // Send to PostHog/Analytics
      console.log(`Tracking ${event} for user ${userId}`)
    }, { connection: redisConnection }),

    new Worker(queueNames.WEBHOOK_DELIVERY, async (job) => {
      const { url, payload, retries } = job.data
      // Deliver webhook with retry logic
      console.log(`Delivering webhook to ${url}`)
    }, { connection: redisConnection }),
  ]
  return workers
}
