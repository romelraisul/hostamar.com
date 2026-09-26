import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    brand: 'hostamar.com',
    product: 'GPU Spot EU-BD Sovereign',
    gpus: [
      { type: 'RTX 4090', spot: '$0.20/h', location: 'BD-EU Sovereign' },
      { type: 'H100', spot: '$1.5/h', location: 'EU-BD' },
    ],
    compliance: 'Infisical + OpenObserve audit log',
    pc_vps: 'omni.hostamar.com LIVE',
    market: 'McKinsey $5.2T',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
