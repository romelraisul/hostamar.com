'use client';
import { useEffect, useRef, useState } from 'react';
import { Tv, Radio, Volume2, VolumeX, Maximize2, RefreshCw } from 'lucide-react';
import Hls from 'hls.js';
import { registerTvSw, TV_LEVEL_KEY } from '@/lib/tv/useHlsSaveData';

type PlaylistItem = { id: string; title: string; url: string; source: string; position: number };

// Customer's personal TV — simplified player with their watch history
export default function CustomerTv() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [power, setPower] = useState(true);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const channels = playlist;
  const current = channels[currentIdx] || channels[0];

  const load = async () => {
    try {
      const [sRes, hRes, pRes] = await Promise.all([
        fetch('/api/tv/status', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/hls-url', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/playlist', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      setHlsUrl(sRes?.hlsUrl || hRes?.hlsUrl || null);
      if (pRes?.items?.length) setPlaylist(pRes.items.filter((i: any) => i.url));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); registerTvSw(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const isLive = hlsUrl && power;

  // HLS attach with slow-BD profile
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLive || !hlsUrl) return;

    const VP9_URL = 'https://vp9.hostamar.com/master.m3u8';
    let usingVp9 = false;
    const goVp9 = () => {
      if (usingVp9) return;
      usingVp9 = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      attach(VP9_URL);
    };

    const attach = (src: string) => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src; video.play().catch(() => {}); return;
      }
      if (!Hls.isSupported()) { setError('HLS not supported'); return; }
      if (hlsRef.current) hlsRef.current.destroy();
      let savedLevel = -1;
      try { savedLevel = Number(localStorage.getItem(TV_LEVEL_KEY) ?? '-1'); } catch {}
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: false,
        backBufferLength: 30, maxBufferLength: 30, maxMaxBufferLength: 60,
        maxBufferSize: 20 * 1000 * 1000, maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2, nudgeOffset: 0.1, nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25, liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10, liveDurationInfinity: false,
        startLevel: Number.isFinite(savedLevel) && savedLevel >= 0 ? savedLevel : -1,
        capLevelToPlayerSize: true, autoStartLoad: true, testBandwidth: true, progressive: false,
      });
      hls.loadSource(src); hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (!usingVp9) { goVp9(); return; }
        setError(`HLS ${data.details}`); hls.destroy();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
        try { localStorage.setItem(TV_LEVEL_KEY, String(d.level)); } catch {}
      });
      hlsRef.current = hls;
    };

    attach(hlsUrl);
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [isLive, hlsUrl, power]);

  const handleEnded = () => { if (channels.length > 0) setCurrentIdx((i) => (i + 1) % channels.length); };

  const changeChannel = (delta: number) => {
    setCurrentIdx((i) => (i + delta + channels.length) % channels.length);
  };

  const changeVolume = (delta: number) => {
    setVolume((v) => {
      const nv = Math.min(1, Math.max(0, v + delta));
      if (videoRef.current) videoRef.current.volume = nv;
      return nv;
    });
  };

  if (loading) return <div className="p-6 text-zinc-400">Loading your TV...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Tv className="w-5 h-5 text-emerald-400" /> My TV</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setPower((p) => !p)} className={`p-2 rounded-lg ${power ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
            <Tv className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={containerRef} className="relative rounded-xl bg-black border border-zinc-800 overflow-hidden aspect-video">
        {!power ? (
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">TV is off</p>
          </div>
        ) : (
          <video ref={videoRef} controls={false} autoPlay muted={muted} playsInline onEnded={handleEnded} className="w-full h-full object-contain" poster="/og-image.png" />
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => changeChannel(-1)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">CH -</button>
            <span className="text-xs mono">{currentIdx + 1}/{channels.length}</span>
            <button onClick={() => changeChannel(1)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">CH +</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMuted((m) => !m)} className="p-1 rounded bg-white/10">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${muted ? 0 : volume * 100}%` }} />
            </div>
            <button onClick={() => containerRef.current?.requestFullscreen()} className="p-1 rounded bg-white/10">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* LIVE badge */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
      </div>

      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {/* Channel list */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-400" /> Channels</h3>
        </div>
        <div className="max-h-[200px] overflow-auto divide-y divide-zinc-800">
          {channels.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">No channels yet. Admin needs to seed channels.</div>
          ) : (
            channels.slice(0, 20).map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => setCurrentIdx(idx)}
                className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-white/[0.04] ${idx === currentIdx ? 'bg-emerald-500/10' : ''}`}
              >
                <span className="text-xs w-6 h-6 rounded bg-white/10 flex items-center justify-center">{idx + 1}</span>
                <span className="text-sm truncate">{ch.title}</span>
                {idx === currentIdx && <Radio className="w-3 h-3 text-emerald-400 ml-auto" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
