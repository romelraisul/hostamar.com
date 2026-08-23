import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import crypto from 'crypto'

export const maxDuration = 30

function encrypt(text: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let enc = cipher.update(text, 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${enc}`
}

/** POST /api/crypto/wallet/create { userId, chain? } -> { address } */
export async function POST(req: Request) {
  try {
    await ensureSchema()
    const b = await req.json().catch(() => ({}))
    const userId = String(b.userId || b.user_id || 'anon')
    const chain = String(b.chain || 'ethereum')
    // Generate a deterministic-looking ETH address from random bytes (no real funds without proper HD derivation, but valid format)
    const priv = crypto.randomBytes(32).toString('hex')
    const address = '0x' + crypto.createHash('sha256').update(priv).digest('hex').slice(0, 40)
    const secret = process.env.HOSTAMAR_CRYPTO_SECRET || process.env.CRYPTO_SECRET || 'dev-only-secret-change-me'
    const enc = encrypt(priv, secret)
    const row = await (prisma as any).cryptoWallet.create({
      data: { userId, address, privateKeyEncrypted: enc, chain }
    })
    return NextResponse.json({ ok: true, wallet: { id: row.id, address: row.address, chain: row.chain } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message?.slice(0,200) }, { status: 500 })
  }
}

/** GET /api/crypto/wallet?userId=xxx */
export async function GET(req: Request) {
  try {
    await ensureSchema()
    const u = new URL(req.url)
    const userId = u.searchParams.get('userId') || 'anon'
    const rows = await (prisma as any).cryptoWallet.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ ok: true, wallets: rows.map((r:any) => ({ id:r.id, address:r.address, chain:r.chain })) })
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message?.slice(0,200) }, { status:500 })
  }
}
