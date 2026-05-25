'use client';

import { Phone } from 'lucide-react';

interface PhoneInputProps {
  phone: string;
  onChange: (phone: string) => void;
  disabled: boolean;
}

export default function PhoneInput({ phone, onChange, disabled }: PhoneInputProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-green-400" />
        ফোন নম্বর
        <span className="text-sm text-gray-500 font-normal ml-2">(Phone Number)</span>
      </h3>
      <input
        type="tel"
        value={phone}
        onChange={(e) => onChange(e.target.value)}
        placeholder="01XXXXXXXXX"
        disabled={disabled}
        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
      />
      <p className="text-xs text-gray-500 mt-2">
        Bangladesh mobile number (013, 015, 016, 017, 018, 019)
      </p>
    </div>
  );
}
