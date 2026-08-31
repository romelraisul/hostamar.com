export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { bkashConfig, createCheckout } from '@/lib/payment/bkash';
import { env } from '@/lib/env'
import { PAYMENT_PLANS, BKASH_PERSONAL, type PaymentPlanId } from '@/lib/pricing'

// ============================================================================
// POST /api/payment/create — creates a payment order for a plan.
//
// Three real modes (never a mock):
//  1. bKash tokenized checkout — when BKASH_* credentials are configured AND
//     the gateway answers. If the gateway call fails we FALL THROUGH to mode 2
//     instead of 502 — the customer can always pay.
//  2. Manual send-money — customer sends money to the personal number
//     (bKash/Nagad/Rocket) or USDT wallet, then submits the TrxID via
//     /api/payment/bkash-verify. Money actually moves; admin (or SMS
//     auto-match) verifies the TrxID before credits are granted.
//  3. Honest 503 only when NO receiver is configured at all.
//
// V17: prices/credits come ONLY from lib/pricing.ts PAYMENT_PLANS
// (Starter ৳599→6000cr · Pro ৳1299→13000cr · Business ৳2999→30000cr).
// ============================================================================

type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'usdt';

function generateTrxId(): string {
  return `HOST${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

// Receiver numbers: checkout vars first, then the personal-number vars the
// /api/payments/personal-config endpoint serves, then the known merchant
// number as the final default for bKash. One env system, no split-brain.
const BKASH_NUMBER = env.BKASH_NUMBER || env.BKASH_PERSONAL_NUMBER || BKASH_PERSONAL;
const NAGAD_NUMBER = env.NAGAD_NUMBER || env.NAGAD_PERSONAL_NUMBER || '';
const ROCKET_NUMBER = env.ROCKET_NUMBER || env.ROCKET_PERSONAL_NUMBER || '';
const USDT_WALLET = env.USDT_WALLET_ADDRESS || '';

// Instruction generators for the manual send-money mode
function generateInstructions(method: PaymentMethod, plan: { name: string; price: number; credits: number }, trxId: string, phone?: string): string[] {
  switch (method) {
    case 'bkash':
      return [
        `৳${plan.price.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে bKash অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${BKASH_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.price.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার bKash PIN দিয়ে নিশ্চিত করুন',
        `পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — ${plan.credits.toLocaleString()} ক্রেডিট যোগ হবে`,
      ];
    case 'nagad':
      return [
        `৳${plan.price.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে Nagad অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${NAGAD_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.price.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার Nagad PIN দিয়ে নিশ্চিত করুন',
        `পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — ${plan.credits.toLocaleString()} ক্রেডিট যোগ হবে`,
      ];
    case 'rocket':
      return [
        `৳${plan.price.toLocaleString()} প্রদানের জন্য Rocket অ্যাপ বা SMS ব্যবহার করুন`,
        `Rocket Number: ${ROCKET_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.price.toLocaleString()}`,
        `Message/Memo এ লিখুন: ${trxId}`,
        'পেমেন্ট সম্পন্ন হলে TrxID জমা দিন — অ্যাডমিন যাচাই করে প্ল্যান চালু করবে',
      ];
    case 'usdt':
      return [
        `USDT (BEP20) ওয়ালেট থেকে ${(plan.price * 0.0025).toFixed(2)} USDT পাঠান`,
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

    // V17: single source of truth — starter | pro | business @ 599/1299/2999
    const planInfo = PAYMENT_PLANS[plan as PaymentPlanId];
    if (!planInfo) {
      return NextResponse.json(
        { error: `Invalid plan. Choose: starter, pro, business — Starter ৳${PAYMENT_PLANS.starter.price} → ${PAYMENT_PLANS.starter.credits}cr, Pro ৳${PAYMENT_PLANS.pro.price} → ${PAYMENT_PLANS.pro.credits}cr, Business ৳${PAYMENT_PLANS.business.price} → ${PAYMENT_PLANS.business.credits}cr` },
        { status: 400 }
      );
    }

    if (!['bkash', 'nagad', 'rocket', 'usdt'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Choose: bkash, nagad, rocket, usdt' },
        { status: 400 }
      );
    }

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

    // ── Mode 1: real bKash tokenized checkout when configured. On failure we
    // fall through to manual (never 502 on the money surface).
    if (m === 'bkash' && bkashConfig().configured) {
      const trxId = generateTrxId();
      try {
        const result = await createCheckout({
          amount: planInfo.price,
          orderId: trxId,
          intent: 'sale',
          callbackUrl: `${env.NEXTAUTH_URL || 'https://hostamar.com'}/api/payments/webhook`,
        });
        if (result.ok) {
          await prisma.payment.create({
            data: {
              customerId: authUser.id,
              method: 'bkash',
              amount: planInfo.price,
              currency: 'BDT',
              status: 'pending',
              transactionId: result.paymentId || trxId,
              providerPaymentId: result.paymentId || null,
              invoiceNumber: trxId,
              planName: planInfo.name,
              billingPeriod: 'monthly',
            },
          });
          return NextResponse.json({
            success: true,
            trxId,
            plan: planInfo.name,
            amount: planInfo.price,
            credits: planInfo.credits,
            currency: 'BDT',
            method: m,
            mode: 'bkash_checkout',
            paymentUrl: result.bkashUrl,
            status: 'pending',
          });
        }
        // gateway said no → fall through to manual mode below
      } catch {
        // gateway unreachable → fall through to manual mode below
      }
    }

    // ── Mode 2: manual send-money (always available for bkash; others when a
    // receiver is configured). This is a REAL method — money moves via the
    // personal apps and TrxID verification grants the credits.
    const trxId = generateTrxId();

    const receiver =
      m === 'bkash' ? BKASH_NUMBER :
      m === 'nagad' ? NAGAD_NUMBER :
      m === 'rocket' ? ROCKET_NUMBER :
      USDT_WALLET;
    if (!receiver) {
      return NextResponse.json(
        {
          error: 'PAYMENT_NOT_CONFIGURED',
          message: `No ${m} receiver configured. bKash (Send Money to ${BKASH_PERSONAL}) is always available.`,
        },
        { status: 503 }
      );
    }

    // Persist the order (DB-backed, tied to the authenticated customer)
    await prisma.payment.create({
      data: {
        customerId: authUser.id,
        method: m,
        amount: planInfo.price,
        currency: m === 'usdt' ? 'USDT' : 'BDT',
        status: 'pending',
        transactionId: trxId,
        invoiceNumber: trxId,
        planName: planInfo.name,
        billingPeriod: 'monthly',
        walletAddress: m === 'usdt' ? walletAddress : undefined,
      },
    });

    const instructions = generateInstructions(m, planInfo, trxId, phone);

    return NextResponse.json({
      success: true,
      trxId,
      plan: planInfo.name,
      amount: planInfo.price,
      credits: planInfo.credits,
      currency: m === 'usdt' ? 'USDT' : 'BDT',
      method: m,
      phone,
      walletAddress,
      mode: 'manual',
      personalNumber: m === 'bkash' ? BKASH_NUMBER : undefined,
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
