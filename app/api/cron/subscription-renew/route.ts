export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper: format date Bangla e.g. ২৭ আগস্ট
function formatBanglaDate(d: Date): string {
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
  const en2bn: Record<string,string> = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' }
  const toBn = (n:number| string) => String(n).split('').map(c=> en2bn[c] ?? c).join('')
  return `${toBn(d.getDate())} ${months[d.getMonth()]}`
}

// Send Bangla renewal email (log fallback if SMTP not configured)
async function sendBanglaRenewalEmail(to: string, name: string, plan: string, price: number, nextDate: Date) {
  const subject = `✅ আপনার ${plan} সাবস্ক্রিপশন নবায়ন সম্পন্ন — Hostamar`
  const html = `
    <div style="font-family:'Noto Sans Bengali',sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0E7C3A;padding:28px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">✅ সাবস্ক্রিপশন নবায়ন সফল!</h1>
        <p style="color:#d1fae5;margin:6px 0 0;">আপনার ${plan} প্ল্যান নবায়ন করা হয়েছে</p>
      </div>
      <div style="padding:24px;background:#f8fafc;">
        <p>প্রিয় <strong>${name}</strong>,</p>
        <p>আপনার <strong>${plan}</strong> সাবস্ক্রিপশন সফলভাবে নবায়ন করা হয়েছে। পরিমাণ <strong>৳${price}</strong> চার্জ করা হয়েছে।</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#334155;">প্ল্যান: <strong>${plan}</strong><br/>পরবর্তী নবায়ন: <strong>${formatBanglaDate(nextDate)}</strong><br/>ক্রেডিট যোগ হয়েছে: <strong>৬০০০</strong></p>
        </div>
        <a href="${process.env.NEXTAUTH_URL || 'https://hostamar.com'}/dashboard/credits" style="display:inline-block;background:#0E7C3A;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">ক্রেডিট দেখুন →</a>
        <p style="margin-top:18px;font-size:12px;color:#64748b;">অটো-রিনিউ বন্ধ করতে ড্যাশবোর্ড → ক্রেডিট → সাবস্ক্রিপশন থেকে Cancel করুন।</p>
      </div>
      <div style="background:#0E7C3A;padding:14px;text-align:center;border-radius:0 0 12px 12px;">
        <p style="color:#d1fae5;margin:0;font-size:12px;">© Hostamar.com — বাংলাদেশের AI প্ল্যাটফর্ম</p>
      </div>
    </div>`
  // Try to send via brevo/smtp if configured, else log
  try {
    const { BREVO_API_KEY } = process.env
    if (BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify({
          sender: { name: 'Hostamar', email: process.env.SMTP_FROM || 'noreply@hostamar.com' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        console.warn(`[subscription-renew] Brevo email failed for ${to}: ${txt}`)
      } else {
        console.log(`[subscription-renew] Bangla renewal email sent to ${to} (${plan})`)
      }
      return
    }
    // No Brevo — log instead (required by spec: "send email Bangla renewal (log)")
    console.log(`[subscription-renew] [MOCK EMAIL] To:${to} Subject:${subject} Plan:${plan} Price:${price} Next:${formatBanglaDate(nextDate)}`)
  } catch (e) {
    console.warn('[subscription-renew] email error', e)
    console.log(`[subscription-renew] [MOCK EMAIL FALLBACK] To:${to} Subject:${subject}`)
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    // Also allow Vercel cron without header in prod if CRON_SECRET not strictly required
    // but if secret is set, enforce it
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const due = await prisma.subscription.findMany({
    where: {
      nextBillingDate: { lt: now },
      autoRenew: true,
      status: 'active',
    },
    include: { customer: { select: { email: true, name: true, id: true } } },
  })

  if (due.length === 0) {
    return NextResponse.json({ success: true, message: 'No due subscriptions', checkedAt: now.toISOString(), count: 0 })
  }

  const results: any[] = []

  for (const sub of due) {
    let chargeStatus: 'charged' | 'pending' | 'failed' = 'pending'
    let chargeDetail = ''
    try {
      // Try Stripe if stripeSubscriptionId present and STRIPE_SECRET_KEY set
      if (sub.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
        try {
          // Lazy import to avoid hard dep if not installed
          const Stripe = (await import('stripe')).default
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-10-16' as any })
          // Create invoice / charge — simplest: create payment intent or invoice
          // For subscription, retrieve and advance; here we attempt to create an invoice
          await stripe.invoices.create({
            customer: sub.stripeSubscriptionId, // if stored as customer id fallback
            auto_advance: true,
          })
          chargeStatus = 'charged'
          chargeDetail = 'Stripe invoice created'
        } catch (e: any) {
          chargeDetail = `Stripe error: ${e?.message || e}`
          // mark pending, don't throw — will retry next day
          chargeStatus = 'pending'
        }
      } else if (sub.paypalSubscriptionId && process.env.PAYPAL_CLIENT_ID) {
        try {
          // PayPal capture placeholder — log and mark pending (needs subscription billing agreement)
          // Real PayPal subscription charge would use /v1/billing/subscriptions/{id}/capture
          console.log(`[subscription-renew] PayPal subscription ${sub.paypalSubscriptionId} due — would capture via PayPal API`)
          chargeDetail = 'PayPal capture attempted (log)'
          chargeStatus = 'pending'
        } catch (e: any) {
          chargeDetail = `PayPal error: ${e?.message}`
          chargeStatus = 'pending'
        }
      } else if (sub.stripeSubscriptionId || sub.paypalSubscriptionId) {
        // Has provider id but no secret configured — mark pending
        chargeDetail = 'Provider ID present but secret not configured — pending manual'
        chargeStatus = 'pending'
      } else {
        // No provider — bKash/local flow: mark pending for manual renewal reminder
        chargeDetail = 'No Stripe/PayPal linkage — bKash/manual pending'
        chargeStatus = 'pending'
      }

      if (chargeStatus === 'charged') {
        // Successful charge: extend nextBillingDate by 1 month, add credits
        const next = new Date(sub.nextBillingDate)
        next.setMonth(next.getMonth() + 1)
        const updated = await prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: next, status: 'active' },
        })
        // Add credits to CreditAccount + transaction
        const acct = await prisma.creditAccount.findUnique({ where: { customerId: sub.customerId } })
        if (acct) {
          const newCredits = acct.credits + (sub.creditsPerMonth || 6000)
          await prisma.creditAccount.update({ where: { customerId: sub.customerId }, data: { credits: newCredits } })
          await prisma.creditTransaction.create({
            data: {
              accountId: acct.id,
              amount: sub.creditsPerMonth || 6000,
              balanceAfter: newCredits,
              product: 'purchase',
              description: `${sub.plan} নবায়ন — ${(sub.creditsPerMonth || 6000)} ক্রেডিট যোগ`,
            },
          })
        } else if (sub.customerId) {
          const created = await prisma.creditAccount.create({
            data: { customerId: sub.customerId, credits: sub.creditsPerMonth || 6000, consumed: 0 },
          })
          await prisma.creditTransaction.create({
            data: {
              accountId: created.id,
              amount: sub.creditsPerMonth || 6000,
              balanceAfter: created.credits,
              product: 'purchase',
              description: `${sub.plan} নবায়ন — ${(sub.creditsPerMonth || 6000)} ক্রেডিট যোগ`,
            },
          })
        }
        await sendBanglaRenewalEmail(sub.customer.email, sub.customer.name || 'গ্রাহক', sub.plan, sub.price, next)
        // Also notification
        await prisma.notification.create({
          data: {
            customerId: sub.customerId,
            type: 'SUBSCRIPTION',
            title: `✅ ${sub.plan} নবায়ন সফল`,
            message: `আপনার ${sub.plan} প্ল্যান ৳${sub.price} এ নবায়ন হয়েছে। পরবর্তী নবায়ন ${formatBanglaDate(next)}।`,
          },
        }).catch(()=>{})
        results.push({ id: sub.id, plan: sub.plan, status: 'renewed', nextBillingDate: next.toISOString(), detail: chargeDetail })
        console.log(`[subscription-renew] Renewed ${sub.id} (${sub.plan}) for ${sub.customer.email} -> ${next.toISOString()}`)
      } else {
        // Pending: keep status active but log; send reminder email
        // Do not advance nextBillingDate — will retry tomorrow
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active' } }).catch(()=>{})
        // Log pending + send Bangla pending notice (as log)
        console.log(`[subscription-renew] PENDING ${sub.id} (${sub.plan}) ${sub.customer.email}: ${chargeDetail}`)
        // Create pending notification
        await prisma.notification.create({
          data: {
            customerId: sub.customerId,
            type: 'SUBSCRIPTION',
            title: `⏳ ${sub.plan} নবায়ন মুলতুবি`,
            message: `আপনার ${sub.plan} নবায়ন প্রক্রিয়াধীন। bKash/Stripe/PayPal থেকে পেমেন্ট সম্পন্ন করুন।`,
          },
        }).catch(()=>{})
        // Log Bangla email for pending (spec: mark pending and send email Bangla renewal (log))
        console.log(`[subscription-renew] [BANGLA EMAIL LOG] To:${sub.customer.email} Subject: আপনার ${sub.plan} সাবস্ক্রিপশন নবায়ন প্রয়োজন — পরিমাণ ৳${sub.price} — পরবর্তী নবায়ন ${formatBanglaDate(sub.nextBillingDate)}`)
        results.push({ id: sub.id, plan: sub.plan, status: 'pending', detail: chargeDetail })
      }
    } catch (e: any) {
      console.error(`[subscription-renew] error for ${sub.id}`, e)
      results.push({ id: sub.id, plan: sub.plan, status: 'error', error: e?.message || String(e) })
    }
  }

  return NextResponse.json({ success: true, checkedAt: now.toISOString(), totalDue: due.length, results })
}

// POST also supported (some cron providers POST)
export async function POST(req: NextRequest) { return GET(req) }
