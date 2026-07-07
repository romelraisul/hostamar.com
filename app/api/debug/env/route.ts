import { NextResponse } from 'next/server'

export async function GET() {
  // Force read of current process env at runtime
  const env: Record<string, string> = {}
  for (const key of Object.keys(process.env)) {
    const val = process.env[key] || ''
    env[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASS')
      ? `present (${val.length} chars)`
      : val
  }
  return NextResponse.json(env)
}
