'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Shield,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

import { Plan, PaymentMethod, PaymentState, PLANS } from '@/components/payment/types';
import PlanSelector from '@/components/payment/plan-selector';
import PaymentMethodSelector from '@/components/payment/payment-method-selector';
import PhoneInput from '@/components/payment/phone-input';
import PaymentInstructions from '@/components/payment/payment-instructions';
import CompletedView from '@/components/payment/completed-view';

export default function PaymentPage() {
  const { t } = useLocale();
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
    } catch (_err) {
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
    } catch (_err) {
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
    return <CompletedView state={state} />;
  }

  const isBusy = state.status === 'creating' || state.status === 'verifying';

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
          <h1 className="text-4xl font-bold mb-3">{t('payment.pageTitle')}</h1>
          <p className="text-gray-400 text-lg">{t('payment.subtitle')}</p>
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
            <PlanSelector
              selectedPlan={selectedPlan}
              onSelect={setSelectedPlan}
              disabled={isBusy}
            />

            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onSelect={setSelectedMethod}
              disabled={isBusy}
            />

            <PhoneInput
              phone={phone}
              onChange={setPhone}
              disabled={isBusy}
            />

            {/* Create Payment Button */}
            <button
              onClick={handleCreatePayment}
              disabled={!selectedPlan || !selectedMethod || !phone || isBusy}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                selectedPlan && selectedMethod && phone
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-600/25'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {state.status === 'creating' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('payment.creating')}
                </span>
              ) : (
                `${t('payment.payWith')} ৳${selectedPlan ? PLANS[selectedPlan].amount.toLocaleString() : '0'}`
              )}
            </button>
          </div>

          {/* Right Column - Instructions */}
          <div>
            <PaymentInstructions
              state={state}
              onVerify={handleVerifyPayment}
              onReset={reset}
              copied={copied}
              onCopy={copyTrxId}
            />
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>{t('payment.secureNote')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
