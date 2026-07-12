// ============================================================================
// __tests__/bkash.test.ts — TASK 6 verification (hermetic, no real bKash call).
//   1) createPayment calls grant + create with correct headers/payload,
//      returns bkashURL + paymentID + invoiceNumber.
//   2) webhook validation rejects bad paymentID (validatePaymentId).
//   3) measureMRR sums paid payments -> mrr, payingOrgs, payingUsers.
// ============================================================================
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPayment, validatePaymentId, makeOrderId } from '@/lib/payment/bkash'
import { measureMRR } from '@/lib/autonomy/tools/measureMRR'
import { __seedPayments, __resetPayments } from '@/__tests__/prisma-mock'

// --- capture outbound fetch to bKash (token grant + create) ---
const fetchCalls: any[] = []

beforeEach(() => {
  fetchCalls.length = 0
  process.env.BKASH_APP_KEY = 'test_key'
  process.env.BKASH_APP_SECRET = 'test_secret'
  process.env.BKASH_USERNAME = 'test_user'
  process.env.BKASH_PASSWORD = 'test_pass'
  process.env.BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opts: any) => {
      fetchCalls.push({ url, opts })
      if (String(url).includes('/token/grant')) {
        return {
          ok: true,
          json: async () => ({ id_token: 'idtok_abc123', token_type: 'Bearer', expires_in: 3600 }),
        }
      }
      if (String(url).includes('/checkout/create')) {
        return {
          ok: true,
          json: async () => ({
            statusCode: '0000',
            statusMessage: 'Successful',
            bkashURL: 'https://bka.sh/pay/XYZ',
            paymentID: 'PAYID_999',
          }),
        }
      }
      return { ok: false, json: async () => ({}) }
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  __resetPayments()
})

describe('bKash tokenized checkout', () => {
  it('1) createPayment mints a real bKash URL via grant+create', async () => {
    const res = await createPayment({ amount: 3500, orderId: 'ord1', orgId: 'orgA', customerId: 'cA' })
    expect(res.bkashURL).toBe('https://bka.sh/pay/XYZ')
    expect(res.paymentID).toBe('PAYID_999')
    expect(res.invoiceNumber).toContain('orgA-ord1-')
    // grant called first, then create
    expect(fetchCalls[0].url).toContain('/token/grant')
    expect(fetchCalls[1].url).toContain('/checkout/create')
    // Authorization header is Bearer <id_token> + X-APP-Key
    const createHeaders = fetchCalls[1].opts.headers
    expect(createHeaders['X-APP-Key']).toBe('test_key')
    expect(createHeaders['Authorization']).toMatch(/^Bearer\s+/)
    // payload carries BDT + sale intent + merchantInvoiceNumber
    const body = JSON.parse(fetchCalls[1].opts.body)
    expect(body.currency).toBe('BDT')
    expect(body.intent).toBe('sale')
    expect(body.amount).toBe('3500.00')
    expect(body.merchantInvoiceNumber).toBe(res.invoiceNumber)
  })

  it('2) validatePaymentId accepts bKash ids, rejects junk', () => {
    expect(validatePaymentId('PAYID_999')).toBe(true)
    expect(validatePaymentId('short')).toBe(false)
    expect(validatePaymentId('../../etc')).toBe(false)
  })

  it('3) makeOrderId returns a 16-char hex', () => {
    expect(makeOrderId()).toMatch(/^[a-f0-9]{16}$/)
  })
})

describe('measureMRR — REAL KPI from paid payments', () => {
  it('4) sums paid payments into mrr + payingOrgs + payingUsers', async () => {
    const now = new Date()
    __seedPayments([
      { id: 'p1', customerId: 'cA', organizationId: 'orgA', amount: 3500, status: 'paid', createdAt: now },
      { id: 'p2', customerId: 'cB', organizationId: 'orgB', amount: 3500, status: 'paid', createdAt: now },
      { id: 'p3', customerId: 'cA', organizationId: 'orgA', amount: 7000, status: 'paid', createdAt: now },
      { id: 'p4', customerId: 'cX', organizationId: null, amount: 100, status: 'pending', createdAt: now },
    ])
    const m = await measureMRR()
    expect(m.mrr).toBe(14000) // 3500+3500+7000
    expect(m.paidCount).toBe(3)
    expect(m.payingUsers).toBe(2) // cA + cB
    expect(m.payingOrgs).toBe(2) // orgA + orgB (pending null ignored)
    expect(m.currency).toBe('BDT')
  })

  it('5) ignores payments older than 30 days', async () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    __seedPayments([{ id: 'p9', customerId: 'cZ', organizationId: 'orgZ', amount: 9999, status: 'paid', createdAt: old }])
    const m = await measureMRR()
    expect(m.mrr).toBe(0)
    expect(m.paidCount).toBe(0)
  })
})
