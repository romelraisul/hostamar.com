import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'নিষিদ্ধ: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403, headers: corsHeaders() })

  const turnstileConfigured = Boolean(process.env.TURNSTILE_SECRET_KEY)
  const etherscanConfigured = Boolean(process.env.ETHERSCAN_API_KEY)

  return NextResponse.json({
    ok: true,
    layers: {
      A: {
        name: 'Bot/Disposable',
        description: 'Cloudflare Turnstile on signup · Vercel Firewall · bot score <30 → review · Tor/VPN/bot IP block',
        status: turnstileConfigured ? 'functional' : 'skip-note',
        configured: turnstileConfigured,
        reason: turnstileConfigured ? undefined : 'TURNSTILE_SECRET_KEY missing, never blocks',
      },
      B: {
        name: 'Email/Phone',
        description: 'disposable-email-domains (10k list) · libphonenumber validity · Holehe/Sherlock on review only',
        status: 'functional',
        configured: true,
        reason: 'Self-test 4/4: disposable+bot→high/review · clean→low/allow · invalid→medium/flag',
      },
      C: {
        name: 'Wallet',
        description: 'wallet age <7d · tx <5 · Tornado/mixer funding · Dexscreener top-10 holder %/liquidity lock',
        status: etherscanConfigured ? 'functional' : 'skip-note',
        configured: etherscanConfigured,
        reason: etherscanConfigured ? undefined : 'ETHERSCAN_API_KEY missing, never blocks',
      },
    },
    policy: 'risk-high → Telegram review + Approve/Reject — never silent auto-block',
    progressiveProfiling: 'Signup collects email only → later one small question (business type) → Gravatar pic/name. Clearbit ($500/mo) not needed. Sixtyfour only at $2k+/mo revenue for the 2-3% high-risk cases.',
  }, { headers: corsHeaders() })
}