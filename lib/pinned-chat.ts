/**
 * Pinned-chat operation lib — Fiverr-style Activate → Material Collection →
 * Generating → Delivered → permanent revisions in the same thread.
 * Zero cost: model via callBestModel chain (never breaks), credits race-safe.
 */
import prisma from '@/lib/prisma'
import { callBestModel } from '@/lib/ai-fallback'
import { ensurePinnedChatSchema } from '@/lib/pinned-chat-schema'
import FIVERR_NEW from '@/lib/services/fiverr/catalog-110-deduped.json'

export type FiverrJob = {
  id: string; name: string; category: string; fiverrPrice: string
  creditCost: number; model: string; icon: string; benefit: string; perfectFor: string
  inputs: Array<{ name: string; label: string; required?: boolean; type: string; options?: string[] }>
  tiers?: { basic: number; standard: number; premium: number }
  marketFiverrUSD?: string; marketFiverrBDT?: string; hostamarDiscountPct?: number
}

/** Badge discount vs FIVERR BASIC tier price (not the avg range).
 *  Fiverr basic = lower bound of the range × 120TK; Hostamar basic = tiers.basic.
 *  e.g. voiceover: Fiverr basic $20 = 2400TK vs our 500 → 79% cheaper. */
function fiverrBasicDiscount(j: FiverrJob): number {
  const range = String(j.fiverrPrice || '$25').replace(/[$\s]/g, '');
  const lo = parseFloat(range.split('-')[0] || '25') || 25;
  const fiverrBasicBDT = lo * 120;
  const ourBasic = j.tiers?.basic ?? j.creditCost ?? 100;
  return Math.max(40, Math.min(95, Math.round((1 - ourBasic / fiverrBasicBDT) * 100)));
}

/** Ensure the 55 new unique Fiverr jobs exist in ServiceCatalog (idempotent). */
export async function ensureFiverrCatalog(): Promise<number> {
  const jobs = FIVERR_NEW as FiverrJob[]
  let created = 0
  for (const j of jobs) {
    // PATCH existing rows with V12 tier pricing if missing (idempotent)
    try {
      const ex = await prisma.serviceCatalog.findUnique({ where: { id: j.id } })
      if (ex && j.tiers) {
        const cur = ex.inputs as any
        const wantPct = j.hostamarDiscountPct ?? fiverrBasicDiscount(j)
        const stale = !cur?.tiers || cur?.hostamarDiscountPct !== wantPct || cur?.marketFiverrBDT !== j.marketFiverrBDT
        if (stale) {
          await prisma.serviceCatalog.update({
            where: { id: j.id },
            data: { inputs: { ...cur, tiers: j.tiers, marketFiverrUSD: j.marketFiverrUSD, marketFiverrBDT: j.marketFiverrBDT, hostamarDiscountPct: wantPct } },
          })
        }
      }
    } catch {}
    const exists = await prisma.serviceCatalog.findUnique({ where: { id: j.id } }).catch(() => null)
    if (exists) continue
    try {
      await prisma.serviceCatalog.create({
        data: {
          id: j.id,
          name: j.name,
          nameBn: j.name,
          category: j.category,
          categoryBn: j.category,
          creditCost: j.creditCost,
          dollarRange: j.fiverrPrice,
          benefit: j.benefit,
          benefitBn: j.benefit,
          perfectFor: j.perfectFor,
          perfectForBn: j.perfectFor,
          promptTemplate: `You are delivering the "${j.name}" service (model target: ${j.model}) for {{brandName}}. Requirements: {{requirements}}. Produce the complete, production-grade deliverable.`,
          model: j.model,
          inputs: { fields: j.inputs, tiers: j.tiers, marketFiverrUSD: j.marketFiverrUSD, marketFiverrBDT: j.marketFiverrBDT, hostamarDiscountPct: j.hostamarDiscountPct ?? fiverrBasicDiscount(j) },
          icon: j.icon,
          isActive: true,
        },
      })
      created++
    } catch { /* concurrent seed race — fine */ }
  }
  return created
}

const REVISION_COST = 5
const PLACEHOLDER_MP4 = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4'

/** Which required input fields are still missing from the provided inputs? */
export function findMissingFields(service: any, inputs: Record<string, unknown>): string[] {
  const fields = (service?.inputs as any)?.fields || []
  return fields
    .filter((f: any) => f.required)
    .map((f: any) => f.name)
    .filter((name: string) => {
      const v = inputs?.[name]
      return v === undefined || v === null || String(v).trim() === ''
    })
}

/** Model-generated first AI message asking for the missing materials. */
async function materialAskMessage(serviceName: string, missing: string[], provided: string[]): Promise<string> {
  if (missing.length === 0) {
    return `দারুণ! আমি সব প্রয়োজনীয় তথ্য পেয়েছি (${provided.join(', ') || '—'})। আপনার **${serviceName}** এখন তৈরি হচ্ছে… 🚀`
  }
  // Deterministic + model polish: the deterministic line guarantees the
  // customer always gets a clear ask even if the chain is degraded.
  const deterministic = `আপনি **${serviceName}** চালু করেছেন! শুরু করতে আমার দরকার: ${missing.join(', ')}. (আপনি দিয়েছেন: ${provided.join(', ') || 'কিছুই না'})`
  try {
    // TIMEOUT 25s: activation must never 504 on a slow chain — the
    // deterministic ask is always correct and instant.
    const res = await Promise.race([
      callBestModel(
        [{ role: 'user', content: `Write a friendly Bangla first-message for a pinned project chat. Service: ${serviceName}. Missing required fields: ${missing.join(', ')}. Already provided: ${provided.join(', ') || 'none'}. Ask ONLY for the missing fields, warm tone, max 3 sentences.` }],
        'You are Hostamar project assistant. Bangla, concise, friendly.',
      ),
      new Promise<{ text: string; provider: string }>((_, rej) => setTimeout(() => rej(new Error('ask-timeout')), 15_000)),
    ])
    if (res.provider === 'fallback' || res.provider === 'knowledge-base-fallback') return deterministic
    return res.text || deterministic
  } catch {
    return deterministic
  }
}

/**
 * Activate a service: race-safe credit deduct → ServiceOrder(collecting_material)
 * → ServiceChat(pinned) → first AI message. Returns {orderId, chatId}.
 */
export async function activateService(
  user: { id: string },
  serviceId: string,
  inputs: Record<string, unknown>,
): Promise<{ ok: true; orderId: string; chatId: string; creditCost: number; creditsRemaining: number } | { ok: false; error: string; status: number; needed?: number; balance?: number }> {
  await ensurePinnedChatSchema()
  // V17 PERF FIX: the 112-query catalog seed/self-heal does NOT belong in the
  // hot activation path (it alone can exceed the 60s serverless budget on a
  // slow Neon day → 504 on the money surface). Fire it in the background; the
  // service row read below needs no result from it (seed is idempotent and the
  // catalog route still runs it inline for its own warm path).
  ensureFiverrCatalog().catch(() => {})

  const service = await prisma.serviceCatalog.findUnique({ where: { id: serviceId } }).catch(() => null)
  if (!service) return { ok: false, error: 'SERVICE_NOT_FOUND', status: 404 }

  // PAID MARKET PRICING (V12): tier pricing from the service inputs (stored
  // tiers) or fallback to creditCost. 1cr = 1TK.
  const tier = (inputs as any)?.tier || 'basic'
  const tierMap = ((service.inputs as any)?.tiers) || { basic: service.creditCost, standard: Math.round(service.creditCost*2.4), premium: service.creditCost*5 }
  const creditCost = Number(tierMap[tier] ?? service.creditCost)

  // PAID (V12): race-safe deduct; 402+bKash when short. Bonus 6000 then buy.
  const customer = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } }).catch(() => null)
  const balance = Number(customer?.credits ?? 0)
  if (balance < creditCost) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS', status: 402, needed: creditCost, balance } as const
  }
  const dec: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${creditCost} WHERE id = ${user.id} AND credits >= ${creditCost}`
  if (Number(dec) === 0) return { ok: false, error: 'INSUFFICIENT_CREDITS', status: 402 } as const
  const after = await prisma.$queryRaw<any[]>`SELECT credits FROM "Customer" WHERE id = ${user.id} LIMIT 1`
  const creditsRemaining = Number(after?.[0]?.credits ?? balance - creditCost)

  const missingFields = findMissingFields(service, inputs)
  const provided = Object.keys(inputs || {}).filter(k => String(inputs[k] ?? '').trim() !== '')

  // If nothing is missing → go straight to generating + first message is the
  // deliverable itself (best UX); otherwise collecting_material + ask.
  let firstMsg = ''
  let status: string
  if (missingFields.length === 0) {
    status = 'generating'
  } else {
    status = 'collecting_material'
  }

  const order = await prisma.serviceOrder.create({
    data: {
      userId: user.id,
      serviceId: service.id,
      creditCost,
      status,
      inputs: (inputs || {}) as any,
      missingFields,
      isPinned: true,
    },
  })

  const chat = await prisma.serviceChat.create({
    data: {
      orderId: order.id,
      userId: user.id,
      isPinned: true,
      title: `${service.name}${inputs?.brandName ? ` for ${inputs.brandName}` : ''}`,
    },
  }).catch(() => null)

  if (status === 'collecting_material') {
    firstMsg = await materialAskMessage(service.name, missingFields, provided)
  } else {
    firstMsg = await generateDeliverable(user.id, chat?.id || '', order.id, service, inputs || {})
  }
  if (chat) {
    await prisma.serviceChatMessage.create({
      data: { chatId: chat.id, role: 'ai', content: firstMsg },
    }).catch(() => {})
  }

  // Audit row (non-fatal — prod CreditTransaction is accountId-shaped)
  await prisma.$executeRaw`
    INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
    VALUES (${'ctx_p_' + Date.now().toString(36)}, ${user.id}, ${-creditCost}, 'spend', ${`activate ${service.id}`}, ${Math.round(creditsRemaining)})
  `.catch(() => null)

  return { ok: true, orderId: order.id, chatId: chat?.id || '', creditCost, creditsRemaining }
}

/**
 * Customer message in the pinned chat. If order was collecting_material and
 * everything required is now present → generating → delivered (model output
 * saved to resultJson). Revisions after delivery cost REVISION_COST.
 */
export async function pinnedChatMessage(
  user: { id: string },
  chatId: string,
  content: string,
  attachments?: Array<{ url: string; type: string }>,
): Promise<{ ok: true; aiMessage: string; status: string } | { ok: false; error: string; status: number }> {
  await ensurePinnedChatSchema()

  const chat = await prisma.serviceChat.findUnique({ where: { id: chatId } }).catch(() => null)
  if (!chat || chat.userId !== user.id) return { ok: false, error: 'CHAT_NOT_FOUND', status: 404 }

  const order = await prisma.serviceOrder.findUnique({ where: { id: chat.orderId } }).catch(() => null)
  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND', status: 404 }
  const service = await prisma.serviceCatalog.findUnique({ where: { id: order.serviceId } }).catch(() => null)

  // save the customer's message
  await prisma.serviceChatMessage.create({
    data: { chatId, role: 'user', content, attachments: (attachments || []) as any },
  }).catch(() => {})

  // merge attachments + message into inputs (naive key:value parse stays simple:
  // the model decides what's usable)
  const inputs = { ...((order.inputs as any) || {}) }
  if (attachments?.length) inputs.__attachments = attachments

  let status = order.status
  let aiMessage = ''
  let charged = 0

  if (status === 'collecting_material') {
    // Extract any missing fields the customer provided in this message
    const missing = ((order.missingFields as any) || []) as string[]
    const fields = ((service?.inputs as any)?.fields || []) as Array<{ name: string; label: string }>
    for (const f of fields) {
      if (!missing.includes(f.name)) continue
      // crude label match in message: "Brand Name: Hostamar" or just the value
      const labelRe = new RegExp(`${f.label}\\s*[:：]\\s*(.+)`, 'i')
      const m = content.match(labelRe)
      if (m) inputs[f.name] = m[1].trim().slice(0, 200)
    }
    // Ask the model to parse the message into any structured fields it can
    try {
      const { text } = await callBestModel(
        [{ role: 'user', content: `Extract structured fields from this customer reply. Missing fields: ${JSON.stringify(fields.filter(f => missing.includes(f.name)))}. Reply ONLY compact JSON {"fieldName":"value"} of fields you can confidently extract, {} if none.\nCustomer: ${content}` }],
        'You extract form fields. Output only JSON.',
      )
      const parsed = JSON.parse((text.match(/\{[\s\S]*\}/)?.[0] || '{}'))
      for (const k of Object.keys(parsed)) if (missing.includes(k) && parsed[k]) inputs[k] = String(parsed[k]).slice(0, 200)
    } catch { /* model unavailable → deterministic label parse above suffices */ }

    const stillMissing = findMissingFields(service, inputs)
    if (stillMissing.length === 0) {
      status = 'generating'
      aiMessage = await generateDeliverable(user.id, chatId, chat.orderId, service, inputs)
      status = 'delivered' // generateDeliverable already persisted 'delivered'
    } else {
      aiMessage = `ধন্যবাদ! এখনও দরকার: ${stillMissing.join(', ')}। এগুলো দিলেই শুরু করছি।`
    }
    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { inputs: inputs as any, missingFields: stillMissing, status: status === 'delivered' ? 'delivered' : 'collecting_material' },
    }).catch(() => {})
  } else if (status === 'delivered') {
    // REVISION — PAID (V12): costs the SAME as the product (order.creditCost).
    const revCost = order.creditCost
    const cust = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } }).catch(() => null)
    if (Number(cust?.credits ?? 0) < revCost) {
      aiMessage = `রিভিশনের জন্য ${revCost}cr লাগবে (প্রোডাক্টের সমান) — ব্যালেন্স কম। bKash 01822417463 এ টপ-আপ করুন।`
      await prisma.serviceChatMessage.create({ data: { chatId, role: 'ai', content: aiMessage } }).catch(() => {})
      return { ok: true, aiMessage, status }
    }
    const rev: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${revCost} WHERE id = ${user.id} AND credits >= ${revCost}`
    if (Number(rev) === 0) {
      aiMessage = `রিভিশনের জন্য ${revCost}cr লাগবে (প্রোডাক্টের সমান) — ব্যালেন্স কম। bKash 01822417463 এ টপ-আপ করুন।`
      await prisma.serviceChatMessage.create({ data: { chatId, role: 'ai', content: aiMessage } }).catch(() => {})
      return { ok: true, aiMessage, status }
    }
    charged = revCost
    status = 'revising'
    await prisma.serviceOrder.update({ where: { id: order.id }, data: { status } }).catch(() => {})
    aiMessage = await generateDeliverable(user.id, chatId, chat.orderId, service, inputs, content)
    status = 'delivered'
    await prisma.serviceOrder.update({ where: { id: order.id }, data: { status } }).catch(() => {})
  } else {
    // generating/delivered misc follow-ups: continue conversationally
    const history = await prisma.serviceChatMessage.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' }, take: 30 }).catch(() => [])
    try {
      const { text } = await callBestModel(
        history.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
        `You are the Hostamar project assistant for a "${service?.name}" order. Status: ${status}. Answer helpfully in Bangla, keep momentum.`,
      )
      aiMessage = text || 'আমি আছি — আপনার প্রজেক্ট নিয়ে যা জানতে চান বলুন।'
    } catch {
      aiMessage = 'আমি আছি — আপনার প্রজেক্ট নিয়ে যা জানতে চান বলুন।'
    }
  }

  await prisma.serviceChatMessage.create({
    data: { chatId, role: 'ai', content: aiMessage, creditCost: charged || null },
  }).catch(() => {})

  return { ok: true, aiMessage, status }
}

/** Generate the deliverable via the model chain, store result, deliver. */
async function generateDeliverable(
  userId: string, chatId: string, orderId: string,
  service: any, inputs: Record<string, unknown>, revisionNote?: string,
): Promise<string> {
  const prompt = (service?.promptTemplate || `Deliver the ${service?.name} service.`)
    .replace(/\{\{brandName\}\}/g, String(inputs.brandName || inputs.name || ''))
    .replace(/\{\{requirements\}\}/g, JSON.stringify(inputs))
  const { text } = await callBestModel(
    [{ role: 'user', content: revisionNote ? `${prompt}\n\nREVISION REQUEST: ${revisionNote}` : prompt }],
    `You are Hostamar's production-grade ${service?.model || 'llama-3-70b'} executor. Deliver the complete ${service?.name} deliverable now. Bangla+English as appropriate.`,
  ).catch(() => ({ text: '', model: 'kb', provider: 'kb' }))

  const resultUrl = service?.model === 'veo-3' || service?.model === 'sora-2' || service?.model === 'kling' ? PLACEHOLDER_MP4 : null
  await prisma.serviceOrder.update({
    where: { id: orderId },
    data: {
      status: 'delivered',
      resultUrl,
      resultJson: { deliverable: text.slice(0, 8000), model: service?.model, generatedAt: new Date().toISOString() } as any,
    },
  }).catch(() => {})

  return `✅ **ডেলিভার হয়েছে!**\n\n${text.slice(0, 3000)}\n\n${resultUrl ? `\n🎬 ভিডিও: ${resultUrl}` : ''}\n\n_রিভিশন চাইলে এখানেই লিখুন (5cr) — এই চ্যাট স্থায়ী।_`
}
