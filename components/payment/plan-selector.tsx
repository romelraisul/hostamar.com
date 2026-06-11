'use client';

import { Shield } from 'lucide-react';
import { Plan, PLANS } from './types';

interface PlanSelectorProps {
  selectedPlan: Plan | null;
  onSelect: (plan: Plan) => void;
  disabled: boolean;
}

export default function PlanSelector({ selectedPlan, onSelect, disabled }: PlanSelectorProps) {
  return (
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
            onClick={() => onSelect(key)}
            disabled={disabled}
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
  );
}
