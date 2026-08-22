'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Smartphone, Loader2, CheckCircle2, Clock, AlertCircle, QrCode } from 'lucide-react';

type PersonalConfig = {
  enabled: boolean;
  numbers: { bkash: string | null; nagad: string | null; rocket: string | null };
  instructions: string;
};

type MethodKey = 'bkash' | 'nagad' | 'rocket';

const METHOD_META: Record<MethodKey, { label: string; color: string; bg: string; border: string }> = {
  bkash: { label: 'bKash', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  nagad: { label: 'Nagad', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  rocket: { label: 'Rocket', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
};

interface Props {
  amount?: number;
  plan?: string;
  credits?: number;
}

/**
 * Personal Send-Money payment panel (Phase 2).
 * Shows our personal bKash/Nagad/Rocket numbers + QR + Bangla instructions,
 * and a TrxID submission form wired to /api/payments/verify-manual.
 */
export default function PersonalPaymentPanel({ amount, plan, credits }: Props) {
  const [config, setConfig] = useState<PersonalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MethodKey | null>(null);
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [copiedNum, setCopiedNum] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; status?: string } | null>(null);

  useEffect(() => {
    fetch('/api/payments/personal-config', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  const copyNumber = (num: string, key: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(key);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  const handleSubmit = async () => {
    if (!selected || !senderNumber || !trxId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/payments/verify-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selected.toUpperCase(),
          amount: amount || 0,
          senderNumber,
          trxId,
          plan: plan || null,
          credits: credits || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: data.message, status: data.status });
        if (data.status === 'VERIFIED') {
          setTrxId('');
          setSenderNumber('');
        }
      } else {
        setResult({ ok: false, message: data.message || data.error || 'Submission failed' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading payment options...
      </div>
    );
  }

  if (!config || !config.enabled) {
    return null; // personal payments disabled — hide panel
  }

  const activeNumber = selected ? config.numbers[selected] : null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Send Money (Personal)</h3>
        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          No merchant needed
        </span>
      </div>

      <p className="text-sm text-zinc-400">{config.instructions}</p>

      {/* 3 method cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(METHOD_META) as MethodKey[]).map((key) => {
          const num = config.numbers[key];
          if (!num) return null;
          const meta = METHOD_META[key];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`text-left rounded-xl border p-4 transition ${meta.bg} ${
                isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : meta.border
              } hover:border-emerald-500/60`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-white">{num}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyNumber(num, key);
                  }}
                  className="p-1 rounded hover:bg-zinc-800"
                  title="Copy number"
                >
                  {copiedNum === key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
                <QrCode className="w-3 h-3" /> Send Money only
              </div>
            </button>
          );
        })}
      </div>

      {/* Submission form */}
      {selected && activeNumber && (
        <div className="space-y-3 border-t border-zinc-800 pt-4">
          <div className="text-sm text-zinc-300">
            <span className="text-zinc-500">ধাপ ১:</span> এই নম্বরে Send Money করুন —{' '}
            <span className="font-mono text-emerald-400">{activeNumber}</span>
            {amount ? <> — পরিমাণ <span className="text-white font-semibold">৳{amount}</span></> : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">আপনার নম্বর (Sender Number)</label>
              <input
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">TrxID (SMS-এ পাবেন)</label>
              <input
                value={trxId}
                onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                placeholder="9HK3X2AB1C"
                maxLength={10}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !senderNumber || !trxId}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {submitting ? 'Verifying...' : 'Submit TrxID'}
          </button>

          {result && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                result.ok
                  ? result.status === 'VERIFIED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {result.ok ? (
                result.status === 'VERIFIED' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                )
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
