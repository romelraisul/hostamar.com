export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { bkashConfig, createCheckout } from '@/lib/payment/bkash';
import { env } from '@/lib/env'

// ============================================================================
// POST /api/payment/create
// Creates a payment order for a plan.
//
// Two real modes:
//  1. bKash tokenized checkout — when BKASH_* credentials are configured,
//     returns a real hosted bKash payment URL (lib/payment/bkash.ts).
//  2. Manual send-money — customer sends money to the merchant number
//     (bKash/Nagad/Rocket personal numbers) or USDT wallet, then submits the
//     TrxID via /api/payment/bkash-verify for admin review. This is a real
//     payment method, not a mock: money actually moves, admin verifies the
//     TrxID against the merchant statement before approving.
//
// All orders are persisted to the Payment table (DB-backed, no in-memory
// store). No fake checkout URLs are ever returned.
// ============================================================================

const PLANS = {
  starter: { amount: 2000, name: 'Starter', currency: 'BDT' },
  business: { amount: 3500, name: 'Business', currency: 'BDT' },
  enterprise: { amount: 6000, name: 'Enterprise', currency: 'BDT' },
} as const;

type PlanKey = keyof typeof PLANS;
type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'usdt';

function generateTrxId(): string {
  return `HOST${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

// Merchant receiver numbers (manual send-money mode). Configurable via env.
const BKASH_NUMBER = env.BKASH_NUMBER || '';
const NAGAD_NUMBER = env.NAGAD_NUMBER || '';
const ROCKET_NUMBER = env.ROCKET_NUMBER || '';
const USDT_WALLET = env.USDT_WALLET_ADDRESS || '';

// Instruction generators for the manual send-money mode
function generateInstructions(method: PaymentMethod, plan: { name: string; amount: number }, trxId: string, phone?: string): string[] {
  switch (method) {
    case 'bkash':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে bKash অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${BKASH_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.amount.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার bKash PIN দিয়ে নিশ্চিত করুন',
        'পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — অ্যাডমিন যাচাই করে প্ল্যান চালু করবে',
      ];
    case 'nagad':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে Nagad অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${NAGAD_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.amount.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার Nagad PIN দিয়ে নিশ্চিত করুন',
        'পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — অ্যাডমিন যাচাই করে প্ল্যান চালু করবে',
      ];
    case 'rocket':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য Rocket অ্যাপ বা SMS ব্যবহার করুন`,
        `Rocket Number: ${ROCKET_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.amount.toLocaleString()}`,
        `Message/Memo এ লিখুন: ${trxId}`,
        'পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — অ্যাডমিন যাচাই করে প্ল্যান চালু করবে',
      ];
    case 'usdt':
      return [
        `USDT (BEP20) ওয়ালেট থেকে ${(plan.amount * 0.0025).toFixed(2)} USDT পাঠান`,
        `পাঠানোর ঠিকানা: ${USDT_WALLET}`,
        `Memo/Note এ লিখুন: ${trxId}`,
        'পেমেন্ট সম্পন্ন হলে TxHash জমা দিন — অ্যাডমিন যাচাই করে প্ল্যান চালু করবে',
      ];
    default:
      return ['Invalid payment method'];
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, method, phone, walletAddress } = body as {
      plan: string;
      method: string;
      phone?: string;
      walletAddress?: string;
    };

    if (!plan || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, method' },
        { status: 400 }
      );
    }

    if (!['starter', 'business', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Choose: starter, business, enterprise' },
        { status: 400 }
      );
    }

    if (!['bkash', 'nagad', 'rocket', 'usdt'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Choose: bkash, nagad, rocket, usdt' },
        { status: 400 }
      );
    }

    const planKey = plan as PlanKey;
    const planInfo = PLANS[planKey];
    const m = method as PaymentMethod;

    // Validate phone for mobile methods
    if (['bkash', 'nagad', 'rocket'].includes(m)) {
      if (!phone) {
        return NextResponse.json(
          { error: 'Phone number required for this payment method' },
          { status: 400 }
        );
      }
      const phoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;
      if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid Bangladesh phone number format' },
          { status: 400 }
        );
      }
    }

    // Validate wallet address for USDT
    if (m === 'usdt') {
      if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length < 40) {
        return NextResponse.json(
          { error: 'Valid wallet address required for USDT payment' },
          { status: 400 }
        );
      }
    }

    // Mode 1: real bKash tokenized checkout when configured
    if (m === 'bkash' && bkashConfig().configured) {
      const trxId = generateTrxId();
      const callbackUrl = `${env.NEXTAUTH_URL || 'https://hostamar.com'}/api/payments/webhook`;
      const result = await createCheckout({
        amount: planInfo.amount,
        orderId: trxId,
        intent: 'sale',
        callbackUrl,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || 'bKash create failed' }, { status: 502 });
      }
      await prisma.payment.create({
        data: {
          customerId: authUser.id,
          method: 'bkash',
          amount: planInfo.amount,
          currency: 'BDT',
          status: 'pending',
          transactionId: result.paymentId || trxId,
          providerPaymentId: result.paymentId || null,
          invoiceNumber: trxId,
          planName: planInfo.name,
          billingPeriod: 'yearly',
        },
      });
      return NextResponse.json({
        success: true,
        trxId,
        plan: planInfo.name,
        amount: planInfo.amount,
        currency: planInfo.currency,
        method: m,
        mode: 'bkash_checkout',
        paymentUrl: result.bkashUrl,
        status: 'pending',
      });
    }

    // Mode 2: manual send-money (bKash/Nagad/Rocket without API creds, or USDT)
    const trxId = generateTrxId();

    // Manual mode requires a configured receiver number/wallet
    const receiver =
      m === 'bkash' ? BKASH_NUMBER :
      m === 'nagad' ? NAGAD_NUMBER :
      m === 'rocket' ? ROCKET_NUMBER :
      USDT_WALLET;
    if (!receiver) {
      return NextResponse.json(
        {
          error: 'PAYMENT_NOT_CONFIGURED',
          message: `No ${m} receiver configured. Set the merchant number/wallet in env to enable manual ${m} payments, or configure bKash API credentials for online checkout.`,
        },
        { status: 503 }
      );
    }

    // Persist the order (DB-backed, tied to the authenticated customer)
    await prisma.payment.create({
      data: {
        customerId: authUser.id,
        method: m,
        amount: planInfo.amount,
        currency: m === 'usdt' ? 'USDT' : 'BDT',
        status: 'pending',
        transactionId: trxId,
        invoiceNumber: trxId,
        planName: planInfo.name,
        billingPeriod: 'yearly',
        walletAddress: m === 'usdt' ? walletAddress : undefined,
      },
    });

    const instructions = generateInstructions(m, planInfo, trxId, phone);

    return NextResponse.json({
      success: true,
      trxId,
      plan: planInfo.name,
      amount: planInfo.amount,
      currency: planInfo.currency,
      method: m,
      phone,
      walletAddress,
      mode: 'manual',
      paymentUrl: null, // manual mode: no hosted checkout URL
      instructions,
      status: 'pending',
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
