import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callBestModel } from '@/lib/ai-fallback'
import { prisma as prismaClient } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are Hostamar Support — you help customers in Bangla + English. You know: hostamar.com has 50 services AI video/image/logo/voiceover, pricing Starter 990/Pro 1900/Business 2900 BDT, bKash personal 01822417463 manual TrxID flow, storage B2 5GB free, TV 3700 channels stable 20, hosting. Be concise, friendly, ask for TrxID if payment issue, link to /dashboard/payment for bKash, /dashboard/storage for storage, /tv for TV, /support for human. Never reveal secrets. Use Bangla if user writes Bangla. Founder solo — autonomous mode handles when out of town.`

async function ensureTable(){
  // SQLite/Turso dialect: no JSONB type, no DEFAULT NOW() (Prisma-sqlite DDL)
  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentChat" (id TEXT PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL, "toolCalls" TEXT, "customerId" TEXT NOT NULL, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP)`) }catch(e){ console.warn('[support-chat] DDL AgentChat', (e as any)?.message?.slice(0,120)) }
  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentTask" (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, input TEXT, output TEXT, "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP)`) }catch(e){ console.warn('[support-chat] DDL AgentTask', (e as any)?.message?.slice(0,120)) }
}

export async function POST(req: NextRequest){
  await ensureTable()
  const body = await req.json().catch(()=>({}))
  const messages: Array<{role:string,content:string}> = body.messages || []
  const last = messages[messages.length-1]?.content || ''
  if(!last.trim()) return NextResponse.json({ error:'empty message' },{status:400})

  // Save user chat
  // SQLite dialect: ? placeholders, no ::jsonb, no NOW()
  try{ await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES (?,?,?,?,CURRENT_TIMESTAMP)`, `s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 'user', last.slice(0,4000), 'support-widget') }catch(e){ console.warn('[support-chat] insert user', (e as any)?.message?.slice(0,120)) }

  // Use unlimited fallback chain — best free model first, no card required
  const { text, model, provider } = await callBestModel(messages, SYSTEM)
  console.log('support chat model', model, provider)

  // Save assistant
  try{
    await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "toolCalls", "customerId", "createdAt") VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`, `s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 'assistant', text.slice(0,4000), JSON.stringify({model, provider}), 'support-widget')
  }catch(e){ console.warn('[support-chat] insert assistant', (e as any)?.message?.slice(0,120)) }
  // Also AgentTask for autonomous tracking
  try{
    await prisma.$executeRawUnsafe(`INSERT INTO "AgentTask" (id, type, status, input, output, "createdAt") VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`, `t_${Date.now()}`, 'support', 'completed', JSON.stringify({messages}), JSON.stringify({reply:text, model, provider}))
  }catch(e){ console.warn('[support-chat] insert task', (e as any)?.message?.slice(0,120)) }

  return NextResponse.json({ reply: text, model, provider, ok:true, system: 'Hostamar Support — best free chain no card' })
}

export async function GET(){
  return NextResponse.json({ ok:true, public:true, hint:'POST {messages:[{role,content}]}', model:'best free chain: vercel-gateway → litellm → nvidia → groq → openrouter → fallback', provider:'unlimited fallback no card' })
}
