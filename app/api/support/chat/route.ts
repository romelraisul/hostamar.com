import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { callVercelGateway } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYSTEM = `You are Hostamar Support — you help customers in Bangla + English. You know: hostamar.com has 50 services AI video/image/logo/voiceover, pricing Starter 599/Pro 1299/Business 2999 BDT, bKash personal 01822417463 manual TrxID flow, storage B2 5GB free, TV 3700 channels stable 20, hosting. Be concise, friendly, ask for TrxID if payment issue, link to /dashboard/payment for bKash, /dashboard/storage for storage, /tv for TV, /support for human. Never reveal secrets. Use Bangla if user writes Bangla.`

async function ensureTable(){
  try{ await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentChat" (id TEXT PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL, "toolCalls" JSONB, "customerId" TEXT NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW())`) }catch{}
}

export async function POST(req: NextRequest){
  await ensureTable()
  const body = await req.json().catch(()=>({}))
  const messages: Array<{role:string,content:string}> = body.messages || []
  const last = messages[messages.length-1]?.content || ''
  if(!last.trim()) return NextResponse.json({ error:'empty message' },{status:400})

  // Save user chat
  try{ await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`, `s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 'user', last.slice(0,4000), 'support-widget') }catch{}

  // Try A: Vercel AI Gateway with google model
  let modelUsed = 'google/gemini-2.0-flash'
  let reply = ''
  let provider = 'gateway'
  try{
    const gw = await callVercelGateway({ model: 'google/gemini-2.5-flash-lite', messages:[{role:'system',content:SYSTEM},{role:'user',content:last}], max_tokens:512 })
    if(gw.ok){ reply = gw.content; modelUsed = gw.model; provider='vercel-gateway' }
    else {
      // fallback to gpt-oss
      const gw2 = await callVercelGateway({ model: 'openai/gpt-oss-120b', messages:[{role:'system',content:SYSTEM},{role:'user',content:last}], max_tokens:512 })
      if(gw2.ok){ reply=gw2.content; modelUsed=gw2.model; provider='vercel-gateway' }
      else throw new Error(gw.error || gw2.error)
    }
  }catch(e:any){
    // Try B: litellm http://litellm:4000/v1 if key
    if(process.env.LITELLM_API_KEY){
      try{
        const base = (process.env.LITELLM_BASE_URL || 'http://litellm:4000/v1').replace(/\/$/,'')
        const r = await fetch(`${base}/chat/completions`,{ method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${process.env.LITELLM_API_KEY}`}, body: JSON.stringify({ model: process.env.LITELLM_MODEL || 'google/gemini-1.5-flash', messages:[{role:'system',content:SYSTEM},{role:'user',content:last}], max_tokens:512 }) })
        if(r.ok){ const j:any=await r.json(); reply=j.choices?.[0]?.message?.content || ''; modelUsed=j.model || 'litellm/google'; provider='litellm' }
      }catch{}
    }
    // Try C: direct OpenAI fallback if still empty
    if(!reply && process.env.OPENAI_API_KEY){
      try{
        const { generateText } = await import('ai')
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const { text } = await generateText({ model: openai('gpt-4o-mini'), system: SYSTEM, prompt: last, maxOutputTokens: 512 })
        reply = text; modelUsed='openai/gpt-4o-mini'; provider='openai'
      }catch{}
    }
    // Final fallback mock — never 500, always answer
    if(!reply){
      const lower = last.toLowerCase()
      if(lower.includes('bkash') || lower.includes('বিকাশ') || lower.includes('payment')){
        reply = `bKash পেমেন্ট: 01822417463 (personal) তে Send Money করুন, তারপর TrxID + amount নিয়ে /dashboard/payment এ সাবমিট করুন। Admin /admin/payments এ approve করলে credits যোগ হবে। বিস্তারিত: https://hostamar.com/dashboard/payment — model: ${modelUsed} (${provider} fallback, set AI_GATEWAY_API_KEY for real Gemini)`
      } else if(lower.includes('storage') || lower.includes('স্টোরেজ')){
        reply = `Storage B2 5GB free — ফাইল আপলোড /dashboard/storage এ, S3 s3.us-east-005 bucket hostamar-prod। যেকোনো size 50MB পর্যন্ত।`
      } else if(lower.includes('tv') || lower.includes('চ্যানেল')){
        reply = `Hostamar TV — 3700 চ্যানেল, stable 20 auto-seed, দেখুন https://hostamar.com/tv — logo + .m3u8 সহ।`
      } else {
        reply = `Hostamar Support (mock — set AI_GATEWAY_API_KEY for real Google Gemini). আপনি বললেন: "${last.slice(0,300)}"\n\nআমরা 50 সার্ভিস দিই — AI video/image/voiceover, hosting, storage 5GB। Pricing Starter 599/Pro 1299/Business 2999। bKash 01822417463 — TrxID দিন। Model: ${modelUsed} via ${provider} (fallback).`
      }
      modelUsed += ' (mock fallback)'
    }
  }

  try{ await prisma.$executeRawUnsafe(`INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1,$2,$3,$4,NOW())`, `s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 'assistant', reply.slice(0,4000), 'support-widget') }catch{}

  // Return non-streaming JSON for simple widget; also support streaming if client expects
  return NextResponse.json({ reply, model: modelUsed, provider, system: 'Hostamar Support — Google Gemini via Vercel AI Gateway' })
}

export async function GET(){
  return NextResponse.json({ ok:true, public:true, hint:'POST {messages:[{role,content}]}', model:'google/gemini-2.5-flash-lite via vercel-gateway', provider:'vercel AI Gateway vgw_...' })
}
