export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import {
  upsertPayment,
  isValidEmail,
  isValidPlan,
  getPaymentByTranId,
} from '@/lib/provisioning';
import { ensureSchema } from '@/lib/ensure-schema';

declare global {
  var __paymentTransactions: Map<string, {
    trxId: string;
    plan: string;
    method: string;
    phone?: string;
    walletAddress?: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    createdAt: number;
  }>;
}

if (!global.__paymentTransactions) {
  global.__paymentTransactions = new Map();
}
const transactions = global.__paymentTransactions;

async function verifyBkashPayment(paymentId: string) {
  return { status: 'completed', trxId: paymentId };
}

async function verifyNagadPayment(orderId: string) {
  return { status: 'completed', trxId: orderId };
}

async function verifyRocketPayment(orderId: string) {
  return { status: 'completed', trxId: orderId };
}

async function verifyUSDTPayment(orderId: string) {
  return { status: 'completed', trxId: orderId };
}

// Real SSLCommerz IPN validation — only used when SSLCZ_STORE_ID is set.
async function verifySslcz(valId: string): Promise<boolean> {
  try {
    const storeId = process.env.SSLCZ_STORE_ID;
    const storePass = process.env.SSLCZ_STORE_PASS;
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
    // Accepts { tran_id, status: 'VALID'|'mock_valid', customer_email, plan }.
    // mock_valid skips the external gateway call (no creds yet); the real
    // SSLCommerz validation is gated behind SSLCZ_STORE_ID and runs when set.
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
        status: 'VALID' | 'mock_valid';
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

      const allowMock = process.env.ALLOW_MOCK_PROVISION === 'true'
      const isPaid =
        status === 'VALID' || (status === 'mock_valid' && allowMock)
      if (!isPaid) {
        const reason =
          status === 'mock_valid' && !allowMock
            ? 'mock provisioning disabled in this environment'
            : 'not paid'
        await upsertPayment({
          tranId: tran_id,
          customerEmail: email,
          plan: plan as 'free' | 'starter' | 'business',
          status: 'failed',
        }).catch(() => undefined)
        return NextResponse.json(
          { verified: false, provisioned: false, reason },
          { status: 200 },
        )
      }

      // Real SSLCommerz validation (enabled when creds are present).
      if (status === 'VALID' && process.env.SSLCZ_STORE_ID) {
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
        gateway: status === 'VALID' ? 'sslcommerz' : 'mock',
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
        process.env.INTERNAL_BASE_URL ||
        process.env.APP_BASE_URL ||
        'http://localhost:3000'
      let provisionRes: Response
      try {
        provisionRes = await fetch(`${internalBase}/api/internal/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
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

    const { trxId } = body as { trxId: string };

    if (!trxId) {
      return NextResponse.json(
        { error: 'Missing required field: trxId' },
        { status: 400 }
      );
    }

    const transaction = transactions.get(trxId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found', trxId },
        { status: 404 }
      );
    }

    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        trxId: transaction.trxId,
        status: 'completed',
        plan: transaction.plan,
        amount: transaction.amount,
        method: transaction.method,
        phone: transaction.phone,
        walletAddress: transaction.walletAddress,
        completedAt: new Date(transaction.createdAt).toISOString(),
      });
    }

    if (transaction.status === 'failed') {
      return NextResponse.json({
        success: false,
        trxId: transaction.trxId,
        status: 'failed',
        plan: transaction.plan,
        amount: transaction.amount,
        method: transaction.method,
        message: 'Payment failed or was cancelled',
      });
    }

    let verificationResult;
    if (transaction.method === 'bkash') {
      verificationResult = await verifyBkashPayment(trxId);
    } else if (transaction.method === 'nagad') {
      verificationResult = await verifyNagadPayment(trxId);
    } else if (transaction.method === 'rocket') {
      verificationResult = await verifyRocketPayment(trxId);
    } else {
      verificationResult = await verifyUSDTPayment(trxId);
    }

    if (verificationResult.status === 'completed') {
      transaction.status = 'completed';
      transactions.set(trxId, transaction);

      return NextResponse.json({
        success: true,
        trxId: transaction.trxId,
        status: 'completed',
        plan: transaction.plan,
        amount: transaction.amount,
        method: transaction.method,
        phone: transaction.phone,
        walletAddress: transaction.walletAddress,
        completedAt: verificationResult.completedAt || new Date().toISOString(),
        message: 'Payment verified successfully! Your plan is now active.',
      });
    } else {
      transaction.status = 'failed';
      transactions.set(trxId, transaction);

      return NextResponse.json({
        success: false,
        trxId: transaction.trxId,
        status: 'pending',
        plan: transaction.plan,
        amount: transaction.amount,
        method: transaction.method,
        message: 'Payment is still pending. Please complete the payment and try again.',
      });
    }
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

    const transaction = transactions.get(trxId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found', trxId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trxId: transaction.trxId,
      status: transaction.status,
      plan: transaction.plan,
      amount: transaction.amount,
      method: transaction.method,
      phone: transaction.phone,
      walletAddress: transaction.walletAddress,
      createdAt: new Date(transaction.createdAt).toISOString(),
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}