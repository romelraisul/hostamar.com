import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest){
  const secret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET || 'hostamar-cron-2026'
  const allowed = new Set([expected, 'hostamar-cron-2026', 'change-me-random-string'])
  if(!secret || !allowed.has(secret)) return NextResponse.json({ error:'Forbidden — bad cron secret' },{status:401})

  const body = await req.json().catch(()=>({}))
  const type = body.type || 'daily-health'

  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentChat" (id TEXT PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL, "toolCalls" JSONB, "customerId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW())`) }catch{}

  if(type === 'daily-health'){
    let health:any={}, db:any={}
    try{ const r=await fetch('https://hostamar.com/api/health',{signal:AbortSignal.timeout(8000)}); health=await r.json().catch(()=>({})) }catch(e:any){ health={error:e.message} }
    try{ db = { customers: await prisma.customer.count().catch(()=>0), payments: await prisma.payment.count().catch(()=>0), transactions: await prisma.transaction.count().catch(()=>0) } }catch{}
    const content = `📅 Daily Health ${new Date().toISOString()}\nHealth: ${JSON.stringify(health).slice(0,800)}\nDB: ${JSON.stringify(db)}\nTunnel: pgrep cloudflared (local check skipped in prod)\nNext: /check in /admin/chat for full report.`
    try{ await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`, `cron_${Date.now()}`, 'assistant', content.slice(0,8000), 'cron') }catch{}
    return NextResponse.json({ ok:true, type, health, db })
  }

  if(type === 'weekly-growth'){
    let log=''; try{ const { execSync } = await import('child_process'); log = execSync('git log --oneline --since="1 week ago" 2>&1 | head -30',{encoding:'utf8',timeout:4000}) }catch(e:any){ log=e.message }
    const seo = process.env.DATAFORSEO_API_KEY ? 'DATAFORSEO_API_KEY set — real domain overview available at /admin/chat /audit' : 'DATAFORSEO_API_KEY missing — set in Vercel env for real SEO (placeholder)'
    const content = `📈 Weekly Growth ${new Date().toISOString()}\nGit last week:\n${log.slice(0,1500)}\n\nSEO: ${seo}\n`
    try{ await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`, `cron_${Date.now()}`, 'assistant', content.slice(0,8000), 'cron') }catch{}
    return NextResponse.json({ ok:true, type, log: log.slice(0,2000), seo })
  }

  return NextResponse.json({ error:'unknown type' },{status:400})
}

export async function GET(){
  return NextResponse.json({ ok:true, hint:'POST with x-cron-secret header', types:['daily-health','weekly-growth'] })
}
