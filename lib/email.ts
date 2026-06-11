// @ts-nocheck — nodemailer type incompatibilities
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import path from 'path'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@hostamar.com'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
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
  const transport = getTransporter()

  if (!transport) {
    console.log(`[Email] SMTP not configured. Would send to ${to}: ${subject}`)
    console.log(`[Email] Body preview: ${html.slice(0, 200)}...`)
    return { success: false, fallback: true }
  }

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    })
    return { success: true, fallback: false }
  } catch (error) {
    console.error('[Email] Send failed:', error)
    return { success: false, fallback: false, error }
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
