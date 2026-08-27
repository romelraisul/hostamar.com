'use client';

import { useEffect, useRef, useState } from 'react';
import { Tv, Radio, Play, Square, RefreshCw, Zap, ListVideo, Globe, Settings, Terminal, Plus, Trash2, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import Hls from 'hls.js';

type Tab = 'live' | 'playlist' | 'destinations' | 'settings' | 'logs';

export default function AdminTvPage() {
  const [tab, setTab] = useState<Tab>('live');
  const [status, setStatus] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [tunnel, setTunnel] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Forms
  const [newDest, setNewDest] = useState({ platform: 'YOUTUBE', name: '', rtmpUrl: '', streamKey: '', isActive: true });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  const loadAll = async () => {
    try {
      const [s, p, d, set, l, t] = await Promise.all([
        fetch('/api/tv/status').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/tv/playlist').then((r) => r.json()).catch(() => null),
        fetch('/api/tv/destinations').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/tv/settings').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/tv/logs?limit=20').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/tv/tunnel/status').then((r) => r.json()).catch(() => null),
      ]);
      if (s) setStatus(s);
      if (p?.items) setPlaylist(p.items);
      if (d?.destinations) setDestinations(d.destinations);
      if (set?.settings) setSettings(set.settings);
      if (l?.logs) setLogs(l.logs);
      if (t) setTunnel(t);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 15000);
    return () => clearInterval(id);
  }, []);

  // HLS preview in admin
  useEffect(() => {
    const video = videoRef.current;
    const hlsUrl = status?.hlsUrl;
    const isLive = status?.isLive;
    if (!video || !isLive || !hlsUrl) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.play().catch(() => {});
      return;
    }
    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
      return () => hls.destroy();
    }
  }, [status?.isLive, status?.hlsUrl]);

  const sendCommand = async (action: string, payload?: any) => {
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/tv/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) });
      const data = await res.json();
      if (res.ok) { setMsg(`${action} queued (${data.command?.id})`); loadAll(); }
      else setErr(data.message || data.error);
    } catch (e: any) { setErr(e.message); }
  };

  const testHls = async (url?: string) => {
    const u = url || status?.hlsUrl || settings?.hlsUrl;
    if (!u) { setErr('No HLS URL to test'); return; }
    try {
      const res = await fetch('/api/admin/tv/test-hls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) });
      const data = await res.json();
      setMsg(`HLS test ${u}: ${data.reachable ? 'reachable' : 'unreachable'} (HTTP ${data.status})`);
    } catch (e: any) { setErr(e.message); }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/admin/tv/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await res.json();
      if (res.ok) { setMsg('Settings saved'); setSettings(data.settings); }
      else setErr(data.error);
    } catch (e: any) { setErr(e.message); }
  };

  const addDestination = async () => {
    if (!newDest.rtmpUrl || !newDest.streamKey) { setErr('RTMP URL and Stream Key required'); return; }
    try {
      const res = await fetch('/api/tv/destinations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDest) });
      const data = await res.json();
      if (res.ok) { setMsg('Destination added'); setNewDest({ platform: 'YOUTUBE', name: '', rtmpUrl: '', streamKey: '', isActive: true }); loadAll(); }
      else setErr(data.message || data.error);
    } catch (e: any) { setErr(e.message); }
  };

  const deleteDestination = async (id: string) => {
    try {
      const res = await fetch(`/api/tv/destinations?id=${id}`, { method: 'DELETE' });
      if (res.ok) { setMsg('Destination deleted'); loadAll(); }
      else setErr('Delete failed');
    } catch (e: any) { setErr(e.message); }
  };

  const addToPlaylist = async () => {
    if (!newVideoUrl) { setErr('Video URL required'); return; }
    try {
      const res = await fetch('/api/admin/tv/playlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newVideoTitle || 'Untitled', url: newVideoUrl }) });
      const data = await res.json();
      if (res.ok) { setMsg('Added to playlist'); setNewVideoUrl(''); setNewVideoTitle(''); loadAll(); }
      else setErr(data.error);
    } catch (e: any) { setErr(e.message); }
  };

  const deletePlaylistItem = async (id: string) => {
    try {
      await fetch(`/api/admin/tv/playlist?id=${id}`, { method: 'DELETE' });
      loadAll();
    } catch {}
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading TV admin…</div>;

  const isLive = status?.isLive;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tv className="w-6 h-6 text-emerald-400" /> Hostamar TV — Admin Console</h1>
          <div className={'px-3 py-1 rounded-full text-xs font-bold border ' + (isLive ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-500')}>
            {isLive ? '● LIVE' : '○ OFFLINE'}
          </div>
        </div>

        {err && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">{err}</div>}
        {msg && <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">{msg}</div>}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-black border border-zinc-800 rounded-2xl p-1.5 overflow-x-auto">
          {[
            { id: 'live', label: 'Live Control', icon: Radio },
            { id: 'playlist', label: 'Playlist', icon: ListVideo },
            { id: 'destinations', label: 'Destinations', icon: Globe },
            { id: 'settings', label: 'Settings + Tunnel', icon: Settings },
            { id: 'logs', label: 'Logs & Agent', icon: Terminal },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)} className={'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border ' + (tab === t.id ? 'bg-emerald-600 text-white border-emerald-500' : 'text-zinc-500 border-transparent hover:text-white hover:bg-zinc-900')}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1 LIVE */}
        {tab === 'live' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-black aspect-video overflow-hidden relative">
              <video ref={videoRef} controls autoPlay muted playsInline className="w-full h-full object-contain" />
              {!isLive && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80"><p className="text-zinc-500">Preview offline — start TV to see HLS</p></div>}
              {isLive && <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">● LIVE</div>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="text-zinc-500 text-xs">HLS URL</div><div className="text-xs font-mono truncate">{status?.hlsUrl || '— not configured'}</div><div className="text-xs text-zinc-600">{status?.hlsReachable ? '✓ reachable' : '✗ unreachable'}</div></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="text-zinc-500 text-xs">Agent Last Seen</div><div className="text-sm font-bold">{status?.agentLastSeen ? new Date(status.agentLastSeen).toLocaleTimeString() : 'never'}</div><div className={'text-xs ' + (status?.agentLastSeen ? 'text-emerald-400' : 'text-red-400')}>{status?.agentLastSeen ? '● online' : '○ offline'}</div></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="text-zinc-500 text-xs">Playlist</div><div className="text-2xl font-bold">{status?.playlistLength ?? 0}</div></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="text-zinc-500 text-xs">Tunnel</div><div className="text-sm font-bold">{tunnel?.tunnelConfigured ? '✓ configured' : '✗ not configured'}</div><div className="text-xs font-mono truncate">{tunnel?.tunnelUrl || '—'}</div></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button onClick={() => sendCommand('START_WEBSITE')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 p-4 text-left"><Play className="w-5 h-5 mb-1" /><div className="font-bold">Start Website Only</div><div className="text-xs opacity-80">HLS on hostamar.com/tv</div></button>
              <button onClick={() => sendCommand('START_ALL')} className="rounded-xl bg-blue-600 hover:bg-blue-700 p-4 text-left"><Globe className="w-5 h-5 mb-1" /><div className="font-bold">Start Website + YT/FB</div><div className="text-xs opacity-80">Fan-out to all destinations</div></button>
              <button onClick={() => sendCommand('STOP')} className="rounded-xl bg-red-600 hover:bg-red-700 p-4 text-left"><Square className="w-5 h-5 mb-1" /><div className="font-bold">Stop TV</div><div className="text-xs opacity-80">Kill ffmpeg</div></button>
              <button onClick={() => sendCommand('RELOAD_PLAYLIST')} className="rounded-xl bg-zinc-800 hover:bg-zinc-700 p-4 text-left"><RefreshCw className="w-5 h-5 mb-1" /><div className="font-bold">Reload Playlist</div><div className="text-xs opacity-80">Regenerate on agent</div></button>
              <button onClick={() => sendCommand('GENERATE_VIDEO')} className="rounded-xl bg-purple-600 hover:bg-purple-700 p-4 text-left"><Zap className="w-5 h-5 mb-1" /><div className="font-bold">Generate Video Now</div><div className="text-xs opacity-80">RSS → AI video → queue</div></button>
              <button onClick={() => testHls()} className="rounded-xl bg-zinc-800 hover:bg-zinc-700 p-4 text-left"><CheckCircle2 className="w-5 h-5 mb-1" /><div className="font-bold">Test HLS</div><div className="text-xs opacity-80">HEAD check manifest</div></button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="font-bold mb-2">Recent Logs</div>
              {logs.slice(0, 8).map((l: any) => <div key={l.id} className="text-xs font-mono text-zinc-400 py-1 border-b border-zinc-800/50">{new Date(l.createdAt).toLocaleTimeString()} [{l.level}] {l.message}</div>)}
              {logs.length === 0 && <div className="text-xs text-zinc-600">No logs yet.</div>}
            </div>
          </div>
        )}

        {/* TAB 2 PLAYLIST */}
        {tab === 'playlist' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex gap-2">
              <input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="Title (optional)" className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="Video URL (mp4 / R2)" className="flex-[2] px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <button onClick={addToPlaylist} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add</button>
            </div>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              {playlist.length === 0 ? <div className="p-8 text-center text-zinc-600">Playlist empty — add videos or click Generate in Live tab.</div> : playlist.map((it: any, idx: number) => (
                <div key={it.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <span className="text-zinc-600 text-xs w-6">{idx + 1}</span>
                  <div className="flex-1 min-w-0"><div className="text-sm truncate">{it.title}</div><div className="text-xs text-zinc-500 font-mono truncate">{it.url}</div></div>
                  <span className="text-xs text-zinc-600">{it.source}</span>
                  <button onClick={() => deletePlaylistItem(it.id)} className="p-1 hover:bg-zinc-800 rounded"><Trash2 className="w-4 h-4 text-zinc-500" /></button>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="font-bold mb-2">Auto-Generate</div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings?.autoGenerate ?? true} onChange={(e) => setSettings({ ...settings, autoGenerate: e.target.checked })} /> Enable auto-generate from RSS</label>
              <div className="mt-2 text-xs text-zinc-500">RSS Feeds: {(settings?.rssFeeds || []).join(', ') || '—'}</div>
            </div>
          </div>
        )}

        {/* TAB 3 DESTINATIONS */}
        {tab === 'destinations' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="font-bold">Add Destination (YouTube / Facebook / Twitch / Custom)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={newDest.platform} onChange={(e) => setNewDest({ ...newDest, platform: e.target.value })} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
                  <option value="YOUTUBE">YOUTUBE — rtmp://a.rtmp.youtube.com/live2</option>
                  <option value="FACEBOOK">FACEBOOK — rtmps://live-api-s.facebook.com:443/rtmp</option>
                  <option value="TWITCH">TWITCH — rtmp://live-sin.rtmp.twitch.tv/app</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
                <input value={newDest.name} onChange={(e) => setNewDest({ ...newDest, name: e.target.value })} placeholder="Name (optional)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
                <input value={newDest.rtmpUrl} onChange={(e) => setNewDest({ ...newDest, rtmpUrl: e.target.value })} placeholder="RTMP URL" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
                <input value={newDest.streamKey} onChange={(e) => setNewDest({ ...newDest, streamKey: e.target.value })} placeholder="Stream Key" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              </div>
              <button onClick={addDestination} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Add Destination</button>
              <p className="text-xs text-zinc-600">YouTube key: YouTube Studio → Go Live → Stream key · Facebook: facebook.com/live/producer → Stream key</p>
            </div>

            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              {destinations.length === 0 ? <div className="p-8 text-center text-zinc-600">No destinations. Add YouTube/Facebook keys above.</div> : destinations.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50">
                  <span className="text-xs font-bold text-white w-20">{d.platform}</span>
                  <span className="text-xs text-zinc-500 flex-1 truncate">{d.rtmpUrl}</span>
                  <span className="text-xs font-mono text-zinc-400 w-24 truncate">{showKey[d.id] ? d.streamKey : '••••••••'}{d.streamKey && <button onClick={() => setShowKey({ ...showKey, [d.id]: !showKey[d.id] })} className="ml-1">{showKey[d.id] ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}</button>}</span>
                  <span className={'text-xs px-2 py-1 rounded-full ' + (d.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-500')}>{d.isActive ? 'active' : 'inactive'}</span>
                  <button onClick={() => deleteDestination(d.id)} className="p-1 hover:bg-zinc-800 rounded"><Trash2 className="w-4 h-4 text-zinc-500" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4 SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="font-bold">Channel Settings</div>
              <input value={settings?.channelName || ''} onChange={(e) => setSettings({ ...settings, channelName: e.target.value })} placeholder="Channel Name" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <input value={settings?.hlsUrl || ''} onChange={(e) => setSettings({ ...settings, hlsUrl: e.target.value })} placeholder="HLS URL (https://.../index.m3u8) — auto-filled from tunnel if available" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono" />
              <input value={settings?.rtmpUrl || ''} onChange={(e) => setSettings({ ...settings, rtmpUrl: e.target.value })} placeholder="RTMP URL (rtmp://localhost:1935/live/tv)" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono" />
              <button onClick={saveSettings} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Save Settings</button>
              <button onClick={() => testHls(settings?.hlsUrl)} className="ml-2 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm">Test HLS</button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Cloudflare Tunnel (auto-expose local HLS)</div>
              <div className="mt-2 text-sm space-y-1">
                <div>Token present: {tunnel?.tokenPresent ? '✓ yes' : '✗ no — set CLOUDFLARE_TUNNEL_TOKEN in Vercel env'}</div>
                <div>API token: {tunnel?.apiTokenPresent ? '✓ yes' : '✗ no'}</div>
                <div className="font-mono text-xs truncate">Auto URL: {tunnel?.tunnelUrl || '—'}</div>
                <div className="font-mono text-xs truncate">Effective HLS: {tunnel?.hlsUrl || status?.hlsUrl || '— not configured'}</div>
                <div className="text-xs text-zinc-500">Reachable: {tunnel?.reachable ? '✓ yes' : '✗ no'} {tunnel?.hlsStatus ? `(HTTP ${tunnel.hlsStatus})` : ''}</div>
              </div>
              <div className="mt-3 p-3 bg-black rounded-lg text-xs font-mono text-zinc-400">
                {tunnel?.tokenPresent ? 'cloudflared tunnel run --token $CLOUDFLARE_TUNNEL_TOKEN (auto on agent start)' : '1. Create tunnel at dash.cloudflare.com → Zero Trust → Tunnels\n2. Point http://localhost:8080 → copy token\n3. Add CLOUDFLARE_TUNNEL_TOKEN to Vercel env & .env.local\n4. Return here → Test HLS'}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5 LOGS */}
        {tab === 'logs' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs">
              <div className="font-bold text-white mb-2 flex items-center gap-2"><Terminal className="w-4 h-4" /> Agent Logs (last 50)</div>
              {logs.map((l: any) => <div key={l.id} className={'py-1 ' + (l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-400' : 'text-zinc-400')}>{new Date(l.createdAt).toLocaleString()} [{l.level}] {l.message}</div>)}
              {logs.length === 0 && <div className="text-zinc-600">No logs.</div>}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="font-bold mb-2">Download Agent</div>
              <p className="text-xs text-zinc-500 mb-2">Agent runs on your Windows PC. Download scripts/tv-agent/ with TV_AGENT_SECRET pre-filled.</p>
              <div className="p-3 bg-black rounded font-mono text-xs text-zinc-400">cd scripts/tv-agent && npm install && TV_AGENT_SECRET=xxx HOSTAMAR_API=https://hostamar.com npm start</div>
              <div className="mt-2 p-3 bg-black rounded font-mono text-xs text-zinc-400">cd docker/tv-station && docker compose up -d && ffmpeg -re -stream_loop -1 -f concat -safe 0 -i ./videos/playlist.txt -c:v libx264 -f flv rtmp://localhost:1935/live/tv</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
