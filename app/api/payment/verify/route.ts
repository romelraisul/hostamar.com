import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Payment Verification - bKash, Nagad, Rocket & USDT (BEP20) - SIMULATED
// ============================================================================

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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