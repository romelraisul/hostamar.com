/**
 * Preferred Sources email campaign — sends the Google deeplink so readers can
 * set Hostamar as a Preferred Source (Top Stories + AI Overviews boost).
 * Server-side only.
 */
import { sendMail, hasGraphCreds } from './graphClient'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

export function preferredSourceCampaignHtml(recipientName?: string): string {
  const deeplink = `https://www.google.com/preferences/source?q=${encodeURIComponent('hostamar.com')}`
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#2563EB">Hi ${recipientName || 'there'} 👋</h2>
    <p>Google now lets readers pick <b>Preferred Sources</b> — sites that show up more in Top Stories and AI Overviews.</p>
    <p>If you love Hostamar's Bangla AI-marketing content, take 10 seconds:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${deeplink}" style="background:#2563EB;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block">
        ⭐ Make Hostamar a Preferred Source
      </a>
    </p>
    <p style="font-size:13px;color:#666">Opens google.com preferences — search "hostamar.com", tick it, done.</p>
    <hr style="border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">${SITE}</p>
  </div>`
}

export async function sendPreferredSourceCampaign(to: string, name?: string): Promise<{ ok: boolean; detail: string }> {
  if (!hasGraphCreds()) return { ok: false, detail: 'Microsoft Graph creds missing (MICROSOFT_GRAPH_*)' }
  return sendMail({
    to,
    subject: '⭐ ১০ সেকেন্ডে Hostamar-কে Preferred Source বানান (Google Top Stories)',
    html: preferredSourceCampaignHtml(name),
  })
}
