/**
 * Microsoft Graph client — MSAL confidential client via pure fetch
 * (no @azure/msal-node dependency; client-credentials OAuth2 is 1 POST).
 * Server-side only. Requires MICROSOFT_GRAPH_CLIENT_ID / _SECRET / _TENANT_ID.
 */

const GRAPH = 'https://graph.microsoft.com/v1.0'

export function hasGraphCreds(): boolean {
  return !!(process.env.MICROSOFT_GRAPH_CLIENT_ID && process.env.MICROSOFT_GRAPH_CLIENT_SECRET && process.env.MICROSOFT_GRAPH_TENANT_ID)
}

let cached: { token: string; exp: number } | null = null

export async function getAccessToken(scope = 'https://graph.microsoft.com/.default'): Promise<string> {
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.token

  const tenant = process.env.MICROSOFT_GRAPH_TENANT_ID
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_GRAPH_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_GRAPH_CLIENT_SECRET || '',
      scope,
      grant_type: 'client_credentials',
    }),
  })
  const data: any = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`MS graph token failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`)
  }
  cached = { token: data.access_token, exp: Date.now() / 1000 + (data.expires_in || 3600) }
  return cached.token
}

export type SendMailInput = {
  to: string
  subject: string
  html: string
  /** Application mailbox to send FROM (required for app-only tokens). */
  from?: string
}

export async function sendMail({ to, subject, html, from }: SendMailInput): Promise<{ ok: boolean; detail: string }> {
  const sender = from || process.env.MICROSOFT_GRAPH_SENDER || process.env.MICROSOFT_GRAPH_FROM
  if (!sender) return { ok: false, detail: 'MICROSOFT_GRAPH_SENDER missing (mailbox to send from)' }
  try {
    const token = await getAccessToken()
    const res = await fetch(`${GRAPH}/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    })
    const text = await res.text()
    return { ok: res.status === 202, detail: text ? text.slice(0, 200) : `status ${res.status}` }
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e) }
  }
}

export async function createShareLink(
  filePath: string,
  type: 'view' | 'edit' = 'view'
): Promise<{ ok: boolean; link?: string; detail: string }> {
  const driveId = process.env.MICROSOFT_GRAPH_DRIVE_ID
  if (!driveId) return { ok: false, detail: 'MICROSOFT_GRAPH_DRIVE_ID missing' }
  try {
    const token = await getAccessToken()
    const res = await fetch(`${GRAPH}/drives/${driveId}/root:/${filePath}:/createLink`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, scope: 'organization' }),
    })
    const json: any = await res.json()
    if (!res.ok) return { ok: false, detail: JSON.stringify(json).slice(0, 300) }
    return { ok: true, link: json.link?.webUrl, detail: 'ok' }
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e) }
  }
}

/** Upload markdown/text backup of an article to OneDrive. */
export async function uploadMarkdownBackup(
  filePath: string,
  markdown: string
): Promise<{ ok: boolean; detail: string }> {
  const driveId = process.env.MICROSOFT_GRAPH_DRIVE_ID
  if (!driveId) return { ok: false, detail: 'MICROSOFT_GRAPH_DRIVE_ID missing' }
  try {
    const token = await getAccessToken('https://graph.microsoft.com/.default')
    const res = await fetch(`${GRAPH}/drives/${driveId}/root:/${filePath}:/content`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/markdown' },
      body: markdown,
    })
    return { ok: res.ok, detail: res.ok ? `uploaded ${filePath}` : (await res.text()).slice(0, 300) }
  } catch (e: any) {
    return { ok: false, detail: String(e?.message || e) }
  }
}
