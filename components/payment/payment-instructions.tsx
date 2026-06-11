'use client';

import { Loader2, CheckCircle2, Check, Copy, Shield } from 'lucide-react';
import { PaymentState, PAYMENT_METHODS } from './types';

interface PaymentInstructionsProps {
  state: PaymentState;
  onVerify: () => void;
  onReset: () => void;
  copied: boolean;
  onCopy: () => void;
}

export default function PaymentInstructions({ state, onVerify, onReset, copied, onCopy }: PaymentInstructionsProps) {
  if (state.status !== 'created' || !state.instructions) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-gray-400">পেমেন্ট নির্দেশনা এখানে দেখাবে</h3>
        <p className="text-sm text-gray-600">
          Payment instructions will appear here after you create a payment order.
        </p>
      </div>
    );
  }

  return (
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
            onClick={onCopy}
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
        onClick={onVerify}
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

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full py-3 mt-3 text-gray-400 hover:text-white transition text-sm"
      >
        Cancel / বাতিল করুন
      </button>
    </div>
  );
}
