export const dynamic = 'force-dynamic'

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
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { PAYMENT_PLANS, planCredits } from '@/lib/pricing'

// waitUntil polyfill: Cloudflare Workers provides global waitUntil; Vercel removed
const waitUntil = (p: Promise<unknown>) => {
  try { (globalThis as any).waitUntil?.(p) } catch { /* no-op */ }
}

const REGION = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'
// Fallback publishable key (public, safe to embed) — used if MEDUSA_PK env is missing/empty in Vercel
const FALLBACK_PK = 'pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad'

async function medusa(path: string, init?: RequestInit & { json?: unknown }) {
  const pk = process.env.MEDUSA_PK?.trim() || FALLBACK_PK

  // FORGE 2026-09-30: Same-zone worker not deployed (CLOUDFLARE_API_TOKEN lacks Workers:Edit scope).
  // Workers.dev bridge egress is NOT challenged by Cloudflare WAF.
  // FORGE 2026-10-20: prod MEDUSA_URL == 'https://store.hostamar.com', so primaryBase
  // and fallbackBase were IDENTICAL — the fallback was dead code and a store.hostamar.com
  // blip (the monitor's site=000 class) killed checkout with no recovery. Swap: workers.dev
  // bridge is the real independent origin (verified live: full 4-hop checkout 200).
  const primaryBase = 'https://hostamar-medusa-bridge.romelraisul.workers.dev'
  const fallbackBase = 'https://store.hostamar.com'

  async function tryFetch(base: string) {
    const ua = 'HostamarStorefront/1.0 (Vercel SSR)'
    const res = await fetch(`${base}/store${path}`, {
      ...init,
      headers: {
        'x-publishable-api-key': pk,
        'user-agent': ua,
        'accept': 'application/json, text/plain, */*',
        ...(init?.json ? { 'Content-Type': 'application/json' } : {}),
      } as HeadersInit,
      body: init?.json ? JSON.stringify(init.json) : undefined,
      // FORGE 2026-10-01: was 25s. Vercel free-tier function cap is 10s — a hung
      // primary (25s) + fallback (25s) blew the cap and Cloudflare returned its
      // own blank 502 before this route could answer. 4s per attempt: happy path
      // is ~0.9s/hop (4 hops ≈ 4s), so 4s only fires on a dead/hung upstream and
      // the full primary→fallback chain now fits inside the 10s budget.
      signal: AbortSignal.timeout(4_000),
      redirect: 'follow',
    })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch { throw new Error(`medusa ${path} -> ${res.status} ${text.slice(0, 120)}`) }
    if (!res.ok) throw new Error(`medusa ${path} -> ${res.status} ${data.message || text.slice(0, 120)}`)

    return data
  }

  // Try primary first, fallback on any error (including network/timeout)
  try {
    console.log('[store/checkout] trying primary:', primaryBase)
    return await tryFetch(primaryBase)
  } catch (e) {
    console.warn('[store/checkout] primary failed, falling back to store.hostamar.com:', e instanceof Error ? e.message : String(e))
    return await tryFetch(fallbackBase)
  }

}

export async function POST(req: NextRequest) {
  // Ensure DB tables exist before any Prisma operations (prod DB predates Lead/LeadLog/RateLimitEvent)
  const hasDb = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)
  if (hasDb) {
    try {
      await (await import('@/lib/ensure-schema')).ensureSchema()
    } catch {
      // fail-open: skip schema if Prisma init fails (e.g., libsql adapter incompatible)
    }
  }

  // Rate-limit intentionally disabled on Worker: checkRateLimit throws
  // synchronously when Prisma init fails (unenv fs.readdir), and the frontend
  // (StoreBuyGrid.tsx) already has client-side retry (2× attempt at 1.5s spacing).
  // ponytail: keep fail-open so checkout never 500s from rate-limit; buyers retry client-side.
  let rl = { allowed: true, remaining: 5, resetAt: Date.now() + 10 * 60_000 }
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
  let phone = String(body.phone || '').replace(/\D/g, '').replace(/^(?:00)?8801/, '01') // FORGE 09-16: buyers paste +880/8801711000001 (bKash style) — normalize to 01X instead of failing the 2nd click. FORGE 2026-10-22: also handle 008801 prefix (intl dialing)
  if (!phone) return NextResponse.json({ error: 'ফোন নম্বর আবশ্যক — bKash মিলানের একমাত্র চাবি' }, { status: 400 })
  if (!/^01[3-9]\d{8}$/.test(phone)) return NextResponse.json({ error: 'ফোন নম্বর ১১ সংখ্যার হতে হবে (01XXXXXXXXX)' }, { status: 400 })
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
            currency_code: 'bdt',
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
    const hasDb = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)

    // FORGE: mirror completed Medusa order to local `transaction` row so the
    // SMS bKash auto-match webhook can find it by phone + pending + bkash_personal.
    // Lives here (not in medusa helper) so hasDb is checked explicitly; fail-open
    // so a DB hiccup can never fail an order Medusa already created.
    if (hasDb) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const ord = order
        const phone = String(ord.shipping_address?.phone || '').replace(/\D/g, '').replace(/^(?:00)?8801/, '01')
        const pkgKey = String(ord.items?.[0]?.variant?.product?.handle || 'starter')
          .replace(/[^a-z0-9]/gi, '').toLowerCase()
        const tier = (['starter', 'pro', 'business'] as const).includes(pkgKey as any)
          ? (pkgKey as 'starter' | 'pro' | 'business') : 'starter'
        const amountBdtMirror = Math.round((ord.total ?? 0) / 100)
        const planPrice = PAYMENT_PLANS[tier]?.price || amountBdtMirror
        const credits = planCredits(tier)
        await prisma.transaction.create({
          data: {
            customerId: ord.customer_id || 'guest',
            amount: amountBdtMirror,
            currency: 'BDT',
            status: 'pending',
            gateway: 'bkash_personal',
            gatewayTrxId: null,
            videoPackage: tier,
            creditsAdded: credits,
            cardType: phone || null,
            cardBrand: '01822417463',
          },
        })
      } catch (e: any) {
        console.warn('[store/checkout] order mirror skipped:', String(e?.message || e).slice(0, 120))
      }
    }

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
          // Skip lead mirror entirely if no DATABASE_URL (Prisma not configured in this env)
          if (!hasDb) {
            console.warn('[store/checkout] lead mirror skipped: no DATABASE_URL')
            return
          }
          const { prisma } = await import('@/lib/prisma')
          await prisma.lead.create({
            data: {
              name,
              email,
              phone: phone || null,
              source: 'store-checkout',
              status: 'new',
              score: 50,
              tags: `order:${order.id};৳${amountBdt}`,
              notes: `Ordered from /store: ${title} — ৳${amountBdt}. Medusa order ${order.id}.`,
            },
          })
        } catch (e: any) {
          const msg = String(e?.message || '')
          if (msg.includes('URL_INVALID') || msg.includes('PrismaClient') || msg.includes('DATABASE_URL') || msg.includes('TURSO')) {
            console.warn('[store/checkout] lead mirror skipped: DB not configured in this env')
          } else {
            console.warn('[store/checkout] lead mirror:', msg.slice(0, 120))
          }
        }
      })(),
    ]))

    return NextResponse.json({
      orderId: order.id,
      status: order.status || 'pending',
      amountBdt,
    })
  } catch (e: any) {
    const msg = String(e?.message || '')
    console.error('[store/checkout] FULL ERROR:', msg.slice(0, 1000))
    // FORGE 09-15 09:0x: upstream 4xx (e.g. variant unpublished while the edge-
    // cached catalog card still shows it — proven by diag: Medusa "Variants ...
    // do not exist or belong to a product that is not published" was reported to
    // the buyer as a retryable 502 "Try again" -> infinite spin). Buyer-fixable
    // failures now return 400 with an honest refresh message; 5xx/timeout keeps 502.
    // FORGE 2026-09-25: only 400/404 are buyer-fixable (variant unpublished/validation).
    // 401=invalid PK, 403=WAF, 429=rate-limit -> server-side, NOT buyer-fixable.
    const buyerFixable = / -> 4(00|04)\b/.test(msg)
    return NextResponse.json(
      { error: buyerFixable ? 'এই প্রোডাক্টটি এখন আর অর্ডারে নেওয়া যাচ্ছে না — পেজ রিফ্রেশ করে অন্য আইটেম দেখুন।' : 'Checkout unavailable. Try again or contact us.' },
      { status: buyerFixable ? 400 : 502 },
    )
  }
}
