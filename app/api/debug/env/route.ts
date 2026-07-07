import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Force read of current process env at runtime
  const env: Record<string, string> = {}
  for (const key of Object.keys(process.env)) {
    const val = process.env[key] || ''
    env[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASS')
      ? `present (${val.length} chars)`
      : val
  }
  return NextResponse.json({
    phase: process.env.NEXT_PHASE || 'runtime',
    isBuild: !!process.env.NEXT_PHASE,
    env,
  })
}
