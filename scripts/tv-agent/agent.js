/**
 * scripts/tv-agent/agent.js — Hostamar TV Agent (runs on Windows PC with RTX 5060)
 *
 * Polls https://hostamar.com/api/tv/agent/commands?secret=TV_AGENT_SECRET every 10s.
 * Executes: START_WEBSITE | START_ALL | STOP | RELOAD_PLAYLIST | GENERATE_VIDEO
 *
 * START_WEBSITE: ffmpeg to rtmp://localhost:1935/live/tv (website only)
 * START_ALL: ffmpeg with multiple -f flv outputs (website + YouTube + Facebook + Twitch)
 * Requires: Node 18+, ffmpeg in PATH, docker compose up -d (nginx-rtmp)
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const HOSTAMAR_API = process.env.HOSTAMAR_API || process.env.NEXTAUTH_URL || 'https://hostamar.com';
const AGENT_SECRET = process.env.TV_AGENT_SECRET || process.env.AGENT_SECRET || '';
const POLL_MS = parseInt(process.env.POLL_SECONDS || '10', 10) * 1000;
const PLAYLIST_TXT = path.join(__dirname, '..', '..', 'docker', 'tv-station', 'videos', 'playlist.txt');

let ffmpegProc = null;

function log(msg) {
  console.log(`[tv-agent ${new Date().toISOString()}] ${msg}`);
}

async function fetchCommands() {
  if (!AGENT_SECRET) {
    log('ERROR: TV_AGENT_SECRET not set in env');
    return [];
  }
  try {
    const res = await fetch(`${HOSTAMAR_API}/api/tv/agent/commands?secret=${encodeURIComponent(AGENT_SECRET)}`, {
      headers: { 'x-agent-secret': AGENT_SECRET },
    });
    if (!res.ok) {
      log(`poll failed HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.commands || [];
  } catch (e) {
    log(`poll error: ${e.message}`);
    return [];
  }
}

async function ack(commandId, status, logMsg) {
  try {
    await fetch(`${HOSTAMAR_API}/api/tv/agent/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId, status, log: logMsg, secret: AGENT_SECRET }),
    });
    log(`ack ${commandId} -> ${status}`);
  } catch (e) {
    log(`ack error: ${e.message}`);
  }
}

async function reloadPlaylist() {
  try {
    const res = await fetch(`${HOSTAMAR_API}/api/tv/playlist`);
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      log('playlist empty, skipping regeneration');
      return false;
    }
    const lines = items.map((it) => `file '${(it.url || '').replace(/'/g, "'\\''")}'`).join('\n') + '\n';
    fs.mkdirSync(path.dirname(PLAYLIST_TXT), { recursive: true });
    fs.writeFileSync(PLAYLIST_TXT, lines);
    log(`playlist regenerated: ${items.length} items -> ${PLAYLIST_TXT}`);
    return true;
  } catch (e) {
    log(`reload playlist error: ${e.message}`);
    return false;
  }
}

function killFfmpeg() {
  if (ffmpegProc && !ffmpegProc.killed) {
    log(`killing ffmpeg pid=${ffmpegProc.pid}`);
    try { ffmpegProc.kill('SIGTERM'); } catch {}
    setTimeout(() => { try { if (ffmpegProc && !ffmpegProc.killed) ffmpegProc.kill('SIGKILL'); } catch {} }, 3000);
    ffmpegProc = null;
  }
}

async function startWebsite() {
  await reloadPlaylist();
  if (!fs.existsSync(PLAYLIST_TXT)) {
    log('no playlist.txt, cannot start');
    return;
  }
  killFfmpeg();
  const args = ['-re', '-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', PLAYLIST_TXT, '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-f', 'flv', 'rtmp://localhost:1935/live/tv'];
  log(`starting ffmpeg WEBSITE: ffmpeg ${args.join(' ')}`);
  ffmpegProc = spawn('ffmpeg', args, { stdio: 'inherit' });
  ffmpegProc.on('exit', (code) => log(`ffmpeg exited code=${code}`));
  ffmpegProc.on('error', (e) => log(`ffmpeg error: ${e.message}`));
}

async function startAll() {
  await reloadPlaylist();
  if (!fs.existsSync(PLAYLIST_TXT)) {
    log('no playlist.txt, cannot start');
    return;
  }
  // Fetch destinations from the agent-scoped endpoint (full stream keys)
  let destinations = [];
  try {
    const res = await fetch(`${HOSTAMAR_API}/api/tv/agent/destinations?secret=${encodeURIComponent(AGENT_SECRET)}`, {
      headers: { 'x-agent-secret': AGENT_SECRET },
    });
    if (!res.ok) log(`agent destinations HTTP ${res.status}`);
    const data = await res.json();
    destinations = (data.destinations || []).filter((d) => d.isActive);
  } catch (e) {
    log(`fetch destinations error: ${e.message}`);
  }
  killFfmpeg();
  const baseArgs = ['-re', '-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', PLAYLIST_TXT, '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100'];
  const outputs = ['-f', 'flv', 'rtmp://localhost:1935/live/tv'];
  for (const d of destinations) {
    const base = (d.rtmpUrl || '').replace(/\/+$/, '');
    const target = `${base}/${d.streamKey}`;
    outputs.push('-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-c:a', 'aac', '-b:a', '128k', '-f', 'flv', target);
    log(`  + destination ${d.platform}: ${base}/***`);
  }
  const args = [...baseArgs, ...outputs];
  log(`starting ffmpeg ALL (${1 + destinations.length} outputs): ffmpeg ${args.join(' ').replace(/\/[A-Za-z0-9_-]{10,}/g, '/***')}`);
  ffmpegProc = spawn('ffmpeg', args, { stdio: 'inherit' });
  ffmpegProc.on('exit', (code) => log(`ffmpeg exited code=${code}`));
  ffmpegProc.on('error', (e) => log(`ffmpeg error: ${e.message}`));
}

async function handleCommand(cmd) {
  log(`handling ${cmd.action} (${cmd.id})`);
  await ack(cmd.id, 'RUNNING', 'Executing');
  try {
    switch (cmd.action) {
      case 'START_WEBSITE':
        await startWebsite();
        await ack(cmd.id, 'DONE', 'Website stream started');
        break;
      case 'START_ALL':
        await startAll();
        await ack(cmd.id, 'DONE', 'Multi-destination stream started');
        break;
      case 'STOP':
        killFfmpeg();
        await ack(cmd.id, 'DONE', 'Stream stopped');
        break;
      case 'RELOAD_PLAYLIST':
        await reloadPlaylist();
        await ack(cmd.id, 'DONE', 'Playlist reloaded');
        break;
      case 'GENERATE_VIDEO':
        // Trigger generate via API (calls real orchestrator)
        try {
          const res = await fetch(`${HOSTAMAR_API}/api/tv/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          const data = await res.json();
          await ack(cmd.id, data.ok ? 'DONE' : 'FAILED', data.message || JSON.stringify(data).slice(0, 500));
        } catch (e) {
          await ack(cmd.id, 'FAILED', e.message);
        }
        break;
      default:
        await ack(cmd.id, 'FAILED', `Unknown action ${cmd.action}`);
    }
  } catch (e) {
    await ack(cmd.id, 'FAILED', e.message);
  }
}

async function loop() {
  const cmds = await fetchCommands();
  for (const cmd of cmds) {
    await handleCommand(cmd);
  }
}

log(`Hostamar TV Agent starting — API=${HOSTAMAR_API} poll=${POLL_MS}ms`);
if (!AGENT_SECRET) log('WARNING: TV_AGENT_SECRET missing — polling will fail with 401');
setInterval(loop, POLL_MS);
loop();

// Graceful shutdown
process.on('SIGINT', () => { killFfmpeg(); process.exit(0); });
process.on('SIGTERM', () => { killFfmpeg(); process.exit(0); });
