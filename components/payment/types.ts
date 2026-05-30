export type Plan = 'starter' | 'business' | 'enterprise';
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

export const PLANS: Record<Plan, PlanInfo> = {
  starter: { amount: 2000, name: 'Starter', features: ['Web Hosting (5GB)', '10 Videos/month', 'Free SSL', 'Email Support'] },
  business: { amount: 3500, name: 'Business', features: ['VPS (2 CPU, 4GB RAM)', '20 Videos/month', 'Custom Topics', 'Priority Support', 'Social Scheduler'] },
  enterprise: { amount: 6000, name: 'Enterprise', features: ['VPS (4 CPU, 8GB RAM)', 'Unlimited Videos', 'Custom Branding', '24/7 Support', 'We Post For You'] },
};

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodInfo> = {
  bkash: { name: 'bKash', color: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  nagad: { name: 'Nagad', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
};
