'use client';

import { useEffect, useRef, useState } from 'react';
import { Tv, Radio, PlayCircle, RefreshCw, ListVideo } from 'lucide-react';
import Hls from 'hls.js';
import { registerTvSw, TV_LEVEL_KEY } from '@/lib/tv/useHlsSaveData';

type TvStatus = {
  isLive: boolean;
  hlsUrl: string | null;
  rtmpUrl: string;
  channelName: string;
  playlistLength: number;
  hlsReachable: boolean;
  tunnelConfigured: boolean;
  agentLastSeen: string | null;
  destinations: any[];
};

type PlaylistItem = { id: string; title: string; url: string; source: string; position: number };

export default function TvPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<TvStatus | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [variant, setVariant] = useState<'h264' | 'vp9'>('h264');
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [sRes, hRes, pRes] = await Promise.all([
        fetch('/api/tv/status', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/hls-url', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/tv/playlist', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      if (sRes?.ok || sRes?.isLive !== undefined) setStatus(sRes.isLive !== undefined ? sRes : sRes);
      else if (sRes) setStatus(sRes);
      const resolvedHls = sRes?.hlsUrl || hRes?.hlsUrl || null;
      // Codec-free Chromium (no H.264 decoder) cannot play the H.264/AAC variant;
      // fall back to the VP9/Opus fMP4 variant on vp9.hostamar.com.
      const h264Ok = typeof MediaSource !== "undefined"
        && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"');
      const finalHls = resolvedHls && !h264Ok
        ? "https://vp9.hostamar.com/master.m3u8"
        : resolvedHls;
      setHlsUrl(finalHls);
      if (pRes?.items) setPlaylist(pRes.items.filter((i: any) => i.url));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isLive = status?.isLive && hlsUrl && status?.hlsReachable !== false;

  useEffect(() => {
    load();
    registerTvSw();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  // AUTO-REFRESH / SELF-HEAL on the client:
  //  - Refresh the playlist every 30 min so new ever-fresh videos appear.
  //  - If HLS stalls (video present but readyState < 2 for >15s) reload.
  //  - When tab regains focus, ping HLS; if 404/down, reload to recover.
  //  - Hard fallback: full reload every 30 min catches any wedged state.
  useEffect(() => {
    const video = videoRef.current;
    let stallCount = 0;
    const stallTimer = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      // Stalled: element exists, should be playing, but no data
      if (isLive && !v.paused && v.readyState < 2) {
        stallCount += 1;
        if (stallCount >= 3) {
          console.warn('[tv] HLS stall detected, reloading');
          window.location.reload();
        }
      } else {
        stallCount = 0;
      }
    }, 5000);

    const refreshTimer = setTimeout(() => {
      window.location.reload();
    }, 30 * 60 * 1000);

    const onVisible = () => {
      if (document.hidden) return;
      fetch('/api/tv/hls-url', { cache: 'no-store' })
        .then((r) => { if (!r.ok) window.location.reload(); })
        .catch(() => window.location.reload());
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(stallTimer);
      clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLive]);

  // HLS player when live. H.264 variant first; on decode failure some builds
  // claim support but can't decode (error 4) — switch to VP9 variant, which
  // remounts the <video> element (key=variant) so MSE state is clean.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isLive || !hlsUrl) return;

    const VP9_URL = "https://vp9.hostamar.com/master.m3u8";
    const source = variant === "vp9" ? VP9_URL : hlsUrl;
    const goVp9 = () => setVariant((v) => (v === "h264" ? "vp9" : v));

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      // Slow-net profile: deep buffer + remembered start level (see
      // lib/tv/useHlsSaveData.ts — config must be set at construction).
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
      try { localStorage.setItem(TV_LEVEL_KEY, '-1'); } catch {}
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (variant === "h264") { goVp9(); return; }
        setError(`HLS error: ${data.type} ${data.details}`);
        hls.destroy();
      });
      const onMediaErr = () => { if (variant === "h264") goVp9(); };
      video.addEventListener("error", onMediaErr);
      const watchdog = setInterval(() => {
        if (variant === "h264" && video.error) goVp9();
      }, 2000);
      hlsRef.current = hls;
      return () => {
        clearInterval(watchdog);
        video.removeEventListener("error", onMediaErr);
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      video.play().catch(() => {});
    } else {
      setError("HLS not supported in this browser");
    }
  }, [isLive, hlsUrl, variant]);

  // Fallback: sequential playlist when not live
  const handleEnded = () => {
    if (playlist.length > 0) setFallbackIndex((i) => (i + 1) % playlist.length);
  };

  useEffect(() => {
    if (isLive) return;
    const video = videoRef.current;
    if (!video || playlist.length === 0) return;
    const url = playlist[fallbackIndex]?.url;
    if (url && video.src !== url) {
      video.src = url;
      video.play().catch(() => {});
    }
  }, [isLive, playlist, fallbackIndex]);

  const channelName = status?.channelName || 'Hostamar TV';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tv className="w-7 h-7 text-emerald-400" /> {channelName}
          </h1>
          <div
            className={
              'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ' +
              (isLive ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400')
            }
          >
            <Radio className={'w-4 h-4 ' + (isLive ? 'animate-pulse' : '')} />
            {isLive ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {/* Player — key=variant forces a FRESH video element for the VP9
             fallback (an element that errored with MEDIA_ERR_SRC_NOT_SUPPORTED
             stays poisoned even after load()) */}
        <div className="rounded-2xl border border-zinc-800 bg-black aspect-video overflow-hidden mb-4 relative">
          <video
            key={variant}
            ref={videoRef}
            controls
            autoPlay
            muted
            playsInline
            onEnded={handleEnded}
            className="w-full h-full object-contain"
            poster="/og-image.png"
          />
          {!isLive && playlist.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center">
                <Tv className="w-16 h-16 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 font-medium">We're currently offline</p>
                <p className="text-zinc-600 text-sm mt-1">Start TV from Admin Panel → Hostamar TV will play here.</p>
              </div>
            </div>
          )}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" /> LIVE
            </div>
          )}
          {/* Channel watermark — top RIGHT corner */}
          <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 text-xs font-bold tracking-wider z-10 pointer-events-none">
            HOSTAMAR.COM/TV
          </div>
        </div>

        {!isLive && playlist.length > 0 && (
          <p className="text-xs text-zinc-500 mb-6 flex items-center gap-2">
            <ListVideo className="w-4 h-4" /> Fallback playlist mode — playing {playlist[fallbackIndex]?.title} ({fallbackIndex + 1}/{playlist.length}) — HLS offline. Start TV from /admin/tv to go LIVE.
          </p>
        )}
        {isLive && hlsUrl && (
          <p className="text-xs text-zinc-600 mb-6 font-mono truncate">HLS: {hlsUrl}</p>
        )}

        {/* Now playing / up next */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-emerald-400" /> {isLive ? 'Now Playing & Up Next' : 'Coming Up'}
            </h2>
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800 transition" title="Refresh">
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          {playlist.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">No videos scheduled yet. Generate via /admin/tv or /api/tv/generate.</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {playlist.slice(0, 12).map((item, idx) => (
                <div key={item.id} className={`px-6 py-3 flex items-center gap-4 ${idx === fallbackIndex && !isLive ? 'bg-emerald-500/10' : ''}`}>
                  <span className="text-zinc-600 text-sm w-6">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.source}</div>
                  </div>
                  {idx === 0 && isLive && <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 shrink-0">playing</span>}
                  {idx === fallbackIndex && !isLive && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">now</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          Powered by Hostamar AI — content auto-generated from trending news. © {new Date().getFullYear()} Hostamar.
        </p>
      </main>
    </div>
  );
}
