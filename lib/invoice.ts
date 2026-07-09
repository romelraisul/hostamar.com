import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/s3'

function escapeHtml(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}

/**
 * Generate an HTML invoice for a completed Payment (looked up by transactionId),
 * upload it to S3/R2, persist the URL on Payment.invoiceUrl, and return it.
 *
 * MUST run where the DB is reachable (Railway). Called inline from the webhook.
 * Idempotent: returns the existing invoiceUrl if already generated.
 * Non-throwing by contract for callers that pass throwOnError=false.
 */
export async function generateInvoice(
  orderId: string,
  opts: { throwOnError?: boolean } = {},
): Promise<{ invoiceUrl: string } | null> {
  try {
    if (!orderId) return null

    // Idempotent, non-destructive column ensure (safe if migration hasn't run).
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "invoiceUrl" TEXT')
    } catch {
      /* column already exists or insufficient privilege — proceed */
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionId: orderId },
      include: { customer: true },
    })
    if (!payment || payment.status !== 'completed') return null
    if ((payment as any).invoiceUrl) return { invoiceUrl: (payment as any).invoiceUrl }

    const customer = payment.customer
    const date = new Date().toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    const amountBDT = `৳${Number(payment.amount).toLocaleString()}`
    const invoiceNo = `INV-${orderId}`

    const html = `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><title>${escapeHtml(invoiceNo)}</title>
<style>
  body{font-family:'Noto Sans Bengali',Arial,sans-serif;color:#111;max-width:720px;margin:32px auto;padding:0 20px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:16px}
  h1{color:#2563eb;margin:0;font-size:24px}
  .meta{text-align:right;font-size:13px;color:#555}
  table{width:100%;border-collapse:collapse;margin:24px 0}
  th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;font-size:14px}
  th{color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
  .total{font-size:18px;font-weight:700;color:#2563eb}
  .foot{margin-top:32px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}
</style></head>
<body>
  <div class="head">
    <div><h1>Hostamar</h1><div>Cloud Hosting + AI Video Marketing</div></div>
    <div class="meta"><div><strong>${escapeHtml(invoiceNo)}</strong></div><div>তারিখ: ${escapeHtml(date)}</div></div>
  </div>
  <table>
    <tr><th>বিল প্রাপক</th><td>${escapeHtml(customer?.name)} (${escapeHtml(customer?.email)})</td></tr>
    <tr><th>প্ল্যান</th><td>${escapeHtml(payment.planName || 'Subscription')}</td></tr>
    <tr><th>পেমেন্ট পদ্ধতি</th><td>${escapeHtml(payment.method)}</td></tr>
    <tr><th>Txn ID</th><td>${escapeHtml(payment.transactionId || '')}</td></tr>
    <tr><th>পরিমাণ</th><td class="total">${amountBDT}</td></tr>
  </table>
  <div class="foot">Hostamar.com — এই রসিদটি স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে।</div>
</body></html>`

    const { url } = await uploadFile(Buffer.from(html), `${orderId}.html`, 'text/html', 'invoices')
    await prisma.payment.update({ where: { transactionId: orderId }, data: { invoiceUrl: url } as any })
    return { invoiceUrl: url }
  } catch (err: any) {
    console.error('[generateInvoice] error:', err?.message || err)
    if (opts.throwOnError) throw err
    return null
  }
}
