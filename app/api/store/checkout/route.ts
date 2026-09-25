export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// POST /api/store/checkout — public Medusa checkout bridge (FORGE, 2026-09-14).
//
// The storefront (hostamar.com) had ZERO path to the 123-product Medusa catalog
// until store.hostamar.com went live (public tunnel, shift 20:55). This route is
// the server-side bridge so browser code never sees the publishable key and the
// tunnel origin stays hidden:
//
//   1. create cart (region reg_01M27...) -> add line item -> set email+address
//      -> add shipping method -> payment collection + session (pp_system_default,
//      the manual send-money provider — buyer reference round-trips via data{}),
//   2. complete the cart -> Medusa creates the order AND the notification-local
//      order-placed subscriber fires (receipt pipeline, fixed 19:20 shift).
//
// Body: { variant_id, quantity?, email, name, address1, city, postcode?, phone? }
//   phone: buyer number — the ONLY order↔bKash-statement reconciliation key on
//   the manual send-money path (BINDING 09-14). Store API rejects top-level
//   `phone` (Unrecognized fields) — 400-verified 09-15; it persists ONLY nested
//   in shipping_address (→ order_address.phone, DB-verified order_01M2GHVE...).
// Response: { orderId, amountBdt, status }
//   Auth: none (public — like /api/contact / /api/services/catalog). Rate-limited.
// Env: MEDUSA_URL (default = CF Workers bridge, workers.dev egress is not
// challenged; store.hostamar.com zone WAF 403s Vercel SSR egress — see 09-14 shift),
// MEDUSA_PK (publishable key).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const REGION = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'

async function medusa(path: string, init?: RequestInit & { json?: unknown }) {
  const base = process.env.MEDUSA_URL || 'https://store.hostamar.com'
  const pk = process.env.MEDUSA_PK || 'pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad'
  if (!pk) throw new Error('MEDUSA_PK not set')
  const res = await fetch(`${base}/store${path}`, {
    ...init,
    headers: { 'x-publishable-api-key': pk, 'user-agent': 'HostamarStorefront/1.0 (Vercel SSR)', ...(init?.json ? { 'Content-Type': 'application/json' } : {}) },
    body: init?.json ? JSON.stringify(init.json) : undefined,
    signal: AbortSignal.timeout(25_000),
  })
  const text = await res.text()
  let data: any = {}
  try { data = JSON.parse(text) } catch { throw new Error(`medusa ${path} -> ${res.status} ${text.slice(0, 120)}`) }
  if (!res.ok) throw new Error(`medusa ${path} -> ${res.status} ${data.message || text.slice(0, 120)}`)
  return data
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkRateLimit(ip, { bucket: 'store.checkout', limit: 5, windowMs: 10 * 60_000 }, '/api/store/checkout')
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const variant_id = String(body.variant_id || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const quantity = Math.min(Math.max(parseInt(body.quantity) || 1, 1), 10)
  if (!/^variant_[A-Z0-9]+$/.test(variant_id)) return NextResponse.json({ error: 'variant_id required' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  const name = String(body.name || '').trim().slice(0, 80) || 'Guest'
  const address1 = String(body.address1 || '').trim().slice(0, 200) || 'N/A'
  const city = String(body.city || '').trim().slice(0, 60) || 'Dhaka'
  const postcode = String(body.postcode || '').trim().slice(0, 12) || '1207'
  let phone = String(body.phone || '').replace(/\D/g, '').replace(/^8801/, '01') // FORGE 09-16: buyers paste +880/8801711000001 (bKash style) — normalize to 01X instead of failing the 2nd click. ponytail: handles 880-prefix only, add other locales if ever needed
  if (phone && !/^01[3-9]\d{8}$/.test(phone)) return NextResponse.json({ error: 'ফোন নম্বর ১১ সংখ্যার হতে হবে (01XXXXXXXXX)' }, { status: 400 })
  const [first, ...rest] = name.split(' ')

  try {
    // FORGE 09-15 04:25: was 8 sequential round-trips (~7.7s from Vercel, each
    // hop ~0.9s). Probe-verified (order_01M2H0BCT28CHEV66R121HN6AJ): Medusa
    // accepts items+email+shipping_address IN the cart-create call, and
    // shipping-options ∥ payment-collections share only cart_id. New depth = 4
    // hops: create → [options ∥ collection] → [ship ∥ session] → complete.
    const { cart } = await medusa('/carts', {
      method: 'POST',
      json: {
        region_id: REGION,
        items: [{ variant_id, quantity }],
        email,
        shipping_address: { first_name: first || 'Guest', last_name: rest.join(' ') || '.', address_1: address1, city, postal_code: postcode, country_code: 'bd', ...(phone ? { phone } : {}) },
      },
    })
    if (!cart?.id) throw new Error('no cart')
    const [{ shipping_options }, { payment_collection }] = await Promise.all([
      medusa(`/shipping-options?cart_id=${cart.id}`),
      medusa('/payment-collections', { method: 'POST', json: { cart_id: cart.id } }),
    ])
    if (!shipping_options?.[0] || !payment_collection?.id) throw new Error('cart setup failed')
    await Promise.all([
      medusa(`/carts/${cart.id}/shipping-methods`, { method: 'POST', json: { option_id: shipping_options[0].id } }),
      medusa(`/payment-collections/${payment_collection.id}/payment-sessions`, { method: 'POST', json: { provider_id: 'pp_system_default', data: {} } }),
    ])
    const out = await medusa(`/carts/${cart.id}/complete`, { method: 'POST', json: {} })

    const order = out.order || out
    if (!order?.id) throw new Error(out.type === 'state' ? 'cart requires payment capture retry' : 'no order returned')
    const amountBdt = Math.round((order.total ?? cart.total ?? 0) / 100)

    // FORGE: post-order side effects = receipt email (honest dialog), instant
    // Telegram owner-ping (lib/surveillance-alert ladder, zero new creds), and
    // Neon Lead mirror (source store-checkout → CRM/HARBOR sees the buyer).
    // 09-15 03:25: ran SEQUENTIALLY → 7.9s spinner after the order existed → Promise.all.
    // 09-15 04:10: still 8.7s prod (order ~2.5s via bridge + Telegram ladder's
    // 6s race cap awaited). Order is DONE at this point — buyer owes nothing
    // more than the order id. Fire side effects with waitUntil (Vercel keeps
    // the function warm until they settle) and respond instantly. receiptSent
    // can no longer be known at response time → dialog says "sending", not "sent".
    const item: any = order.items?.[0]
    const title = item?.variant?.product?.title || item?.title || variant_id

    waitUntil(Promise.all([
      (async () => {
        try {
          const { sendSystemAlertEmail } = await import('@/lib/email')
          const r: any = await Promise.race([
            sendSystemAlertEmail(email, name,
              `অর্ডার #${order.display_id ?? order.id.slice(-6)} গৃহীত — Send Money দিন`,
              `ধন্যবাদ ${name}!<br><br>` +
              `আপনার অর্ডার: <b>${order.id}</b><br>` +
              `পরিমাণ: <b>৳${amountBdt.toLocaleString('en-BD')}</b><br><br>` +
              `এখন <b>Send Money</b> (Cash Out নয়): bKash/Nagad/Rocket <b>01822417463</b> — এই নাম্বারে ঠিক ৳${amountBdt.toLocaleString('en-BD')} পাঠান।<br><br>` +
              `পাঠানোর পর <b>TrxID সহ এই ইমেইলে রিপ্লাই দিন</b> (অর্ডার আইডি উল্লেখ রাখবেন) — তাহলেই কাজ শুরু।`),
            new Promise((res) => setTimeout(() => res({ success: false, error: 'send-timeout' }), 3000)),
          ])
          const ok = !!r?.success
          if (!ok) console.warn('[store/checkout] receipt not sent:', r?.error)
          return ok
        } catch (e: any) {
          console.warn('[store/checkout] receipt error:', e?.message)
          return false
        }
      })(),
      (async () => {
        try {
          const { sendSurveillanceAlert } = await import('@/lib/surveillance-alert')
          await Promise.race([
            sendSurveillanceAlert(`🛒 ORDER #${order.display_id ?? order.id.slice(-6)} — ${title} ৳${amountBdt} | ${name} | ${phone || 'no phone'} | ${email} | ${order.id}`),
            new Promise((res) => setTimeout(res, 6000)),
          ])
        } catch { /* owner ping is best-effort; order already exists */ }
      })(),
      (async () => {
        try {
          const { prisma } = await import('@/lib/prisma')
          await prisma.lead.create({
            data: {
              name,
              email,
              phone: phone || null,
              source: 'store-checkout',
              status: 'new',
              score: 50, // an order = hottest lead tier
              tags: `order:${order.id};৳${amountBdt}`,
              notes: `Ordered from /store: ${title} — ৳${amountBdt}. Medusa order ${order.id}.`,
            },
          })
        } catch (e: any) { console.warn('[store/checkout] lead mirror:', e?.message?.slice(0, 120)) }
      })(),
    ]))

    return NextResponse.json({
      orderId: order.id,
      status: order.status || 'pending',
      amountBdt,
    })
  } catch (e: any) {
    const msg = String(e?.message || '')
    console.error('[store/checkout]', msg)
    // FORGE 09-15 09:0x: upstream 4xx (e.g. variant unpublished while the edge-
    // cached catalog card still shows it — proven by diag: Medusa "Variants ...
    // do not exist or belong to a product that is not published" was reported to
    // the buyer as a retryable 502 "Try again" → infinite spin). Buyer-fixable
    // failures now return 400 with an honest refresh message; 5xx/timeout keeps 502.
    // FORGE 2026-09-25: only 400/404 are buyer-fixable (variant unpublished/validation).
    // 401=invalid PK, 403=WAF, 429=rate-limit → server-side, NOT buyer-fixable.
    const buyerFixable = / -> 4(00|04)\b/.test(msg)
    return NextResponse.json(
      { error: buyerFixable ? 'এই প্রোডাক্টটি এখন আর অর্ডারে নেওয়া যাচ্ছে না — পেজ রিফ্রেশ করে অন্য আইটেম দেখুন।' : 'Checkout unavailable. Try again or contact us.' },
      { status: buyerFixable ? 400 : 502 },
    )
  }
}
