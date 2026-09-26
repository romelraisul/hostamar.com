import { NextResponse } from 'next/server'
export async function GET() {
  const fleetLen = (process.env.FLEET_REPORT_SECRET || '').trim().length
  const socialLen = (process.env.SOCIAL_PUBLISH_SECRET || '').trim().length
  return NextResponse.json({ ok: true, fleetLen, socialLen, hasFleet: !!process.env.FLEET_REPORT_SECRET, hasSocial: !!process.env.SOCIAL_PUBLISH_SECRET })
}
