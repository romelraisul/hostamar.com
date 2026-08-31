import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAutonomousLoop } from '@/lib/autonomous-agent'
import { callBestModel } from '@/lib/ai-fallback'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(req: NextRequest){
  // V18 SECURITY (live-exploited hole): the previous code accepted the public
  // fallback secret 'hostamar-cron-2026' + the literal 'change-me-random-string'
  // when CRON_SECRET was unset — an anonymous caller triggered auto-payments
  // (grants +6000cr per matched pending row). Now FAIL CLOSED: no CRON_SECRET
  // in env → every caller is rejected. No hardcoded fallbacks, ever.
  const expected = process.env.CRON_SECRET || ''
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if(!expected || !secret || secret !== expected) return NextResponse.json({ error:'Forbidden — bad cron secret' },{status:401})

  const body = await req.json().catch(()=>({}))
  const type = body.type || 'daily-health'

  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentChat" (id TEXT PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL, "toolCalls" JSONB, "customerId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW())`) }catch{}
  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentTask" (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT DEFAULT 'pending', input JSONB NOT NULL, output JSONB, "createdAt" TIMESTAMP DEFAULT NOW())`) }catch{}

  if(type === 'daily-health'){
    const out = await runAutonomousLoop()
    return NextResponse.json({ ok:true, type, ...out })
  }

  if(type === 'auto-support'){
    // check support-widget chats last 24h without assistant reply within 5m
    try{
      const rows:any = await prisma.$queryRawUnsafe(`SELECT id, content, "createdAt" FROM "AgentChat" WHERE "customerId"='support-widget' AND role='user' ORDER BY "createdAt" DESC LIMIT 20`)
      let fixed=0
      for(const r of rows){
        const hasReply:any = await prisma.$queryRawUnsafe(`SELECT 1 FROM "AgentChat" WHERE "customerId"='support-widget' AND role='assistant' AND "createdAt" > $1 LIMIT 1`, r.createdAt).catch(()=>[])
        if(Array.isArray(hasReply) && hasReply.length===0){
          const { text, model, provider } = await callBestModel([{role:'user', content: r.content}], 'You are Hostamar Support — Bangla+English, 50 services, pricing 599/1299/2999, bKash 01822417463, storage 5GB s3.us-east-005, TV 3700/20')
          await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "toolCalls", "customerId", "createdAt") VALUES ($1,$2,$3,$4::jsonb,$5,NOW())`, `auto_${Date.now()}_${fixed}`, 'assistant', text.slice(0,4000), JSON.stringify({model, provider, auto:true}), 'support-widget')
          fixed++
          if(fixed>=5) break
        }
      }
      return NextResponse.json({ ok:true, type, fixed })
    }catch(e:any){ return NextResponse.json({ ok:false, error:e.message },{status:500}) }
  }

  if(type === 'auto-payments'){
    try{
      const pendings:any = await prisma.$queryRawUnsafe(`SELECT id, "gatewayTrxId", amount FROM "Transaction" WHERE status='pending_verification' ORDER BY "createdAt" DESC LIMIT 20`).catch(()=>[])
      const valid = Array.isArray(pendings) ? pendings.filter((t:any)=> /^[A-Za-z0-9]{8,15}$/.test(String(t.gatewayTrxId||''))) : []
      let completed=0
      for(const t of valid){
        // AgentTask: create → review → completed (auto-approve valid TrxID + known plan amounts)
        const taskId = `pay_${t.id}_${Date.now()}`
        try{
          await prisma.$executeRawUnsafe(`INSERT INTO "AgentTask" (id, type, status, input, output, "createdAt") VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,NOW())`, taskId, 'payment-review', 'completed', JSON.stringify({transactionId:t.id, trxId:t.gatewayTrxId, amount:t.amount}), JSON.stringify({autoApproved:true, reason:'TrxID format valid + plan amount match'}))
          // Approve the transaction (valid format + known plan price 599/1299/2999)
          if([599,1299,2999].includes(Number(t.amount||0))){
            await prisma.$executeRawUnsafe(`UPDATE "Transaction" SET status='completed' WHERE id=$1`, t.id)
            // Notification to the customer
            await prisma.$executeRawUnsafe(`INSERT INTO "Notification" (id, "customerId", type, title, message, "actionUrl", read, "createdAt") SELECT $1, "customerId", 'payment', 'পেমেন্ট অনুমোদিত ✅', $2, '/dashboard/services', false, NOW() FROM "Transaction" WHERE id=$3`, `n_${Date.now()}_${t.id}`, `TrxID ${t.gatewayTrxId} ৳${t.amount} যাচাই সম্পন্ন — সার্ভিস অ্যাক্টিভ হচ্ছে`, t.id).catch(()=>{})
            // Grant plan credits (6000 per plan month)
            await prisma.$executeRawUnsafe(`UPDATE "Customer" SET credits = credits + 6000 WHERE id = (SELECT "customerId" FROM "Transaction" WHERE id=$1)`, t.id).catch(()=>{})
          }
          completed++
        }catch{}
      }
      return NextResponse.json({ ok:true, type, pending: pendings.length, valid: valid.length, completed })
    }catch(e:any){ return NextResponse.json({ ok:false, error:e.message },{status:500}) }
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
  return NextResponse.json({ ok:true, hint:'POST with x-cron-secret header', types:['daily-health','auto-support','auto-payments','weekly-growth'] })
}
