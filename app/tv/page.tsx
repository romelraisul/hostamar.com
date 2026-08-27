'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Tv, Radio, Volume2, VolumeX, Power, Maximize2, RefreshCw, ListVideo, MonitorUp } from 'lucide-react';
import Hls from 'hls.js';
import { registerTvSw, TV_LEVEL_KEY } from '@/lib/tv/useHlsSaveData';

type TvStatus = {
  isLive: boolean;
  hlsUrl: string | null;
  channelName: string;
  playlistLength: number;
  hlsReachable: boolean;
  agentLastSeen: string | null;
  destinations?: { platform: string; label: string | null; isActive: boolean; lastError: string | null }[];
};

type PlaylistItem = { id: string; title: string; url: string; source: string; position: number };

// Bangladesh IPTV fallback — from iptv-org bd.m3u (free-to-air, update via /scripts/fetch-channels.js)
const BD_CHANNELS: PlaylistItem[] = [
  { id: 'bd1', title: 'Somoy TV', url: 'https://live1.somoynews.tv/live/somoynews.stream/chunklist.m3u8', source: 'iptv', position: 1 },
  { id: 'bd2', title: 'Jamuna TV', url: 'https://live.jamuna.tv/live/jamunatv.stream/playlist.m3u8', source: 'iptv', position: 2 },
  { id: 'bd3', title: 'Channel i', url: 'https://live1.channeli.com.bd/live/channeli.stream/playlist.m3u8', source: 'iptv', position: 3 },
  { id: 'bd4', title: 'Ekattor TV', url: 'https://live.ekattor.tv/live/ekattor.stream/playlist.m3u8', source: 'iptv', position: 4 },
  { id: 'bd5', title: 'Independent TV', url: 'https://live.independent-bd.com/live/independent.stream/playlist.m3u8', source: 'iptv', position: 5 },
  { id: 'bd6', title: 'DBC News', url: 'https://live.dbcnews.tv/live/dbcnews.stream/playlist.m3u8', source: 'iptv', position: 6 },
  { id: 'bd7', title: 'ATN Bangla', url: 'https://live.atnbangla.tv/live/atnbangla.stream/playlist.m3u8', source: 'iptv', position: 7 },
  { id: 'bd8', title: 'MY TV', url: 'https://live.mytvbd.tv/live/mytv.stream/playlist.m3u8', source: 'iptv', position: 8 },
  { id: 'bd9', title: 'RTV', url: 'https://live.rtv.com.bd/live/rtv.stream/playlist.m3u8', source: 'iptv', position: 9 },
  { id: 'bd10', title: 'NTV', url: 'https://live.ntvbd.com/live/ntv.stream/playlist.m3u8', source: 'iptv', position: 10 },
];

type SourceMode = 'iptv' | 'youtube' | 'facebook';

export default function TvPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [status, setStatus] = useState<TvStatus | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [power, setPower] = useState(true);
  const [source, setSource] = useState<SourceMode>('iptv');
  const [osd, setOsd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [youtubeLiveId, setYoutubeLiveId] = useState<string | null>(null);
  const osdTimer = useRef<NodeJS.Timeout | null>(null);

  const channels = playlist.length > 0 ? playlist : BD_CHANNELS;
  const current = channels[currentIdx] || channels[0];

  const showOSD = useCallback((text: string) => {
    setOsd(text);
    if (osdTimer.current) clearTimeout(osdTimer.current);
    osdTimer.current = setTimeout(() => setOsd(null), 3000);
  }, []);

  const changeChannel = useCallback((delta: number) => {
    setCurrentIdx((i) => {
      const n = (i + delta + channels.length) % channels.length;
      showOSD(`CH ${n + 1} — ${channels[n].title}`);
      return n;
    });
  }, [channels, showOSD]);

  const jumpChannel = useCallback((num: number) => {
    const idx = num === 0 ? 9 : num - 1;
    if (idx < channels.length) {
      setCurrentIdx(idx);
      showOSD(`CH ${idx + 1} — ${channels[idx].title}`);
    }
  }, [channels, showOSD]);

  const changeVolume = useCallback((delta: number) => {
    setVolume((v) => {
      const nv = Math.min(1, Math.max(0, v + delta));
      if (videoRef.current) videoRef.current.volume = nv;
      showOSD(`VOL ${Math.round(nv * 100)}%`);
      return nv;
    });
  }, [showOSD]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      if (videoRef.current) videoRef.current.muted = nm;
      showOSD(nm ? 'MUTE' : `VOL ${Math.round(volume * 100)}%`);
      return nm;
    });
  }, [volume, showOSD]);

  const togglePower = () => {
    setPower((p) => {
      const np = !p;
      showOSD(np ? 'POWER ON' : 'STANDBY');
      return np;
    });
  };

  const toggleSource = () => {
    setSource((s) => {
      const ns: SourceMode = s === 'iptv' ? 'youtube' : s === 'youtube' ? 'facebook' : 'iptv';
      showOSD(ns === 'iptv' ? 'SOURCE: IPTV' : ns === 'youtube' ? 'SOURCE: YouTube LIVE' : 'SOURCE: Facebook LIVE');
      return ns;
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); changeChannel(-1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeChannel(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); changeVolume(-0.07); }
      if (e.key === 'ArrowRight') { e.preventDefault(); changeVolume(0.07); }
      if (e.key.toLowerCase() === 'm') toggleMute();
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
      if (/^[0-9]$/.test(e.key)) jumpChannel(parseInt(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeChannel, changeVolume, toggleMute, jumpChannel]);

  // Keep volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted, currentIdx, source]);

  // Load live status + playlist
  const load = async () => {
    try {
      const [sRes, hRes, pRes] = await Promise.all([
        fetch('/api/tv/status', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/hls-url', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/playlist', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      if (sRes) setStatus(sRes);
      const resolved = sRes?.hlsUrl || hRes?.hlsUrl || null;
      setHlsUrl(resolved);
      if (pRes?.items?.length) setPlaylist(pRes.items.filter((i: any) => i.url));
      // YouTube live id comes from status destinations (platform=youtube) if present
      const yt = sRes?.destinations?.find?.((d: any) => d.platform === 'youtube' && d.isActive);
      if (yt?.label) setYoutubeLiveId(yt.label);
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); registerTvSw(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const isLive = status?.isLive && hlsUrl && status?.hlsReachable !== false;

  // HLS attach when live & source iptv, power on.
  // Slow-BD profile: deep buffer + remembered start level + VP9 fallback on
  // decode failure (see lib/tv/useHlsSaveData.ts).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !power || source !== 'iptv') return;
    const url = isLive && hlsUrl ? hlsUrl : current?.url;
    if (!url) return;

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
        video.src = src;
        video.play().catch(() => {});
        return;
      }
      if (!Hls.isSupported()) { setError('HLS not supported'); return; }
      if (hlsRef.current) hlsRef.current.destroy();
      let savedLevel = -1;
      try { savedLevel = Number(localStorage.getItem(TV_LEVEL_KEY) ?? '-1'); } catch {}
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 20 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: false,
        startLevel: Number.isFinite(savedLevel) && savedLevel >= 0 ? savedLevel : -1,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        testBandwidth: true,
        progressive: false,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (!usingVp9) { goVp9(); return; }
        setError(`HLS ${data.details}`);
        hls.destroy();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
        try { localStorage.setItem(TV_LEVEL_KEY, String(d.level)); } catch {}
      });
      const onMediaErr = () => { if (!usingVp9) goVp9(); };
      video.addEventListener('error', onMediaErr);
      hlsRef.current = hls;
    };

    attach(url);
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [isLive, hlsUrl, current, power, source]);

  // Fallback sequential when not live and no HLS
  const handleEnded = () => { if (!isLive && source === 'iptv') setCurrentIdx((i) => (i + 1) % channels.length); };

  return (
    <div className="min-h-screen bg-[#080a0c] text-white selection:bg-emerald-500/30">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Instrument+Serif&display=swap');
        .mono{font-family:"JetBrains Mono",monospace}.serif{font-family:"Instrument Serif",serif}
        @keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0.3}} .live-dot{animation:blink 1.2s infinite}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}} .ticker{animation:ticker 22s linear infinite}`}</style>

      {/* Header */}
      <header className="h-[56px] border-b border-white/[0.06] bg-black/70 backdrop-blur-xl sticky top-0 z-40 flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center"><span className="font-black text-black text-[13px]">H</span></div>
          <div>
            <div className="flex items-center gap-2"><span className="serif text-[18px] tracking-tight">Hostamar TV</span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff3b30] text-white text-[10px] font-bold tracking-widest"><span className="w-1.5 h-1.5 bg-white rounded-full live-dot" /> LIVE</span></div>
            <div className="mono text-[10px] text-zinc-500 -mt-0.5 hidden md:block">hostamar.com/tv • CINEMATIC IPTV</div>
          </div>
          <div className="hidden lg:flex items-center gap-2 ml-6 pl-6 border-l border-white/10">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-zinc-600'}`} />
            <span className="mono text-[11px] text-zinc-400 uppercase tracking-widest">{source === 'iptv' ? `IPTV • CH ${currentIdx + 1}` : source === 'youtube' ? 'YouTube LIVE • Branded' : 'Facebook LIVE • Branded'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline mono text-[11px] px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">OLED • 4K • HDR</span>
          <button onClick={load} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-3 md:px-6 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 md:gap-6">
        {/* TV */}
        <div ref={containerRef} className="relative rounded-[18px] md:rounded-[22px] bg-[#0f1113] border border-white/[0.07] p-2 md:p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="relative rounded-[14px] overflow-hidden bg-black aspect-video">
            {!power ? (
              <div className="absolute inset-0 bg-[#060708] flex items-center justify-center">
                <div className="text-center"><Power className="w-10 h-10 text-zinc-700 mx-auto mb-2" /><p className="mono text-xs text-zinc-600">STANDBY — Press POWER on remote</p></div>
              </div>
            ) : source !== 'iptv' ? (
              <div className="absolute inset-0 bg-black">
                {youtubeLiveId || source === 'youtube' ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeLiveId || 'dQw4w9WgXcQ'}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    title="Hostamar Live"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900"><p className="mono text-sm text-zinc-500">Connect Facebook Live in /admin/tv</p></div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-white text-black px-3 py-1 rounded-full text-xs font-bold"><Tv className="w-4 h-4" /> hostamar.com/tv — LIVE</div>
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#0e7c3a] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">Your Ad — 300×90 — bKash • Nagad • Hostamar</div>
              </div>
            ) : (
              <video ref={videoRef} controls={false} autoPlay muted={muted} playsInline onEnded={handleEnded} className="w-full h-full object-contain" poster="/og-image.png" />
            )}

            {/* OSD */}
            {osd && power && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-4 py-1.5 rounded-full border border-white/10 mono text-xs font-bold tracking-widest">{osd}</div>
            )}
            {/* LIVE badge */}
            {isLive && power && source === 'iptv' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full"><span className="w-2 h-2 bg-white rounded-full live-dot" /> LIVE</div>
            )}
            {/* Volume bar */}
            {osd?.startsWith('VOL') && (
              <div className="absolute bottom-10 left-4 right-4 md:left-6 md:right-auto md:w-[280px] bg-black/60 backdrop-blur rounded-full px-3 py-2 flex items-center gap-3 border border-white/10">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-white" style={{ width: `${muted ? 0 : volume * 100}%` }} /></div>
                <span className="mono text-xs w-10 text-right">{muted ? 'MUTE' : Math.round(volume * 100) + '%'}</span>
              </div>
            )}
            {/* Ticker */}
            <div className="absolute bottom-0 left-0 right-0 h-[28px] bg-[#0e7c3a] flex items-center overflow-hidden border-t border-white/10">
              <div className="ticker whitespace-nowrap mono text-xs font-semibold text-white flex gap-8 px-4">
                <span>Hostamar TV — hostamar.com/tv — Sponsored by Hostamar • 6000 credits FREE • bKash / Nagad / Rocket —</span>
                <span>Hostamar TV — hostamar.com/tv — Sponsored by Hostamar • 6000 credits FREE • bKash / Nagad / Rocket —</span>
              </div>
            </div>
            {/* Scanline */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.015)_50%)] bg-[length:100%_3px] opacity-40" />
          </div>

          {/* TV controls bar */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-2 mono text-[10px] text-zinc-500"><div className={`w-1.5 h-1.5 rounded-full ${power ? 'bg-emerald-400' : 'bg-red-500'} shadow-[0_0_6px_currentColor]`} /> {power ? 'POWER ON' : 'STANDBY'} • VOL {Math.round(volume * 100)}%</div>
            <div className="flex items-center gap-1">
              <button onClick={togglePower} className={`p-1.5 rounded-lg ${power ? 'bg-white text-black' : 'bg-red-600 text-white'}`} title="Power"><Power className="w-3.5 h-3.5" /></button>
              <button onClick={toggleSource} className="px-2 py-1 rounded-lg bg-white/10 text-xs mono">SOURCE</button>
              <button onClick={toggleFullscreen} className="p-1.5 rounded-lg bg-white/10" title="Fullscreen"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {error && <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        </div>

        {/* Right: Channel list + Remote */}
        <div className="space-y-4">
          {/* Channels */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0f1113] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="mono text-xs font-bold tracking-widest text-zinc-300 flex items-center gap-2"><ListVideo className="w-4 h-4 text-emerald-400" /> CHANNELS • {channels.length}</h3>
              <span className="mono text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300">BD • FREE-TO-AIR</span>
            </div>
            <div className="max-h-[260px] overflow-auto divide-y divide-white/[0.04] scroll-thin">
              {channels.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => { setCurrentIdx(idx); showOSD(`CH ${idx + 1} — ${ch.title}`); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-white/[0.04] transition ${idx === currentIdx ? 'bg-emerald-500/10' : ''}`}
                >
                  <span className={`mono text-xs w-7 h-7 rounded-lg flex items-center justify-center border ${idx === currentIdx ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white/[0.06] border-white/10 text-zinc-400'}`}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate text-white">{ch.title}</div>
                    <div className="mono text-[10px] text-zinc-500 uppercase">{ch.source} • {isLive && idx === 0 ? 'LIVE' : 'IPTV'}</div>
                  </div>
                  {idx === currentIdx && <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 bg-black/30 border-t border-white/[0.06] flex items-center justify-between mono text-[10px] text-zinc-500">
              <span>Up/Down = Channel • Left/Right = Volume</span>
              <span className="hidden sm:inline">0-9 jump • M mute • F fullscreen</span>
            </div>
          </div>

          {/* Remote */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0e10] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="mono text-xs font-bold tracking-widest text-zinc-400">REMOTE</h3>
              <span className="mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">INFRARED</span>
            </div>
            {/* Power + Source */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button onClick={togglePower} className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${power ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}><Power className="w-4 h-4" /> POWER</button>
              <button onClick={toggleSource} className="h-10 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-1"><MonitorUp className="w-4 h-4" /> SOURCE</button>
              <button onClick={toggleMute} className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${muted ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-white'}`}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />} MUTE</button>
            </div>
            {/* CH / VOL */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-zinc-900 border border-white/5 p-2">
                <div className="mono text-[10px] text-zinc-500 text-center mb-1 tracking-widest">CHANNEL</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => changeChannel(-1)} className="h-9 rounded-lg bg-white text-black mono text-xs font-bold">CH +</button>
                  <button onClick={() => changeChannel(1)} className="h-9 rounded-lg bg-zinc-800 text-white mono text-xs font-bold">CH −</button>
                </div>
              </div>
              <div className="rounded-xl bg-zinc-900 border border-white/5 p-2">
                <div className="mono text-[10px] text-zinc-500 text-center mb-1 tracking-widest">VOLUME</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => changeVolume(0.08)} className="h-9 rounded-lg bg-white text-black mono text-xs font-bold">VOL +</button>
                  <button onClick={() => changeVolume(-0.08)} className="h-9 rounded-lg bg-zinc-800 text-white mono text-xs font-bold">VOL −</button>
                </div>
              </div>
            </div>
            {/* Numpad */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <button key={n} onClick={() => jumpChannel(n)} className="h-9 rounded-xl bg-zinc-900 border border-white/[0.06] mono text-sm font-bold hover:bg-white hover:text-black transition">{n}</button>
              ))}
              <button onClick={() => jumpChannel(0)} className="h-9 rounded-xl bg-zinc-900 border border-white/[0.06] mono text-sm font-bold hover:bg-white hover:text-black">0</button>
              <button onClick={toggleFullscreen} className="h-9 rounded-xl bg-emerald-600 text-white mono text-xs font-bold flex items-center justify-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> FULL</button>
              <button onClick={load} className="h-9 rounded-xl bg-zinc-800 text-white mono text-xs font-bold">REFRESH</button>
            </div>
            <p className="mono text-[10px] text-zinc-600 text-center">hostamar.com/tv • Keyboard: ↑↓ CH • ←→ VOL • M • F • 0-9</p>
          </div>

          {/* Ad slot */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mono text-[10px] tracking-widest text-emerald-300 mb-2">SPONSORED</div>
            <div className="rounded-xl bg-white text-black p-3 text-center">
              <div className="text-sm font-bold">Hostamar — 6000 credits FREE</div>
              <div className="text-xs text-zinc-600">bKash / Nagad / Rocket • No dollar card</div>
              <a href="/pricing" className="mt-2 inline-block px-4 py-1.5 rounded-full bg-[#0e7c3a] text-white text-xs font-bold">Get Started</a>
            </div>
          </div>

          {/* Branded Live note */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 mono text-[11px] leading-relaxed text-zinc-400">
            <span className="text-white font-bold">How it works:</span> Vercel kills streams after 10s → your PC (port 3001) via Cloudflare Tunnel tv.hostamar.com proxies HLS to bypass CORS. Viewers stay on <span className="text-emerald-400">hostamar.com/tv</span> with our ads even when you go Live on YouTube/Facebook — auto SOURCE switches to branded LIVE.
            <div className="mt-2 text-[10px]">IPTV: <span className="text-zinc-300">iptv-org/iptv countries/bd.m3u 8000+ free-to-air</span> — parse via <span className="text-zinc-300">scripts/fetch-channels.js</span> on YOUR PC.</div>
          </div>
        </div>
      </main>

      <p className="text-center mono text-[10px] text-zinc-600 py-6">© {new Date().getFullYear()} Hostamar — hostamar.com/tv • TV runs from your PC via Cloudflare Tunnel • Vercel rewrite /tv → https://tv.hostamar.com</p>
    </div>
  );
}
