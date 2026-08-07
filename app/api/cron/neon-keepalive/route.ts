// Neon Keep-Alive Endpoint
// This endpoint pings the Neon database to prevent auto-suspend
// Called by external cron (cron-job.org) or Vercel cron
// Uses very short timeout to return quickly even if compute is waking up

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  
  // Verify cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Simple lightweight query with short timeout to wake Neon compute
    // Using Promise.race to enforce a 5-second timeout on the DB query
    const queryPromise = prisma.$queryRaw`SELECT 1 as ping, NOW() as server_time`
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DB query timeout')), 5000)
    )
    
    const result = await Promise.race([queryPromise, timeoutPromise])
    
    return NextResponse.json({
      success: true,
      message: 'Neon compute pinged successfully',
      timestamp: new Date().toISOString(),
      data: result
    })
  } catch (error) {
    // Return success even if DB times out - the ping itself keeps compute alive
    console.warn('Neon keep-alive ping warning:', error instanceof Error ? error.message : 'Unknown')
    return NextResponse.json({
      success: true,
      message: 'Neon keep-alive ping sent (compute may be waking up)',
      timestamp: new Date().toISOString(),
      warning: error instanceof Error ? error.message : 'Unknown'
    })
  }
}

// Also support POST for services that only send POST
export async function POST(req: NextRequest) {
  return GET(req)
}