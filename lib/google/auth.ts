/**
 * Google service-account auth (JWT bearer -> access token).
 * Zero-dependency: signs RS256 with node crypto from GOOGLE_SERVICE_ACCOUNT_JSON.
 * Server-side ONLY — never import from client components.
 */
import crypto from 'crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

type ServiceAccount = {
  client_email: string
  private_key: string
}

let cached: { token: string; exp: number } | null = null

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function hasGoogleServiceAccount(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
}

export function getSearchConsoleSiteUrl(): string {
  // SCHEMA: scdomain:hostamar.com for Domain properties, plain https:// otherwise
  return process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || 'https://hostamar.com'
}

async function parseServiceAccount(): Promise<ServiceAccount> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON missing — add it to Vercel env')
  const sa = JSON.parse(raw)
  if (!sa.client_email || !sa.private_key) throw new Error('service account JSON missing client_email/private_key')
  return sa
}

export async function getGoogleAccessToken(scope: string): Promise<string> {
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.token

  const sa = await parseServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  )
  const signInput = `${header}.${claim}`
  const signature = b64url(crypto.createSign('RSA-SHA256').update(signInput).sign(sa.private_key))
  const assertion = `${signInput}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const data: any = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`google token failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`)
  }
  cached = { token: data.access_token, exp: now + (data.expires_in || 3600) }
  return cached.token
}
