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

export default function TvDashboard() {
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
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/tv/stream/start', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Stream started → ${data.destinations?.join(', ')}. Run the ffmpeg command in the tv-station container.`);
      } else {
        setError(data.message || data.error || 'Failed to start stream');
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const stopStream = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tv/stream/stop', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessage('Stream stopped.');
      else setError(data.message || data.error || 'Failed to stop');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const generateNow = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      // Direct generate (admin) — bypasses cron for manual top-up
      const res = await fetch('/api/tv/generate', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessage(`Generated video: ${data.topic || data.videoId}`);
      else setError(data.message || data.error || 'Generation failed');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const live = status?.isLive ?? false;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Tv className="w-7 h-7 text-emerald-400" /> {status?.channelName || 'Hostamar TV'}
            </h1>
            <p className="text-zinc-400 mt-1">24/7 AI TV Station — auto-generated content, streamed live.</p>
          </div>
          <div
            className={
              'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ' +
              (live
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400')
            }
          >
            <Radio className={'w-4 h-4 ' + (live ? 'animate-pulse' : '')} />
            {live ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={startStream}
            disabled={busy || live}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 p-5 text-left transition flex items-center gap-3"
          >
            <Play className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="font-semibold">Start Stream</div>
              <div className="text-xs text-zinc-500">Go live to all destinations</div>
            </div>
          </button>
          <button
            onClick={stopStream}
            disabled={busy || !live}
            className="rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 p-5 text-left transition flex items-center gap-3"
          >
            <Square className="w-6 h-6 text-red-400" />
            <div>
              <div className="font-semibold">Stop Stream</div>
              <div className="text-xs text-zinc-500">Take the channel offline</div>
            </div>
          </button>
          <button
            onClick={generateNow}
            disabled={busy}
            className="rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-40 p-5 text-left transition flex items-center gap-3"
          >
            <Zap className="w-6 h-6 text-blue-400" />
            <div>
              <div className="font-semibold">Generate Video</div>
              <div className="text-xs text-zinc-500">New AI video from trending topic</div>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-zinc-400 text-sm mb-1">Playlist</div>
            <div className="text-2xl font-bold">{status?.playlistLength ?? 0} videos</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-zinc-400 text-sm mb-1">Destinations</div>
            <div className="text-2xl font-bold">{status?.destinations?.filter((d) => d.isActive).length ?? 0} active</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-zinc-400 text-sm mb-1">Auto-Generate</div>
            <div className="text-2xl font-bold">{status?.autoGenerateEnabled ? 'ON' : 'OFF'}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="text-zinc-400 text-sm mb-1">Live Since</div>
            <div className="text-lg font-bold">{status?.liveSince ? new Date(status.liveSince).toLocaleTimeString() : '—'}</div>
          </div>
        </div>

        {/* Destinations */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold">Stream Destinations</h2>
          </div>
          {(status?.destinations?.length ?? 0) === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">
              No destinations configured. Add YouTube/Facebook/Twitch RTMP keys via /api/tv/destinations or env vars.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {status!.destinations.map((d, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white">{d.platform}</span>
                    {d.label && <span className="ml-2 text-xs text-zinc-500">{d.label}</span>}
                  </div>
                  <span
                    className={
                      'text-xs px-2 py-1 rounded-full ' +
                      (d.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400')
                    }
                  >
                    {d.isActive ? 'active' : 'inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playlist */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold">Playlist ({playlist.length})</h2>
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800 transition" title="Refresh">
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          {playlist.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">
              Playlist is empty. Generate videos to fill it.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50 max-h-96 overflow-y-auto">
              {playlist.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.source} · #{item.position}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
