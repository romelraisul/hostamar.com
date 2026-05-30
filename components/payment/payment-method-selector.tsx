'use client';

import { CreditCard } from 'lucide-react';
import { PaymentMethod, PAYMENT_METHODS } from './types';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled: boolean;
}

export default function PaymentMethodSelector({ selectedMethod, onSelect, disabled }: PaymentMethodSelectorProps) {
  return (
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
            onClick={() => onSelect(key)}
            disabled={disabled}
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
  );
}
