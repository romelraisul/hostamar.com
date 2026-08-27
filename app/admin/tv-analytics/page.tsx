'use client';
import { useEffect, useState, useCallback } from 'react';
import { Tv, Eye, TrendingUp, DollarSign, Globe, Activity, RefreshCw, Play, Users, Zap, Link as LinkIcon } from 'lucide-react';

type Analytics = {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  topChannels: { id: string; name: string; views: number; country: string; category: string }[];
  apiCalls: number;
  externalEmbeds: number;
  liveNow: { platform: string; title: string; viewers: number } | null;
  cpm: number;
};

const DEFAULT_CPM = 2.5;

export default function TvAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fbUrl, setFbUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tv-analytics', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const setFbLive = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/tv-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ facebookLiveUrl: fbUrl }),
      });
      if (!res.ok) throw new Error('Failed');
      setMsg('Facebook LIVE set — TV will auto-switch in 60s');
      setFbUrl('');
      load();
    } catch { setMsg('Error saving'); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-zinc-400">Loading analytics...</div>;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const earnings = (data.totalViews / 1000) * data.cpm;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tv className="w-6 h-6 text-emerald-400" /> TV Analytics</h1>
        <button onClick={load} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1"><Eye className="w-4 h-4" /> Today</div>
          <div className="text-2xl font-bold">{data.todayViews.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1"><TrendingUp className="w-4 h-4" /> 7 Days</div>
          <div className="text-2xl font-bold">{data.weekViews.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1"><Activity className="w-4 h-4" /> 30 Days</div>
          <div className="text-2xl font-bold">{data.monthViews.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1"><DollarSign className="w-4 h-4" /> Est. Earnings</div>
          <div className="text-2xl font-bold text-emerald-400">${earnings.toFixed(2)}</div>
          <div className="text-xs text-zinc-500">@ ${data.cpm}/1000 views</div>
        </div>
      </div>

      {/* Live status + Facebook */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-red-400" /> Live Now</h3>
          {data.liveNow ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div>
                <div className="font-medium">{data.liveNow.title}</div>
                <div className="text-sm text-zinc-400">{data.liveNow.platform} • {data.liveNow.viewers} viewers</div>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500">Not live. Set Facebook LIVE below.</div>
          )}
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-blue-400" /> Set Facebook LIVE</h3>
          <div className="flex gap-2">
            <input
              value={fbUrl}
              onChange={(e) => setFbUrl(e.target.value)}
              placeholder="https://facebook.com/romelraisul/videos/1234567890/"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
            />
            <button onClick={setFbLive} disabled={saving || !fbUrl} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-sm font-medium">
              {saving ? '...' : 'Set LIVE'}
            </button>
          </div>
          {msg && <p className="text-xs text-emerald-400 mt-2">{msg}</p>}
          <p className="text-xs text-zinc-500 mt-2">Paste your Facebook live video URL. TV auto-switches in 60s with Hostamar branding + ads.</p>
        </div>
      </div>

      {/* Top channels */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> Top Channels</h3>
          <span className="text-xs text-zinc-500">{data.apiCalls} API calls • {data.externalEmbeds} external embeds</span>
        </div>
        {data.topChannels.length === 0 ? (
          <div className="p-6 text-center text-zinc-500">No views yet. Run <code className="bg-zinc-800 px-1 rounded">node scripts/fetch-channels.mjs</code> to seed channels.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {data.topChannels.map((ch, idx) => (
              <div key={ch.id} className="px-4 py-3 flex items-center gap-4">
                <span className="text-zinc-500 text-sm w-6">{idx + 1}</span>
                <Globe className="w-4 h-4 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{ch.name}</div>
                  <div className="text-xs text-zinc-500">{ch.country} • {ch.category}</div>
                </div>
                <div className="text-sm font-medium text-emerald-400">{ch.views.toLocaleString()} views</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
