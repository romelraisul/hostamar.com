import crypto from 'crypto'

/**
 * Verify a provider webhook HMAC signature (SHA-256).
 *
 * CRITICAL: HMAC must be computed over the RAW request body bytes, NOT a
 * re-serialized JSON.stringify(req.body). Re-stringifying changes key order /
 * spacing and invalidates the signature. Always pass the raw `await req.text()`.
 *
 * This covers providers that send an `x-provider-signature` HMAC header
 * (e.g. bKash tokenized/webhook, generic HMAC gateways). SSLCommerz uses its
 * own validation API instead — do NOT use this function for SSLCommerz.
 */
export function verifySignature(rawBody: string, signature: string | null | undefined, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** Constant-time string compare helper (for non-buffer secrets if needed). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
