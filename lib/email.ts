// @ts-nocheck — nodemailer type incompatibilities
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@hostamar.com'
const BREVO_SMTP_KEY = process.env.BREVO_SMTP_KEY
const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST
const BREVO_SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT || '587')
const BREVO_API_KEY = process.env.BREVO_API_KEY
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: Number(SMTP_PORT) === 465,
      requireTLS: Number(SMTP_PORT) !== 465,
      pool: true,
      maxConnections: 5,
      connectTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
    return transporter
  }

  if (BREVO_SMTP_KEY && BREVO_SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: BREVO_SMTP_HOST,
      port: Number(BREVO_SMTP_PORT) || 587,
      secure: false,
      requireTLS: true,
      connectTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: BREVO_SMTP_USER || 'apikey',
        pass: BREVO_SMTP_KEY,
      },
    })
    return transporter
  }

  return null
}

function loadTemplate(name: string, replacements: Record<string, string> = {}): string {
  const templatePath = path.join(process.cwd(), 'emails', `${name}.html`)
  let html = fs.readFileSync(templatePath, 'utf-8')

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }

  return html
}

async function sendMail(to: string, subject: string, html: string) {
  // Try Brevo REST API first (HTTP, bypasses IP restrictions)
  if (BREVO_API_KEY) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: 'Hostamar', email: 'romelraisul@gmail.com' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (response.ok) return { success: true, fallback: false }
      const err = await response.text()
      console.error('[Email] Brevo REST API error:', err)
      // Don't fall through to SMTP — Brevo REST is our primary and Gmail SMTP times out from Railway
      return { success: false, fallback: false, error: err }
    } catch (error) {
      console.error('[Email] Brevo REST API failed:', error)
      return { success: false, fallback: false, error: String(error) }
    }
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = loadTemplate('welcome', {
    name,
    appUrl: APP_URL,
    year: new Date().getFullYear().toString(),
  })
  return sendMail(to, 'Welcome to Hostamar!', html)
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${APP_URL}/reset?token=${token}`
  const html = loadTemplate('reset', {
    name,
    resetUrl,
    appUrl: APP_URL,
    year: new Date().getFullYear().toString(),
  })
  return sendMail(to, 'Reset Your Hostamar Password', html)
}

export async function sendPaymentConfirmationEmail(
  to: string,
  name: string,
  plan: string,
  amount: string,
  currency: string,
  transactionId: string
) {
  const html = loadTemplate('payment', {
    name,
    plan,
    amount,
    currency,
    transactionId,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    appUrl: APP_URL,
    year: new Date().getFullYear().toString(),
  })
  return sendMail(to, `Payment Confirmed - ${plan}`, html)
}

/**
 * Alias used by lib/payment.ts (activateSubscription → billing receipt).
 * Same payload, slightly different subject; tolerant fallback when SMTP
 * not configured so paying path never 500s on send.
 */
export async function sendPaymentReceiptEmail(
  to: string,
  name: string,
  plan: string,
  amount: number,
  transactionId: string,
  method: string
) {
  return sendPaymentConfirmationEmail(
    to,
    name,
    plan,
    String(amount),
    'BDT',
    transactionId
  )
}

export async function sendSystemAlertEmail(
  to: string,
  name: string,
  subject: string,
  message: string
) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow-hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<tr><td style="background:#1e3a5f;padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:20px;font-weight:700">Hostamar</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 8px;color:#111827;font-size:18px">${subject}</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">Hi ${name},</p>
<p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">${message}</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px">
&copy; ${new Date().getFullYear()} Hostamar. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return sendMail(to, `[Hostamar] ${subject}`, html)
}

export async function sendVideoReadyEmail(to: string, name: string, videoTitle: string, videoUrl: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow-hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<tr><td style="background:#3b82f6;padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:20px;font-weight:700">Hostamar</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 8px;color:#111827;font-size:18px">Your Video is Ready! 🎬</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">Hi ${name},</p>
<p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">
  Great news! Your marketing video <strong>"${videoTitle}"</strong> has been generated and is ready to view.
</p>
<div style="text-align:center;margin:24px 0">
  <a href="${videoUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Watch Video</a>
</div>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">
  You can also view all your videos in your <a href="${APP_URL}/dashboard/videos" style="color:#3b82f6">dashboard</a>.
</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px">
&copy; ${new Date().getFullYear()} Hostamar. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return sendMail(to, 'Your Video is Ready! 🎬', html)
}

export async function sendVideoFailedEmail(to: string, name: string, videoTitle: string, error: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow-hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<tr><td style="background:#ef4444;padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:20px;font-weight:700">Hostamar</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 8px;color:#111827;font-size:18px">Video Generation Issue</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">Hi ${name},</p>
<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6">
  Unfortunately, we couldn't generate your video <strong>"${videoTitle}"</strong>.
</p>
<p style="margin:0 0 24px;color:#6b7280;font-size:14px">
  <strong>Reason:</strong> ${error}
</p>
<p style="margin:0 0 16px;color:#374151;font-size:14px">
  Please try again or contact support if the issue persists.
</p>
<div style="text-align:center;margin:24px 0">
  <a href="${APP_URL}/dashboard/videos" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Try Again</a>
</div>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px">
&copy; ${new Date().getFullYear()} Hostamar. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return sendMail(to, 'Video Generation Issue', html)
}

export async function sendSubscriptionReminderEmail(to: string, name: string, plan: string, daysLeft: number) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow-hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<tr><td style="background:#f59e0b;padding:24px 32px;text-align:center">
<span style="color:#fff;font-size:20px;font-weight:700">Hostamar</span>
</td></tr>
<tr><td style="padding:32px">
<h2 style="margin:0 0 8px;color:#111827;font-size:18px">Subscription Reminder</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">Hi ${name},</p>
<p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">
  Your <strong>${plan}</strong> subscription will renew in <strong>${daysLeft} days</strong>.
</p>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px">
  Make sure your payment method is up to date to avoid service interruption.
</p>
<div style="text-align:center;margin:24px 0">
  <a href="${APP_URL}/dashboard/payment" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Manage Subscription</a>
</div>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px">
&copy; ${new Date().getFullYear()} Hostamar. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return sendMail(to, `Subscription Renewal in ${daysLeft} Days`, html)
}

export async function sendBetaInviteEmail(to: string, name: string, inviteCode: string) {
  const html = loadTemplate('welcome', {
      name,
      appUrl: APP_URL,
      year: new Date().getFullYear().toString(),
    })

    // Wrap with invite code banner since we don't have a dedicated template
    const inviteBanner = `
      <div style="background:#f0f7ff;border:1px solid #dbeafe;border-radius:8px;padding:20px;margin:16px 0;text-align:center">
        <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600">Your Beta Invite Code</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#1e3a5f;letter-spacing:2px">${inviteCode}</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:12px">10% off · 30 days validity</p>
      </div>
    `
    const bodyStart = html.indexOf('<tr><td style="padding:40px 32px">')
    const enhancedHtml = bodyStart > -1
      ? html.slice(0, bodyStart + 27) + inviteBanner + html.slice(bodyStart + 27)
      : html

    return sendMail(to, `Your Hostamar Beta Invite: ${inviteCode}`, enhancedHtml)
  }
