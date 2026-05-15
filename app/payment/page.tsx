'use client';

import { useState } from 'react';
import { Check, Phone, CreditCard, AlertCircle, Loader2, ArrowLeft, Shield, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';

type Plan = 'starter' | 'business' | 'enterprise';
type PaymentMethod = 'bkash' | 'nagad';

const PLANS = {
  starter: { amount: 2000, name: 'Starter', features: ['Web Hosting (5GB)', '10 Videos/month', 'Free SSL', 'Email Support'] },
  business: { amount: 3500, name: 'Business', features: ['VPS (2 CPU, 4GB RAM)', '20 Videos/month', 'Custom Topics', 'Priority Support', 'Social Scheduler'] },
  enterprise: { amount: 6000, name: 'Enterprise', features: ['VPS (4 CPU, 8GB RAM)', 'Unlimited Videos', 'Custom Branding', '24/7 Support', 'We Post For You'] },
};

const PAYMENT_METHODS = {
  bkash: { name: 'bKash', color: 'from-pink-500 to-rose-600', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  nagad: { name: 'Nagad', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
};

type PaymentState = {
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

export default function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<PaymentState>({ status: 'idle' });
  const [copied, setCopied] = useState(false);

  const handleCreatePayment = async () => {
    if (!selectedPlan || !selectedMethod || !phone) return;

    setState({ status: 'creating' });

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          method: selectedMethod,
          phone,
        }),
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
        setState({
          ...state,
          status: 'completed',
          message: data.message,
        });
      } else {
        setState({
          ...state,
          status: 'created',
          message: data.message,
        });
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
    setState({ status: 'idle' });
    setCopied(false);
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
              <span className="text-gray-400">Transaction ID</span>
              <span className="font-mono text-xs">{state.trxId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Method</span>
              <span className="font-semibold">{state.method === 'bkash' ? 'bKash' : 'Nagad'}</span>
            </div>
          </div>
          <p className="text-green-400 text-sm mb-6">{state.message}</p>
          <button
            onClick={() => window.location.href = '/app'}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hostamar.com
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">পেমেন্ট করুন</h1>
          <p className="text-gray-400 text-lg">Make a Payment</p>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{state.error}</p>
          </div>
        )}

        {/* Message Display */}
        {state.message && (state.status as string) !== 'completed' && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-blue-300 text-sm">{state.message}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Selection */}
          <div className="space-y-6">
            {/* Plan Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                প্ল্যান নির্বাচন করুন
                <span className="text-sm text-gray-500 font-normal ml-2">(Select Plan)</span>
              </h3>
              <div className="space-y-3">
                {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    disabled={(state.status as string) === 'creating' || (state.status as string) === 'verifying'}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedPlan === key
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{plan.name}</span>
                      <span className="text-xl font-bold">৳{plan.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {plan.features.length > 3 && (
                        <span className="text-xs text-gray-500">+{plan.features.length - 3} more</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                পেমেন্ট মাধ্যম
                <span className="text-sm text-gray-500 font-normal ml-2">(Payment Method)</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, typeof PAYMENT_METHODS[PaymentMethod]][]).map(([key, method]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedMethod(key)}
                    disabled={(state.status as string) === 'creating' || (state.status as string) === 'verifying'}
                    className={`p-4 rounded-xl border transition-all text-center ${
                      selectedMethod === key
                        ? `${method.bg} ${method.border} shadow-lg`
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className={`text-lg font-bold mb-1 ${method.text}`}>{method.name}</div>
                    <div className="text-xs text-gray-500">Mobile Payment</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-400" />
                ফোন নম্বর
                <span className="text-sm text-gray-500 font-normal ml-2">(Phone Number)</span>
              </h3>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                disabled={state.status === 'creating' || state.status === 'verifying'}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
              />
              <p className="text-xs text-gray-500 mt-2">
                Bangladesh mobile number (013, 015, 016, 017, 018, 019)
              </p>
            </div>

            {/* Create Payment Button */}
            <button
              onClick={handleCreatePayment}
              disabled={!selectedPlan || !selectedMethod || !phone || (state.status as string) === 'creating' || (state.status as string) === 'verifying'}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                selectedPlan && selectedMethod && phone
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-600/25'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {(state.status as string) === 'creating' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Payment...
                </span>
              ) : (
                `Pay ৳${selectedPlan ? PLANS[selectedPlan].amount.toLocaleString() : '0'}`
              )}
            </button>
          </div>

          {/* Right Column - Instructions */}
          <div>
            {(state.status as string) === 'created' && state.instructions ? (
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">পেমেন্ট নির্দেশনা</h3>
                  <span className="text-sm text-gray-500">Payment Instructions</span>
                </div>

                {/* Transaction ID */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-blue-400">{state.trxId}</code>
                    <button
                      onClick={copyTrxId}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition"
                      title="Copy Transaction ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-6 ${PAYMENT_METHODS[state.method!].bg} ${PAYMENT_METHODS[state.method!].text}`}>
                  {state.method === 'bkash' ? 'bKash' : 'Nagad'}
                </div>

                {/* Instructions List */}
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

                {/* Amount Summary */}
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
                    <span className="text-gray-400">Phone</span>
                    <span>{state.phone}</span>
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  onClick={handleVerifyPayment}
                  disabled={(state.status as string) === 'verifying'}
                  className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  {(state.status as string) === 'verifying' ? (
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

                {/* Reset Button */}
                <button
                  onClick={reset}
                  className="w-full py-3 mt-3 text-gray-400 hover:text-white transition text-sm"
                >
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
                  Payment instructions will appear here after you create a payment order.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by bKash & Nagad • SSL Encrypted</span>
          </div>
        </div>
      </main>
    </div>
  );
}
