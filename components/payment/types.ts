import { PAYMENT_PLANS } from '@/lib/pricing';
export type Plan = 'starter' | 'pro' | 'business';
export type PaymentMethod = 'bkash' | 'nagad';

export type PaymentState = {
  status: 'idle' | 'creating' | 'created' | 'verifying' | 'completed' | 'failed';
  trxId?: string;
  plan?: Plan;
  amount?: number;
  method?: PaymentMethod;
  phone?: string;
  instructions?: string[];
  message?: string;
  error?: string;
};

export type PlanInfo = {
  amount: number;
  name: string;
  features: string[];
};

export type PaymentMethodInfo = {
  name: string;
  color: string;
  bg: string;
  border: string;
  text: string;
};

// V17 root-cause fix (HARBOR): old copy of prices (2000/3500/6000, no pro) drifted
// from lib/pricing.ts — the pay button on /payment showed fake prices. Single source now.

export const PLANS: Record<Plan, PlanInfo> = {
  starter: { amount: PAYMENT_PLANS.starter.price, name: 'Starter', features: ['৬০০০ ক্রেডিট / মাস', '১০GB NVMe হোস্টিং + ফ্রি SSL', 'bKash / Nagad সাপোর্ট', 'Email Support'] },
  pro: { amount: PAYMENT_PLANS.pro.price, name: 'Pro', features: ['১৩০০০ ক্রেডিট / মাস', '৫০GB হোস্টিং', 'API এক্সেস + টিম ৫ জন', 'Priority Support'] },
  business: { amount: PAYMENT_PLANS.business.price, name: 'Business', features: ['৩০০০০ ক্রেডিট / মাস', 'আনলিমিটেড হোস্টিং', 'কাস্টম ডোমেইন', 'ডেডিকেটেড সাপোর্ট'] },
};

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodInfo> = {
  bkash: { name: 'bKash', color: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  nagad: { name: 'Nagad', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
};
