export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

// ============================================================================
// Payment Integration - bKash, Nagad, Rocket & USDT (BEP20) - SIMULATED
// ============================================================================
// Real integrations require merchant accounts:
// - bKash: https://developer.bkash.com
// - Nagad: https://www.nagad.com.bd/merchant
// - Rocket: https://www.rocket.com.bd (BL/NBL API)
// - USDT BEP20: TRC-20 wallet + manual confirmation
// ============================================================================

const PLANS = {
  starter: { amount: 2000, name: 'Starter', currency: 'BDT' },
  business: { amount: 3500, name: 'Business', currency: 'BDT' },
  enterprise: { amount: 6000, name: 'Enterprise', currency: 'BDT' },
} as const;

type PlanKey = keyof typeof PLANS;
type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'usdt';

// In-memory transaction store
const transactions = new Map<string, {
  trxId: string;
  plan: PlanKey;
  method: PaymentMethod;
  phone?: string;
  walletAddress?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
}>();

function generateTrxId(): string {
  return `HOST${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

// Personal receiver numbers (SEND MONEY ONLY — no business/merchant account yet).
// Configurable via .env; defaults are the owner's personal numbers.
const BKASH_NUMBER = process.env.BKASH_NUMBER || '01822417463';
const NAGAD_NUMBER = process.env.NAGAD_NUMBER || '01711317101';
const ROCKET_NUMBER = process.env.ROCKET_NUMBER || '01822417463';

// USDT wallet address for receiving payments
const USDT_WALLET = process.env.USDT_WALLET_ADDRESS || '0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858';

// Payment creation helpers
async function createBkashPayment(amount: number, trxId: string, phone: string) {
  return {
    paymentID: `bkash_${trxId}`,
    bkashURL: `https://payment.bkash.com/checkout?paymentID=${trxId}`,
    amount: amount.toString(),
    status: 'pending',
  };
}

async function createNagadPayment(amount: number, trxId: string, phone: string) {
  return {
    orderId: `nagad_${trxId}`,
    nagadURL: `https://payment.nagad.com.bd/checkout?orderId=${trxId}`,
    amount: amount.toString(),
    status: 'pending',
  };
}

async function createRocketPayment(amount: number, trxId: string, phone: string) {
  return {
    orderId: `rocket_${trxId}`,
    phone: phone,
    amount: amount.toString(),
    status: 'pending',
  };
}

async function createUSDTPayment(amount: number, trxId: string, walletAddress: string) {
  const amountUSDT = (amount * 0.0025).toFixed(2); // BDT to USDT approximate rate
  return {
    orderId: `usdt_${trxId}`,
    walletAddress: USDT_WALLET,
    amountUSDT,
    amountBDT: amount.toString(),
    status: 'pending',
    note: `Send exactly ${amountUSDT} USDT to ${USDT_WALLET} and include "${trxId}" in memo`,
  };
}

// Verification helpers (simulated)
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

// Instruction generators
function generateInstructions(method: PaymentMethod, plan: { name: string; amount: number }, trxId: string, phone?: string, walletAddress?: string): string[] {
  switch (method) {
    case 'bkash':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে bKash অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${BKASH_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.amount.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার bKash PIN দিয়ে নিশ্চিত করুন',
        'পেমেন্ট সম্পন্ন হলে "Verify" বাটনে ক্লিক করুন',
      ];
    case 'nagad':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য আপনার ${phone} নম্বরে Nagad অ্যাপ খুলুন`,
        '"Send Money" অথবা "Payment" অপশনে ক্লিক করুন',
        `Merchant Number: ${NAGAD_NUMBER} (Hostamar)`,
        `Amount: ৳${plan.amount.toLocaleString()} লিখুন`,
        `Reference: ${trxId} (অবশ্যই লিখুন)`,
        'আপনার Nagad PIN দিয়ে নিশ্চিত করুন',
        'পেমেন্ট সম্পন্ন হলে "Verify" বাটনে ক্লিক করুন',
      ];
    case 'rocket':
      return [
        `৳${plan.amount.toLocaleString()} প্রদানের জন্য Rocket অ্যাপ বা SMS ব্যবহার করুন`,
        `Rocket Number: ${ROCKET_NUMBER} (Hostamar) পরে পাঠান`,
        `Amount: ৳${plan.amount.toLocaleString()}`,
        `Message/Memo এ লিখুন: ${trxId}`,
        'পেমেন্ট সম্পন্ন হলে "Verify" বাটনে ক্লিক করুন',
      ];
    case 'usdt':
      return [
        `USDT (BEP20) ওয়ালেট থেকে ${(plan.amount * 0.0025).toFixed(2)} USDT পাঠান`,
        `পাঠানো ঠিকানা: ${USDT_WALLET}`,
        `Memo/Note এ লিখুন: ${trxId}`,
        'পেমেন্ট সম্পন্ন হলে "Verify" বাটনে ক্লিক করুন',
      ];
    default:
      return ['Invalid payment method'];
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const trxId = generateTrxId();

    // Validate phone for mobile methods
    if (['bkash', 'nagad', 'rocket'].includes(method)) {
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
    if (method === 'usdt') {
      if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length < 40) {
        return NextResponse.json(
          { error: 'Valid wallet address required for USDT payment' },
          { status: 400 }
        );
      }
    }

    let paymentResult;
    const m = method as PaymentMethod;

    if (m === 'bkash') {
      paymentResult = await createBkashPayment(planInfo.amount, trxId, phone!);
    } else if (m === 'nagad') {
      paymentResult = await createNagadPayment(planInfo.amount, trxId, phone!);
    } else if (m === 'rocket') {
      paymentResult = await createRocketPayment(planInfo.amount, trxId, phone!);
    } else {
      paymentResult = await createUSDTPayment(planInfo.amount, trxId, walletAddress!);
    }

    transactions.set(trxId, {
      trxId,
      plan: planKey,
      method: m,
      phone,
      walletAddress,
      amount: planInfo.amount,
      status: 'pending',
      createdAt: Date.now(),
    });

    const instructions = generateInstructions(m, planInfo, trxId, phone, walletAddress);

    // Persist an order row so the webhook + invoice can reference it by transactionId.
    // Merchant creds are optional: without them the flow stays manual (live fallback).
    try {
      await prisma.payment.upsert({
        where: { transactionId: trxId },
        update: { amount: planInfo.amount, method: m, planName: planInfo.name, status: 'pending' },
        create: {
          customerId: 'pending', // attached to the real customer when they submit/verify
          method: m,
          amount: planInfo.amount,
          currency: 'BDT',
          status: 'pending',
          transactionId: trxId,
          planName: planInfo.name,
          billingPeriod: 'yearly',
        },
      })
    } catch (e) {
      console.warn('[Payment:Create] order row upsert failed (non-fatal):', (e as any)?.message)
    }

    return NextResponse.json({
      success: true,
      trxId,
      plan: planInfo.name,
      amount: planInfo.amount,
      currency: planInfo.currency,
      method: m,
      phone,
      walletAddress,
      paymentUrl: (paymentResult as any).bkashURL || (paymentResult as any).nagadURL || null,
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