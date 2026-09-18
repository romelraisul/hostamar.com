'use client';

import { useEffect, useState } from 'react';
import { Users, Copy, Check, Share2, TrendingUp, Wallet, Clock, Link2 } from 'lucide-react';

type AffiliateData = {
  code: string;
  referralLink: string;
  commissionRate: number;
  referralCount: number;
  totalEarnings: number;
  pending: number;
  paid: number;
  commissions: { id: string; amount: number; status: string; sourceType: string; createdAt: string }[];
};

export default function AffiliateDashboard() {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/affiliate', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load affiliate data');
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error || 'No data'}</p>
          <p className="text-zinc-500 text-sm">Please log in to view your affiliate dashboard.</p>
        </div>
      </div>
    );
  }

  const ratePct = Math.round(data.commissionRate * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Share2 className="w-7 h-7 text-emerald-400" /> Affiliate Program
          </h1>
          <p className="text-zinc-400 mt-1">
            Earn <span className="text-emerald-400 font-semibold">{ratePct}% recurring commission</span> on every payment from users you refer.
          </p>
        </div>

        {/* Referral link card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold">Your Referral Link</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <code className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-emerald-300 font-mono break-all">
              {data.referralLink}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Share this link. When someone signs up and pays, you earn {ratePct}% of every payment — forever.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Users className="w-4 h-4" /> Referrals
            </div>
            <div className="text-2xl font-bold">{data.referralCount}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" /> Total Earnings
            </div>
            <div className="text-2xl font-bold text-emerald-400">৳{data.totalEarnings.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Clock className="w-4 h-4" /> Pending
            </div>
            <div className="text-2xl font-bold text-amber-400">৳{data.pending.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
              <Wallet className="w-4 h-4" /> Paid Out
            </div>
            <div className="text-2xl font-bold text-white">৳{data.paid.toLocaleString()}</div>
          </div>
        </div>

        {/* Commission history */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="font-semibold">Commission History</h2>
          </div>
          {data.commissions.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-500 text-sm">
              No commissions yet. Share your referral link to start earning!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Source</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Amount</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-6 py-3 text-sm text-zinc-300">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-zinc-400">{c.sourceType}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-emerald-400">৳{c.amount}</td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            'text-xs px-2 py-1 rounded-full ' +
                            (c.status === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300')
                          }
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
