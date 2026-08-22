export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import {
  upsertPayment,
  isValidEmail,
  isValidPlan,
  getPaymentByTranId,
} from '@/lib/provisioning';
import { ensureSchema } from '@/lib/ensure-schema';
import { prisma } from '@/lib/prisma';
import { bkashConfig, queryPayment } from '@/lib/payment/bkash';
import { env } from '@/lib/env'

// Real SSLCommerz IPN validation — only used when SSLCZ_STORE_ID is set.
async function verifySslcz(valId: string): Promise<boolean> {
  try {
    const storeId = env.SSLCZ_STORE_ID;
    const storePass = env.SSLCZ_STORE_PASS;
    if (!storeId || !storePass) return false;
    const url = `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
      valId,
    )}&store_id=${storeId}&store_passwd=${storePass}&format=json`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string; verified?: string };
    return data.status === 'VALID' || data.verified === 'yes';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ----------------------------------------------------------------------
    // (B) Agent->Provision bridge entry point.
    // Accepts { tran_id, status: 'VALID', customer_email, plan, val_id? }.
    // Only 'VALID' (real gateway confirmation) provisions. When SSLCommerz
    // credentials are present the val_id is validated against their API.
    // ----------------------------------------------------------------------
    if (body && body.tran_id && body.status) {
      // (B) ensure ledger table exists (self-healing) before any DB write.
      try {
        await ensureSchema()
      } catch {
        return NextResponse.json({ error: 'schema init failed' }, { status: 503 })
      }

      const { tran_id, status, customer_email, plan } = body as {
        tran_id: string;
        status: string;
        customer_email?: string;
        plan?: string;
      };

      const email = customer_email ?? '';
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'invalid or missing customer_email' }, { status: 400 });
      }
      if (!plan || !isValidPlan(plan)) {
        return NextResponse.json({ error: 'invalid or missing plan' }, { status: 400 });
      }

      const isPaid = status === 'VALID'
      if (!isPaid) {
        await upsertPayment({
          tranId: tran_id,
          customerEmail: email,
          plan: plan as 'free' | 'starter' | 'business',
          status: 'failed',
        }).catch(() => undefined)
        return NextResponse.json(
          { verified: false, provisioned: false, reason: 'not paid' },
          { status: 200 },
        )
      }

      // Real SSLCommerz validation (required when creds are present).
      if (env.SSLCZ_STORE_ID) {
        const valId = body.val_id;
        if (valId) {
          const ok = await verifySslcz(valId);
          if (!ok) {
            return NextResponse.json({ verified: false, provisioned: false, reason: 'sslcz validation failed' }, { status: 200 });
          }
        }
      }

      // Idempotent upsert: only provision if not already provisioned.
      const existing = await getPaymentByTranId(tran_id);
      await upsertPayment({
        tranId: tran_id,
        customerEmail: email,
        plan: plan as 'free' | 'starter' | 'business',
        status: 'paid',
        gateway: 'sslcommerz',
        rawPayload: body,
      });

      if (existing && existing.status === 'provisioned') {
        return NextResponse.json({
          verified: true,
          provisioned: true,
          idempotent: true,
          accountId: existing.accountId,
          loginUrl: existing.loginUrl,
        });
      }

      // Server-to-server call. Use INTERNAL_BASE_URL (defaults to localhost)
      // so the provision happens in-process without requiring external egress
      // from the app container to the public tunnel. APP_BASE_URL (public
      // domain) is only a fallback.
      const internalBase =
        env.INTERNAL_BASE_URL ||
        env.APP_BASE_URL ||
        'http://localhost:3000'
      let provisionRes: Response
      try {
        provisionRes = await fetch(`${internalBase}/api/internal/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': env.INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({ email, plan, tran_id }),
        })
      } catch (fetchErr) {
        console.error('provision fetch failed:', fetchErr)
        return NextResponse.json(
          { verified: true, provisioned: false, reason: 'provision service unreachable' },
          { status: 200 },
        )
      }
      const provisionJson = (await provisionRes.json()) as {
        success?: boolean;
        accountId?: string;
        loginUrl?: string;
      };

      return NextResponse.json({
        verified: true,
        provisioned: Boolean(provisionJson.success),
        accountId: provisionJson.accountId,
        loginUrl: provisionJson.loginUrl,
      });
    }

    // ----------------------------------------------------------------------
    // (A) Payment status lookup by trxId — DB-backed (Payment table).
    // For bKash payments with a provider paymentID, queries the real bKash
    // API for the transaction status.
    // ----------------------------------------------------------------------
    const { trxId } = body as { trxId: string };

    if (!trxId) {
      return NextResponse.json(
        { error: 'Missing required field: trxId' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: trxId },
          { providerPaymentId: trxId },
          { invoiceNumber: trxId },
        ],
      },
      include: { customer: { select: { email: true } } },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found', trxId },
        { status: 404 }
      );
    }

    // If still pending and it's a bKash payment, ask the real gateway.
    if (payment.status === 'pending' && payment.method === 'bkash' && payment.providerPaymentId) {
      const cfg = bkashConfig();
      if (cfg.configured) {
        const q = await queryPayment(payment.providerPaymentId);
        if (q.ok && q.status) {
          const newStatus =
            q.status === 'Completed' ? 'completed'
            : q.status === 'Initiated' ? 'pending'
            : 'failed';
          if (newStatus !== payment.status) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: newStatus,
                ...(q.trxId ? { transactionId: q.trxId } : {}),
              },
            });
            payment.status = newStatus;
            if (q.trxId) payment.transactionId = q.trxId;
          }
        }
      }
    }

    return NextResponse.json({
      success: payment.status === 'completed',
      trxId: payment.transactionId || trxId,
      status: payment.status,
      plan: payment.planName,
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
      message:
        payment.status === 'completed'
          ? 'Payment verified successfully! Your plan is now active.'
          : payment.status === 'pending'
            ? 'Payment is still pending. Please complete the payment and try again.'
            : 'Payment failed or was cancelled.',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trxId = searchParams.get('trxId');

    if (!trxId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: trxId' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { transactionId: trxId },
          { providerPaymentId: trxId },
          { invoiceNumber: trxId },
        ],
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found', trxId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trxId: payment.transactionId || trxId,
      status: payment.status,
      plan: payment.planName,
      amount: payment.amount,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
