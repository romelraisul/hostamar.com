import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { product, customer } = await req.json().catch(() => ({}))
  const prices: any = {
    'agent-cloud': { usd: 49, bdt: 5400, name: 'Agent Cloud agent.hostamar.com' },
    'video-os': { usd: 0.10, bdt: 12, name: 'Video OS $0.10/min', per: 'minute' },
    'gpu-spot': { usd: 0.20, bdt: 22, name: 'RTX 4090 $0.20/h', type: 'RTX 4090' },
  }
  const p = prices[product] || prices['agent-cloud']
  return NextResponse.json({
    brand: 'hostamar.com',
    product: p.name,
    price_usd: p.usd,
    price_bdt: p.bdt,
    checkout: {
      bkash: `https://hostamar.com/billing/bkash?product=${product}&amount=${p.bdt}`,
      stripe: `https://hostamar.com/billing/stripe?product=${product}&amount=${p.usd}`,
      medusa: `https://hostamar.com/api/medusa/checkout`,
    },
    pc_vps: 'omni.hostamar.com 554 LIVE',
    gateway: '166 brand=hostamar.com goodAdded=9',
    note: 'First 10 customers Year1-2 5000@$50=$3M ARR path to $100M exit Year3-5 -> $4.2B revenue 0.1% $4.2T Year5-15 -> 10% = trillion valuation',
    customer,
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
