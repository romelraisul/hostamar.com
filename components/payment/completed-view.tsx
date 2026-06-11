'use client';

import { CheckCircle2 } from 'lucide-react';
import { PaymentState } from './types';

interface CompletedViewProps {
  state: PaymentState;
}

export default function CompletedView({ state }: CompletedViewProps) {
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
