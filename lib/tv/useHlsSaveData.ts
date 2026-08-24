'use client';

/**
 * useHlsSaveData — shared hls.js setup optimized for slow BD connections.
 *
 * - Deep buffer (30s ahead, 60s max) so network hiccups never stall playback
 * - ABR capped by player size (capLevelToPlayerSize) + remembered floor level
 *   in localStorage — a user who dropped to 240p stays there
 * - Service worker (tv-sw.js) caches .ts segments; this hook forwards the next
 *   segment URLs to it for background prefetch before the player needs them
 *
 * Returns nothing; caller keeps its own video/hls refs.
 */
import { useEffect } from 'react';
import type Hls from 'hls.js';
import HlsCtor from 'hls.js';

export const TV_SW_PATH = '/tv-sw.js';
export const TV_LEVEL_KEY = 'tv-level-v1';

export function registerTvSw() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(TV_SW_PATH).catch(() => {});
}

/** Ask the service worker to warm specific segment URLs in the cache. */
export function prefetchSegments(urls: string[]) {
  if (!urls.length) return;
  navigator.serviceWorker?.controller?.postMessage({ type: 'prefetch', urls });
}

export function parseSegmentUrls(m3u8: string, baseUrl: string): string[] {
  return m3u8
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .slice(0, 3)
    .map((s) => new URL(s, baseUrl).toString());
}

export interface SaveDataOpts {
  hls: Hls | null;
  source: string | null;
  /** cap levels whose height exceeds this (match small embeds) */
  maxHeight?: number;
}

export function applySaveDataConfig(hls: Hls | null, source: string | null, maxHeight?: number) {
  if (!hls || !source) return;
  void HlsCtor; // keep runtime import for callers constructing via this module

  // Slow-net buffer profile: trade a little latency for zero stalls.
  // hls.config is read-only post-construct — apply the same knobs imperatively.
  (hls as any).config = {
    ...(hls as any).config,
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
    startLevel: -1,
    capLevelToPlayerSize: true,
    autoStartLoad: true,
    testBandwidth: true,
    progressive: false,
  };

  // Remembered quality floor: if the user was throttled to 240p before,
  // start there instead of re-probing with a stall.
  const saved = Number(localStorage.getItem(TV_LEVEL_KEY) ?? '-1');
  if (Number.isFinite(saved) && saved >= 0) {
    (hls as any).autoLevelCapping = saved;
  }

  hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_e, d) => {
    try { localStorage.setItem(TV_LEVEL_KEY, String(d.level)); } catch {}
  });

  // Background prefetch: hand the next 3 segment URLs to the service worker
  hls.on(HlsCtor.Events.LEVEL_UPDATED, (_e, d) => {
    try {
      const details = (hls as any).levels?.[d.level]?.details;
      const frags = details?.fragments as any[] | undefined;
      if (!frags?.length) return;
      const pos = hls.media?.currentTime ?? 0;
      const upcoming = frags
        .filter((f) => (f.start ?? 0) + (f.duration ?? 0) > pos)
        .slice(0, 3)
        .map((f) => new URL(f.url, source!).toString());
      prefetchSegments(upcoming);
    } catch {}
  });
}
