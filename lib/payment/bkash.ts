// ============================================================================
// lib/payment/bkash.ts — bKash tokenized checkout (server-only).
//
// Real bKash Payment Gateway integration (not a mock). Env-driven:
//   BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD,
//   BKASH_BASE_URL (sandbox https://tokenized.sandbox.bka.sh/v1.2.0-beta ,
//                   prod    https://tokenized.pay.bka.sh        ),
//   BKASH_CALLBACK_URL (default https://hostamar.com/api/webhooks/bkash)
//
// Flow (grant token -> create -> execute):
//   1. getToken()      POST /tokenized/checkout/token/grant  -> id_token (50m cache)
//   2. createPayment() POST /tokenized/checkout/create       -> bkashURL + paymentID
//   3. executePayment()POST /tokenized/checkout/execute      -> trxID + amount
// Secrets live ONLY here (server). No BKASH_* secret is ever sent to the client.
// ============================================================================
import crypto from 'crypto'

const ENV = () => ({
  appKey: process.env.BKASH_APP_KEY || '',
  appSecret: process.env.BKASH_APP_SECRET || '',
  username: process.env.BKASH_USERNAME || '',
  password: process.env.BKASH_PASSWORD || '',
  baseUrl: (process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta').replace(/\/$/, ''),
  callbackURL: process.env.BKASH_CALLBACK_URL || 'https://hostamar.com/api/webhooks/bkash',
})

export interface CreatePaymentInput {
  amount: number // BDT, e.g. 3500.00
  orderId: string
  orgId: string
  customerId: string
}

export interface CreatePaymentResult {
  bkashURL: string
  paymentID: string
  invoiceNumber: string
}

// In-memory token cache (fallback when redis unavailable). Keyed by baseUrl.
let tokenCache: { token: string; expiresAt: number } | null = null

// bKash's gateway occasionally emits raw control characters (0x00-0x1F) inside
// JSON string literals, which is invalid JSON and makes res.json() throw. Raw
// control chars never legitimately appear in JSON (they must be \uXXXX-escaped),
// so stripping them before parsing is a safe robustness fix.
async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    // Remove raw control characters and retry once.
    const cleaned = text.replace(/[\u0000-\u001F]/g, ' ')
    return JSON.parse(cleaned) as T
  }
}

async function getToken(): Promise<string> {
  const env = ENV()
  if (!env.appKey || !env.appSecret || !env.username || !env.password) {
    throw new Error('bKash credentials missing (BKASH_APP_KEY/SECRET/USERNAME/PASSWORD)')
  }
  // honour a still-valid cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token

  const res = await fetch(`${env.baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', username: env.username, password: env.password },
    body: JSON.stringify({ app_key: env.appKey, app_secret: env.appSecret }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`bKash token grant failed: ${res.status}`)
  const json = (await safeJson(res)) as { id_token?: string; token_type?: string; expires_in?: number }
  if (!json.id_token) throw new Error('bKash token grant returned no id_token')
  // cache for 50m (bKash tokens live 1h)
  tokenCache = { token: json.id_token, expiresAt: Date.now() + 50 * 60 * 1000 }
  return json.id_token
}

// tokenized-checkout headers per bKash docs: Bearer id_token + X-APP-Key.
function authHeaders(idToken: string, appKey: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${idToken}`,
    'X-APP-Key': appKey,
  }
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const env = ENV()
  const idToken = await getToken()
  const invoiceNumber = `${input.orgId}-${input.orderId}-${Date.now()}`
  const payload = {
    mode: '0011',
    payerReference: input.customerId.slice(0, 20),
    callbackURL: env.callbackURL,
    amount: input.amount.toFixed(2),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: invoiceNumber,
  }
  const res = await fetch(`${env.baseUrl}/tokenized/checkout/create`, {
    method: 'POST',
    headers: authHeaders(idToken, env.appKey),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  })
  const json = (await safeJson(res)) as {
    statusCode?: string
    statusMessage?: string
    bkashURL?: string
    paymentID?: string
  }
  if (json.statusCode !== '0000' || !json.bkashURL || !json.paymentID) {
    throw new Error(`bKash create failed: ${json.statusCode} ${json.statusMessage}`)
  }
  return { bkashURL: json.bkashURL, paymentID: json.paymentID, invoiceNumber }
}

export interface ExecutePaymentResult {
  paymentID: string
  trxID: string
  amount: number
  status: string
  merchantInvoiceNumber: string
}

export async function executePayment(paymentID: string): Promise<ExecutePaymentResult> {
  const env = ENV()
  const idToken = await getToken()
  const res = await fetch(`${env.baseUrl}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: authHeaders(idToken, env.appKey),
    body: JSON.stringify({ paymentID }),
    signal: AbortSignal.timeout(10000),
  })
  const json = (await safeJson(res)) as {
    statusCode?: string
    statusMessage?: string
    paymentID?: string
    trxID?: string
    amount?: string
    transactionStatus?: string
    merchantInvoiceNumber?: string
  }
  if (json.statusCode !== '0000' || !json.trxID) {
    throw new Error(`bKash execute failed: ${json.statusCode} ${json.statusMessage}`)
  }
  return {
    paymentID: json.paymentID || paymentID,
    trxID: json.trxID,
    amount: parseFloat(json.amount || '0'),
    status: json.transactionStatus || 'Completed',
    merchantInvoiceNumber: json.merchantInvoiceNumber || '',
  }
}

// idempotency / sanity helper for webhook validation
export function validatePaymentId(paymentID: string): boolean {
  return /^[0-9A-Za-z_-]{8,64}$/.test(paymentID)
}

export function makeOrderId(): string {
  return crypto.randomBytes(8).toString('hex')
}

// ============================================================================
// Additional helpers used by /api/payments/* and /api/payment/* routes.
// Built on the same real tokenized-checkout internals above.
// ============================================================================

/** Are bKash credentials configured? Callers must 503 (never mock) if false. */
export function bkashConfig() {
  const env = ENV()
  const configured = !!(env.appKey && env.appSecret && env.username && env.password)
  const isProduction = env.baseUrl.includes('pay.bka.sh')
  return { ...env, configured, isProduction }
}

export interface CreateCheckoutResult {
  ok: boolean
  paymentId?: string
  bkashUrl?: string
  error?: string
}

/** Thin wrapper over createPayment for routes that don't have org context. */
export async function createCheckout(input: {
  amount: number
  orderId: string
  intent?: string
  callbackUrl?: string
}): Promise<CreateCheckoutResult> {
  try {
    const res = await createPayment({
      amount: input.amount,
      orderId: input.orderId,
      orgId: 'hostamar',
      customerId: 'checkout',
    })
    return { ok: true, paymentId: res.paymentID, bkashUrl: res.bkashURL }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'bKash create failed' }
  }
}

/** Query a payment's real status from bKash by paymentID. */
export async function queryPayment(paymentID: string): Promise<{ ok: boolean; status?: string; trxId?: string; error?: string }> {
  try {
    const env = ENV()
    const idToken = await getToken()
    const res = await fetch(`${env.baseUrl}/tokenized/checkout/payment/status`, {
      method: 'POST',
      headers: authHeaders(idToken, env.appKey),
      body: JSON.stringify({ paymentID }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return { ok: false, error: `bKash status query failed: ${res.status}` }
    }
    const json = (await safeJson(res)) as { transactionStatus?: string; trxID?: string }
    return { ok: true, status: json.transactionStatus, trxId: json.trxID }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'bKash status query failed' }
  }
}
