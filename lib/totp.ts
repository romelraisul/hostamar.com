/**
 * Zero-dep TOTP (RFC 6238) + base32 — no speakeasy/qrcode npm packages.
 * Produces codes compatible with Google Authenticator / Authy.
 */
import { createHmac } from 'crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0, out: number[] = []
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** HMAC-SHA1 RFC-6238 TOTP, 6 digits, 30s step, ±1 window tolerance */
export function totpNow(secretB32: string, atMs = Date.now()): string {
  return totpAt(secretB32, Math.floor(atMs / 1000 / 30))
}

export function totpAt(secretB32: string, counter: number): string {
  const key = base32Decode(secretB32)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', key).update(buf).digest()
  const off = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) |
    ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, '0')
}

/** Verify with ±1 step (±30s) clock-skew tolerance */
export function totpVerify(secretB32: string, token: string): boolean {
  const t = String(token || '').replace(/\D/g, '')
  if (t.length !== 6) return false
  const now = Math.floor(Date.now() / 1000 / 30)
  for (const c of [now, now - 1, now + 1]) {
    if (totpAt(secretB32, c) === t) return true
  }
  return false
}

/** otpauth:// URL for authenticator apps */
export function otpauthUrl(secretB32: string, email: string): string {
  return `otpauth://totp/Hostamar:${encodeURIComponent(email)}?secret=${secretB32}&issuer=Hostamar&algorithm=SHA1&digits=6&period=30`
}

/** QR image (no qrcode dep — public vector QR service; app scans it fine) */
export function qrDataUrl(otpauth: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauth)}`
}
