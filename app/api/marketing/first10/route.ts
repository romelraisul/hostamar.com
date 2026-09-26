import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    goal: 'First 10 paying customers Year1-2 5000@$50=$3M ARR',
    products: [
      {
        route: '/agent',
        name: 'Agent Cloud agent.hostamar.com $49/mo',
        pitch: 'Persistent container cron storage memory GPU 1400 API Base44 $80M exit',
        cta: 'Try free 1 agent',
      },
      {
        route: '/video-os',
        name: 'Video OS Script to Monetization $0.10/min',
        pitch: 'OpenCut InfiniteTalk Voicebox ACE-Step Auto YouTube TikTok Hostamar CDN bKash paywall Luma $18.6B',
        cta: 'Render 1 min free',
      },
      {
        route: '/gpu-spot',
        name: 'GPU Spot EU-BD Sovereign $0.20/$1.5/h',
        pitch: 'RTX 4090 $0.20 H100 $1.5 Data never US Infisical OpenObserve McKinsey $5.2T',
        cta: 'Spin GPU 1h free',
      },
    ],
    funnel: 'Landing -> /billing bKash 5400 BDT + Stripe $49 -> /admin/chat PC-VPS LIVE support -> Fleet 19 Nova Forge Harbor Reel Pulse Bazaar Orion Quill Vertex 24/7 build',
    whereToSee: '/admin?tab=fleet FleetReport, /admin?tab=employees ops/feed 129 events, /api/v1/models 166 brand, /api/v1/good-models 9 live hourly, self-heal.log hourly',
    pc_off: 'Chat answers from Upstash cache good-models 9 + fleet-feed 129 + Turso backup TG 1563 + Drive 1499 even PC off',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
