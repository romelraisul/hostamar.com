import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    finalGoal:
      '25 tools alone ≠1T revenue market ~155B impossible 4.17B customers. 3 products on top open trillion-market entry: Agent Cloud $49/mo + Video OS $0.10/min + GPU Spot $0.20/$1.5. Path $3M ARR Year1-2 5000@$50 -> $100M exit Year3-5 -> $4.2B revenue 0.1% $4.2T Year5-15 -> 10% owner = trillion valuation. Bouke bolo jomi kinbo jekhane sobai bari banabe otai trillion.',
    products: {
      p1: { name: 'Agent Cloud agent.hostamar.com', price: '$49/mo', route: '/agent' },
      p2: { name: 'Video OS Script to Monetization', price: '$0.10/min', route: '/video-os' },
      p3: { name: 'GPU Spot EU-BD Sovereign', price: 'RTX $0.20/h H100 $1.5/h', route: '/gpu-spot' },
    },
    cost: 'Zero — Vercel static 100GB free, Cloudflare Tunnel free, your PC as VPS',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
