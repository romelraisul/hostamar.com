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
// Body: { variant_id, quantity?, email, name, address1, city, postcode? }
// Response: { orderId, amountBdt, status }
// Auth: none (public — like /api/contact / /api/services/catalog). Rate-limited.
// Env: MEDUSA_URL (default https://store.hostamar.com), MEDUSA_PK (publishable key).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const REGION = 'reg_01M27QBX4C3XKZFWCQD47CM2EJ'

async function medusa(path: string, init?: RequestInit & { json?: unknown }) {
  const base = process.env.MEDUSA_URL || 'https://store.hostamar.com'
  const pk = process.env.MEDUSA_PK
  if (!pk) throw new Error('MEDUSA_PK not set')
  const res = await fetch(`${base}/store${path}`, {
    ...init,
    headers: { 'x-publishable-api-key': pk, ...(init?.json ? { 'Content-Type': 'application/json' } : {}) },
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
  const [first, ...rest] = name.split(' ')

  try {
    const { cart } = await medusa('/carts', { method: 'POST', json: { region_id: REGION } })
    await medusa(`/carts/${cart.id}/line-items`, { method: 'POST', json: { variant_id, quantity } })
    await medusa(`/carts/${cart.id}`, {
      method: 'POST',
      json: { email, shipping_address: { first_name: first || 'Guest', last_name: rest.join(' ') || '.', address_1: address1, city, postal_code: postcode, country_code: 'bd' } },
    })
    const { shipping_options } = await medusa(`/shipping-options?cart_id=${cart.id}`)
    if (!shipping_options?.[0]) throw new Error('no shipping options')
    await medusa(`/carts/${cart.id}/shipping-methods`, { method: 'POST', json: { option_id: shipping_options[0].id } })
    const { payment_collection } = await medusa('/payment-collections', { method: 'POST', json: { cart_id: cart.id } })
    await medusa(`/payment-collections/${payment_collection.id}/payment-sessions`, { method: 'POST', json: { provider_id: 'pp_system_default', data: {} } })
    const out = await medusa(`/carts/${cart.id}/complete`, { method: 'POST', json: {} })

    const order = out.order || out
    if (!order?.id) throw new Error(out.type === 'state' ? 'cart requires payment capture retry' : 'no order returned')
    return NextResponse.json({
      orderId: order.id,
      status: order.status || 'pending',
      amountBdt: Math.round((order.total ?? cart.total ?? 0) / 100),
    })
  } catch (e: any) {
    console.error('[store/checkout]', e?.message)
    return NextResponse.json({ error: 'Checkout unavailable. Try again or contact us.' }, { status: 502 })
  }
}
