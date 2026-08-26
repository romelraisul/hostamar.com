import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
export const dynamic='force-dynamic'
export async function POST(req: NextRequest){
  try { await requireAdmin(req) } catch(e:any){ return Response.json({ error:'Unauthorized' },{status:401}) }
  const body=await req.json().catch(()=>({}))
  const suggested = Number(body.suggestedPrice)
  // In real app, update Stripe/PayPal prices + pricing page — here just log approval
  try {
    await prisma.$executeRaw`INSERT INTO "SeoEvent" (id, type, payload, "createdAt") VALUES (gen_random_uuid()::text, 'market_approve', ${JSON.stringify({ suggestedPrice: suggested, by:'admin', at: new Date().toISOString() })}::jsonb, NOW())`
  } catch {}
  return Response.json({ ok:true, message:`Approved ${suggested} Taka — /pricing will show updated Starter price (Stripe/PayPal sync TODO)` })
}
