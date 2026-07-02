// app/api/metrics/route.ts
// Prometheus metrics endpoint
// Scraped by Prometheus at /api/metrics

import { NextResponse } from 'next/server'
import { getAllMetrics } from '@/lib/metrics-store'

export async function GET() {
  const metrics = getAllMetrics()
  
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

// Disable static generation for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'