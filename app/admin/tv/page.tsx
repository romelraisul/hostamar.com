'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tv, Play, Square, Radio, RefreshCw, Loader2, Plus, Globe, Zap } from 'lucide-react';

type TvStatus = {
  isLive: boolean;
  liveSince: string | null;
  channelName: string;
  playlistLength: number;
  destinations: { platform: string; label: string | null; isActive: boolean; lastError: string | null }[];
  autoGenerateEnabled: boolean;
};

type PlaylistItem = { id: string; title: string; url: string; source: string; position: number };

export default function AdminTvControls() {
  const [status, setStatus] = useState<TvStatus | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch('/api/tv/status', { credentials: 'include' }),
        fetch('/api/tv/playlist', { credentials: 'include' }),
      ]);
      if (sRes.ok) setStatus(await sRes.json());
      if (pRes.ok) {
        const p = await pRes.json();
        setPlaylist(p.items || []);
      }
    } catch {
      /* keep last state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const startStream = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/tv/stream/start', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessage(`Stream started → ${data.destinations?.join(', ')}. Run the ffmpeg command in the tv-station container.`);
      else setError(data.message || data.error || 'Failed to start stream');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const stopStream = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/tv/stream/stop', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessage('Stream stopped.');
      else setError(data.message || data.error || 'Failed to stop');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const generateNow = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/tv/generate', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessage(`Generated video: ${data.topic || data.videoId}`);
      else setError(data.message || data.error || 'Generation failed');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-zinc-400">Loading TV controls...</div>;

  const isLive = status?.isLive;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-emerald-400" /> TV Station Controls
        </h1>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${isLive ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
          <Radio className={`w-4 h-4 ${isLive ? 'animate-pulse' : ''}`} />
          {isLive ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button onClick={startStream} disabled={busy || isLive} className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 font-semibold flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} Start Stream
        </button>
        <button onClick={stopStream} disabled={busy || !isLive} className="p-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-500 font-semibold flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />} Stop Stream
        </button>
        <button onClick={generateNow} disabled={busy} className="p-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 font-semibold flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Generate Video
        </button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Stream Status</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-400">Channel</dt><dd>{status?.channelName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-400">Playlist</dt><dd>{status?.playlistLength || 0} items</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-400">Auto-generate</dt><dd>{status?.autoGenerateEnabled ? 'ON' : 'OFF'}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-400">Live since</dt><dd>{status?.liveSince ? new Date(status.liveSince).toLocaleString() : '—'}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" /> Destinations</h3>
          {status?.destinations?.length ? (
            <div className="space-y-2">
              {status.destinations.map((d) => (
                <div key={d.platform} className="flex items-center justify-between text-sm">
                  <span>{d.label || d.platform}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {d.isActive ? 'active' : 'off'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No destinations configured.</p>
          )}
        </div>
      </div>

      {/* Playlist */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold">Playlist ({playlist.length})</h3>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800"><RefreshCw className="w-4 h-4 text-zinc-400" /></button>
        </div>
        <div className="divide-y divide-zinc-800 max-h-[300px] overflow-auto">
          {playlist.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">No videos in playlist. Click "Generate Video" to add content.</div>
          ) : (
            playlist.slice(0, 15).map((item, idx) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-4">
                <span className="text-zinc-500 text-sm w-6">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{item.title}</div>
                  <div className="text-xs text-zinc-500">{item.source}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
