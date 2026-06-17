'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Phone, CreditCard, AlertCircle, Loader2, ArrowLeft, Shield, Copy, CheckCircle2, XCircle, Clock, Send, Wallet, Smartphone, Banknote, Tag } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { PROMO_CODES, validatePromo, discountPrice, type PromoCode } from '@/lib/promo';

type Plan = 'starter' | 'business' | 'enterprise';
type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'usdt';

const PLANS = {
  starter: { amount: 2000, name: 'Starter', features: ['Web Hosting (5GB)', '10 Videos/month', 'Free SSL', 'Email Support'] },
  business: { amount: 3500, name: 'Business', features: ['VPS (2 CPU, 4GB RAM)', '20 Videos/month', 'Custom Topics', 'Priority Support', 'Social Scheduler'] },
  enterprise: { amount: 6000, name: 'Enterprise', features: ['VPS (4 CPU, 8GB RAM)', 'Unlimited Videos', 'Custom Branding', '24/7 Support', 'We Post For You'] },
};

const PAYMENT_METHODS = {
  bkash: { name: 'bKash', color: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  nagad: { name: 'Nagad', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  rocket: { name: 'Rocket', color: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  usdt: { name: 'USDT (BEP20)', color: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
};

type PaymentState = {
  status: 'idle' | 'creating' | 'created' | 'verifying' | 'completed' | 'failed';
  trxId?: string;
  plan?: Plan;
  amount?: number;
  method?: PaymentMethod;
  phone?: string;
  walletAddress?: string;
  instructions?: string[];
  message?: string;
  error?: string;
};

export default function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [state, setState] = useState<PaymentState>({ status: 'idle' });
  const [error, setError] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  // The displayed price for the selected plan (after discount if appliedPromo).
  const displayedPrice = useMemo(() => {
    if (!selectedPlan) return 0
    const base = PLANS[selectedPlan].amount
    return discountPrice(base, appliedPromo)
  }, [selectedPlan, appliedPromo])

  const applyPromoCode = () => {
    setPromoError(null)
    const promo = validatePromo(promoInput)
    if (!promo) {
      setPromoError('কোড সঠিক নয়। EARLY50 বা ROMEL50 চেষ্টা করুন।')
      setAppliedPromo(null)
      return
    }
    setAppliedPromo(promo)
  }

  const clearPromo = () => {
    setPromoInput('')
    setAppliedPromo(null)
    setPromoError(null)
  }
  const isPhoneMethod = selectedMethod === 'bkash' || selectedMethod === 'nagad' || selectedMethod === 'rocket';

  const handleCreatePayment = async () => {
    if (!selectedPlan || !selectedMethod) return;
    if (isPhoneMethod && !phone) return;
    if (selectedMethod === 'usdt' && !walletAddress) return;

    setState({ status: 'creating' });

    try {
      const body: any = { plan: selectedPlan, method: selectedMethod };
      if (isPhoneMethod) body.phone = phone;
      if (selectedMethod === 'usdt') body.walletAddress = walletAddress;
      if (appliedPromo) body.promoCode = appliedPromo.code;

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ status: 'idle', error: data.error });
        return;
      }

      setState({
        status: 'created',
        trxId: data.trxId,
        plan: data.plan.toLowerCase() as Plan,
        amount: data.amount,
        method: data.method,
        phone: data.phone,
        walletAddress: data.walletAddress,
        instructions: data.instructions,
      });
    } catch (err) {
      setState({ status: 'idle', error: 'Failed to create payment. Please try again.' });
    }
  };

  const handleVerifyPayment = async () => {
    if (!state.trxId) return;
    setState({ ...state, status: 'verifying' });

    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trxId: state.trxId }),
      });
      const data = await res.json();

      if (data.status === 'completed') {
        setState({ ...state, status: 'completed', message: data.message });
      } else {
        setState({ ...state, status: 'created', message: data.message });
      }
    } catch (err) {
      setState({ ...state, status: 'created', error: 'Failed to verify payment. Please try again.' });
    }
  };

  const copyTrxId = () => {
    if (state.trxId) {
      navigator.clipboard.writeText(state.trxId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setSelectedPlan(null);
    setSelectedMethod(null);
    setPhone('');
    setWalletAddress('');
    setState({ status: 'idle' });
    setCopied(false);
  };

  const getMethodLabel = (m: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', usdt: 'USDT BEP20'
    };
    return labels[m];
  };

  if (state.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/80 border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">পেমেন্ট সফল!</h2>
          <p className="text-gray-400 mb-4">Payment Successful!</p>
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Plan</span>
              <span className="font-semibold">{state.plan}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Amount</span>
              <span className="font-semibold">৳{state.amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Method</span>
              <span className="font-semibold">{getMethodLabel(state.method!)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Transaction ID</span>
              <span className="font-mono text-xs">{state.trxId}</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mb-6">{state.message}</p>
          <button onClick={() => window.location.href = '/app'} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hostamar.com
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">পেমেন্ট করুন</h1>
          <p className="text-gray-400 text-lg">Make a Payment</p>
        </div>

        {state.error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{state.error}</p>
          </div>
        )}

        {state.message && (state.status as string) !== 'completed' && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-blue-300 text-sm">{state.message}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Plan Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                প্ল্যান নির্বাচন করুন
              </h3>
              <div className="space-y-3">
                {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    disabled={state.status === 'creating' || state.status === 'verifying'}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedPlan === key
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{plan.name}</span>
                      <span className="text-right">
                        {appliedPromo && selectedPlan === key ? (
                          <span>
                            <span className="text-sm line-through text-gray-500 mr-1">৳{plan.amount.toLocaleString()}</span>
                            <span className="text-xl font-bold text-green-400">৳{displayedPrice.toLocaleString()}</span>
                          </span>
                        ) : (
                          <span className="text-xl font-bold">৳{plan.amount.toLocaleString()}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Promo code — supports the marketing kit's EARLY50 / ROMEL50 */}
              <div className="mt-4 p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-semibold text-green-300 mb-2">
                  <Tag className="w-4 h-4" />
                  প্রমো কোড আছে?
                </label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-green-500/20 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-mono font-bold text-green-300">{appliedPromo.code}</span>
                      <span className="text-xs text-gray-400 ml-2">— {appliedPromo.label}</span>
                    </div>
                    <button
                      onClick={clearPromo}
                      className="text-xs text-gray-400 hover:text-red-400 underline"
                    >
                      সরান
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') applyPromoCode() }}
                      placeholder="EARLY50 / ROMEL50 / LAUNCH25"
                      className="flex-1 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
                    >
                      প্রয়োগ
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-xs text-red-400 mt-2">{promoError}</p>
                )}
                {!appliedPromo && !promoError && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 প্রথম ১০০ সাবস্ক্রাইবারের জন্য <code className="bg-gray-800 px-1 rounded">EARLY50</code> দিয়ে ৫০% ডিসকাউন্ট।
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>

              {/* Phase 0.3: manual payment alternative */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="flex-1 text-sm text-amber-900">
                  <div className="font-semibold mb-1">bKash / Nagad / Rocket ব্যবহার করছেন?</div>
                  QR স্ক্যান না করে সরাসরি টাকা পাঠিয়ে TrxID দিন — দ্রুত যাচাই পেতে এখানে ক্লিক করুন।
                </div>
                <Link
                  href="/dashboard/payment/manual"
                  className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 whitespace-nowrap"
                >
                  ম্যানুয়াল পেমেন্ট →
                </Link>
              </div>

              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                পেমেন্ট মাধ্যম
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, typeof PAYMENT_METHODS[PaymentMethod]][]).map(([key, method]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedMethod(key); setError(''); }}
                    disabled={state.status === 'creating' || state.status === 'verifying'}
                    className={`p-4 rounded-xl border transition-all text-center ${
                      selectedMethod === key
                        ? `${method.bg} ${method.border} shadow-lg`
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className={`text-lg font-bold mb-1 ${method.text}`}>{method.name}</div>
                    <div className="text-xs text-gray-500">
                      {key === 'usdt' ? 'Crypto (BSC)' : 'Mobile Payment'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Display - Show when method is selected */}
            {selectedMethod && (
              <div className="text-center py-4">
                <div className="inline-block bg-white rounded-2xl p-4 shadow-lg shadow-black/20">
                  <NextImage
                    src={`/qr/${selectedMethod}.png`}
                    alt={`${PAYMENT_METHODS[selectedMethod].name} QR Code`}
                    width={selectedMethod === 'usdt' ? 220 : 180}
                    height={selectedMethod === 'usdt' ? 220 : 180}
                    className="mx-auto"
                    priority
                  />
                  <p className={`mt-3 text-sm font-semibold ${PAYMENT_METHODS[selectedMethod].text}`}>
                    Scan to Pay via {PAYMENT_METHODS[selectedMethod].name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedMethod === 'usdt'
                      ? 'Send USDT to this address'
                      : 'Open app & scan QR code'}
                  </p>
                </div>
              </div>
            )}

            {/* Phone or Wallet based on method */}
            {isPhoneMethod ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-400" />
                  ফোন নম্বর
                </h3>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  disabled={state.status === 'creating' || state.status === 'verifying'}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <p className="text-xs text-gray-500 mt-2">Bangladesh mobile number (013, 015, 016, 017, 018, 019)</p>
              </div>
            ) : selectedMethod === 'usdt' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-400" />
                  USDT Wallet Address
                </h3>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={state.status === 'creating' || state.status === 'verifying'}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">Send <strong>{(selectedPlan && PLANS[selectedPlan]?.amount) || 0 * 0.0025} USDT</strong> to: <code className="text-blue-400">0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858</code></p>
              </div>
            ) : null}

            {/* Create Payment Button */}
            <button
              onClick={handleCreatePayment}
              disabled={
                !selectedPlan || !selectedMethod ||
                (isPhoneMethod && !phone) ||
                (selectedMethod === 'usdt' && !walletAddress) ||
                state.status === 'creating' || state.status === 'verifying'
              }
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                selectedPlan && selectedMethod && (isPhoneMethod ? phone : (selectedMethod === 'usdt' ? walletAddress : true))
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-600/25'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {state.status === 'creating' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Payment...
                </span>
              ) : (
                `Pay ৳${selectedPlan ? PLANS[selectedPlan].amount.toLocaleString() : '0'} via ${selectedMethod ? getMethodLabel(selectedMethod) : '...'}`
              )}
            </button>
          </div>

          {/* Right Column */}
          <div>
            {(state.status as string) === 'created' && state.instructions ? (
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">পেমেন্ট নির্দেশনা</h3>
                  <span className="text-sm text-gray-500">Payment Instructions</span>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-blue-400">{state.trxId}</code>
                    <button onClick={copyTrxId} className="p-2 hover:bg-gray-700/50 rounded-lg transition" title="Copy Transaction ID">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-6 ${PAYMENT_METHODS[state.method!].bg} ${PAYMENT_METHODS[state.method!].text}`}>
                  {getMethodLabel(state.method!)}
                </div>

                <ol className="space-y-4 mb-8">
                  {state.instructions.map((instruction, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs text-blue-400 font-semibold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-300 leading-relaxed">{instruction}</span>
                    </li>
                  ))}
                </ol>

                <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Plan</span>
                    <span>{state.plan}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Amount</span>
                    <span className="font-bold text-lg">৳{state.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Method</span>
                    <span>{getMethodLabel(state.method!)}</span>
                  </div>
                </div>

                <button
                  onClick={handleVerifyPayment}
                  disabled={state.status === 'verifying'}
                  className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  {state.status === 'verifying' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      পেমেন্ট যাচাই করুন (Verify Payment)
                    </>
                  )}
                </button>

                <button onClick={reset} className="w-full py-3 mt-3 text-gray-400 hover:text-white transition text-sm">
                  Cancel / বাতিল করুন
                </button>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-400">পেমেন্ট নির্দেশনা এখানে দেখাবে</h3>
                <p className="text-sm text-gray-600">
                  Select a plan and payment method above to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment • SSL Encrypted • Powered by local methods</span>
          </div>
        </div>
      </main>
    </div>
  );
}