// One-shot setup: adds this server's IP to Brevo's allowlist via the Brevo API
// Then immediately tries to send a test email so you can verify the chain works.
// Visit /api/email/setup-brevo in a browser to run this once — then delete the route.

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Discover the server's outbound IP by hitting an external service from within.
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const ipJson = await ipRes.json()
    const ip = ipJson.ip || 'unknown'

    // 2. Add the IP to Brevo's allowlist via the Brevo API.
    const apiKey = process.env.BREVO_API_KEY || ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['api-key'] = apiKey

    let addOk = false
    let addStatus = 0
    let addText = ''
    try {
      const addRes = await fetch('https://api.brevo.com/v3/security/authorised_ips', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ip: ip }),
      })
      addStatus = addRes.status
      addText = await addRes.text()
      addOk = addRes.ok
    } catch (e) {
      addText = String(e)
    }

    // 3. Immediately test the email send path.
    let emailResult: any = null
    if (apiKey) {
      try {
        const ctl = new AbortController()
        const t = setTimeout(() => ctl.abort(), 8000)
        const sendRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'Hostamar', email: 'romelraisul@gmail.com' },
            to: [{ email: 'romelraisul@gmail.com' }],
            subject: '🎉 Hostamar email chain working!',
            htmlContent: '<h1>If you see this, Brevo→Railway email chain is live.</h1>',
          }),
          signal: ctl.signal,
        })
        clearTimeout(t)
        emailResult = {
          status: sendRes.status,
          body: (await sendRes.text()).slice(0, 300),
          ok: sendRes.ok,
        }
      } catch (e) {
        emailResult = { error: String(e) }
      }
    }

    return NextResponse.json({
      ip,
      ipAdd: { ok: addOk, status: addRes.status, body: addText.slice(0, 200) },
      emailResult,
      note: 'Visit this URL once. If addOk=false the IP was already in allowlist or format invalid. emailResult.ok=true means working.',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
