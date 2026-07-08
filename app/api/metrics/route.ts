import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// ============================================================================
// GET /api/metrics
// Returns Prometheus text-format metrics for the Next.js app.
// Accessed by Prometheus scraper (hostamar-app:3000/api/metrics)
// ============================================================================

// Simple process metrics via Node.js
function getProcessMetrics(): string {
  const mem = process.memoryUsage()
  const uptime = process.uptime()
  const lines = [
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${uptime}`,
    '',
    '# HELP process_memory_bytes Process memory usage in bytes',
    '# TYPE process_memory_bytes gauge',
    `process_memory_heap_used_bytes ${mem.heapUsed}`,
    `process_memory_heap_total_bytes ${mem.heapTotal}`,
    `process_memory_rss_bytes ${mem.rss}`,
    `process_memory_external_bytes ${mem.external}`,
    '',
  ]
  return lines.join('\n')
}

// App-specific request counter (in-memory, per-instance)
declare global {
  // eslint-disable-next-line no-var
  var _requestCounts: Record<string, number> | undefined
  // eslint-disable-next-line no-var
  var _requestLatencies: number[] | undefined
}

function getRequestMetrics(): string {
  if (!global._requestCounts) {
    global._requestCounts = {}
    global._requestLatencies = []
  }
  const counts = global._requestCounts
  const latencies = global._requestLatencies

  const lines = [
    '# HELP http_requests_total Total HTTP requests by path and status',
    '# TYPE http_requests_total counter',
  ]

  for (const [path, count] of Object.entries(counts)) {
    lines.push(`http_requests_total{path="${path}"} ${count}`)
  }

  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const max = Math.max(...latencies)
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] || 0
    lines.push('')
    lines.push('# HELP http_request_duration_seconds HTTP request duration')
    lines.push('# TYPE http_request_duration_seconds summary')
    lines.push(`http_request_duration_seconds_avg ${avg}`)
    lines.push(`http_request_duration_seconds_max ${max}`)
    lines.push(`http_request_duration_seconds_p95 ${p95}`)
  }

  return lines.join('\n')
}

// Database metrics
async function getDbMetrics(): Promise<string> {
  try {
    const [
      customerCount,
      videoCount,
      paymentCount,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.video.count(),
      prisma.payment.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
    ])

    return [
      '# HELP hostamar_customers_total Total customers',
      '# TYPE hostamar_customers_total gauge',
      `hostamar_customers_total ${customerCount}`,
      '',
      '# HELP hostamar_videos_total Total videos created',
      '# TYPE hostamar_videos_total gauge',
      `hostamar_videos_total ${videoCount}`,
      '',
      '# HELP hostamar_payments_total Total payment records',
      '# TYPE hostamar_payments_total gauge',
      `hostamar_payments_total ${paymentCount}`,
      '',
      '# HELP hostamar_active_subscriptions Total active subscriptions',
      '# TYPE hostamar_active_subscriptions gauge',
      `hostamar_active_subscriptions ${activeSubscriptions}`,
      '',
    ].join('\n')
  } catch {
    return '# DB metrics unavailable\nhostamar_db_up 0'
  }
}

export async function GET(req: NextRequest) {
  // Optional: basic auth for metrics endpoint
  const auth = req.headers.get('authorization')
  if (process.env.METRICS_BASIC_AUTH) {
    const [user, pass] = (process.env.METRICS_BASIC_AUTH || '').split(':')
    const provided = auth?.replace('Basic ', '')
    if (!provided || Buffer.from(`${user}:${pass}`, 'utf8').toString('base64') !== provided) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const start = Date.now()

  const [proc, reqs, db] = await Promise.all([
    Promise.resolve(getProcessMetrics()),
    Promise.resolve(getRequestMetrics()),
    getDbMetrics(),
  ])

  const latency = (Date.now() - start) / 1000

  const output = [
    '# HELP hostamar_scrape_duration_seconds Time taken to scrape metrics',
    '# TYPE hostamar_scrape_duration_seconds gauge',
    `hostamar_scrape_duration_seconds ${latency}`,
    '',
    proc,
    reqs,
    db,
    '# EOF',
  ].join('\n')

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

// Hook to record requests (call this from middleware or API routes)
// export function recordRequest(path: string, latencyMs: number) { ... }