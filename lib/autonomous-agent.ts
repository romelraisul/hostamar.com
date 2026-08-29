import { prisma } from '@/lib/prisma'

export function isAutonomousMode(){
  return process.env.AUTONOMOUS_MODE==='true' || process.env.NEXT_PUBLIC_AUTONOMOUS_MODE==='true'
}

export async function runAutonomousLoop(){
  const out:any = { health: null, db: null, pending: [] }
  // 1. health check
  try{
    const { S3Client, ListObjectsV2Command }:any = await import('@aws-sdk/client-s3')
    const s3 = new S3Client({ region: 'us-east-005', endpoint: 'https://s3.us-east-005.backblazeb2.com', credentials: { accessKeyId: process.env.B2_APPLICATION_KEY_ID||process.env.B2_ACCOUNT_ID||'', secretAccessKey: process.env.B2_APPLICATION_KEY||'' } } as any)
    const r:any = await s3.send(new ListObjectsV2Command({ Bucket: process.env.B2_BUCKET||'hostamar-prod', MaxKeys: 1 }))
    out.health = { ok:true, b2Count: r.KeyCount||0 }
  }catch(e:any){ out.health={ok:false, error:e.message} }

  // 2. DB counts
  try{
    const [customers, payments, transactions, tvStable] = await Promise.all([
      prisma.customer.count().catch(()=>0),
      prisma.payment.count().catch(()=>0),
      (prisma as any).transaction?.count?.().catch(()=>0) ?? 0,
      (prisma as any).tvChannelStability?.count?.().catch(()=>0) ?? 0
    ])
    out.db={customers, payments, transactions, tvStable}
  }catch(e:any){ out.db={error:e.message} }

  // 3. pending payments - auto-handle
  try{
    const pendings = await (prisma as any).transaction?.findMany?.({ where:{ status:'pending_verification' }, take:20, orderBy:{createdAt:'desc'} }).catch(()=>[]) ?? []
    out.pending = pendings
    for(const t of pendings){
      const trx = String(t.gatewayTrxId||t.transactionId||'')
      const valid = /^[A-Za-z0-9]{8,15}$/.test(trx)
      if(isAutonomousMode() && valid && [599,1299,2999,500,300,2000].includes(Number(t.amount||0))){
        // create notification for founder, don't auto-approve large amounts - just log
        try{
          await prisma.$executeRawUnsafe(`INSERT INTO "Notification" (id, "customerId", title, message, type, "createdAt") VALUES ($1,$2,$3,$4,$5,NOW())`, `n_${Date.now()}_${t.id}`, 'founder-os', `🤖 Autonomous: pending TrxID ${trx} ৳${t.amount} - needs review`, `${trx} valid format, AUTONOMOUS_MODE=true - check /admin/payments`, 'payment')
        }catch{}
      }
    }
  }catch{}

  // 4. save summary to AgentChat
  try{
    const summary = `🤖 Autonomous check ${new Date().toISOString()} health ${out.health?.ok?'ok':'fail'} db customers ${out.db?.customers||'?'} payments ${out.db?.payments||'?'} pending ${out.pending?.length||0} b2 ${out.health?.b2Count||'?'}` 
    await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`, `a_${Date.now()}`, 'assistant', summary, 'founder-os')
  }catch{}

  return out
}
