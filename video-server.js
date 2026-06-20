/**
 * Video proxy + upload server for Hostamar.
 * Runs alongside the Next.js server on port 8899.
 *
 * GET  /<filename>       → proxy to worker HTTP server
 * POST /upload/<filename> → save file to VIDEO_DIR
 *
 * Started by server.js after Next.js is ready.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const VIDEO_DIR = process.env.WORKER_VIDEO_DIR || '/app/videos';
const WORKER_URL = process.env.WORKER_VIDEO_SERVER || 'http://hostamar-gpu-worker:8899';

try { fs.mkdirSync(VIDEO_DIR, { recursive: true }); } catch {}

const server = http.createServer((req, res) => {
  const url = req.url;

  // POST /upload/<filename> — receive video from worker
  if (req.method === 'POST' && url.startsWith('/upload/')) {
    const filename = path.basename(url.slice(8));
    if (!filename.endsWith('.mp4') && !filename.endsWith('.jpg')) {
      res.writeHead(400);
      return res.end('Only .mp4 and .jpg files allowed');
    }
    const filePath = path.join(VIDEO_DIR, filename);
    const ws = fs.createWriteStream(filePath);
    req.pipe(ws);
    ws.on('finish', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', url: `/videos/${filename}`, size: ws.bytesWritten }));
    });
    ws.on('error', e => { res.writeHead(500); res.end('Write error: ' + e.message); });
    return;
  }

  // GET /<filename> — proxy to worker's HTTP file server
  const workerUrl = new URL(WORKER_URL);
  const opts = {
    hostname: workerUrl.hostname,
    port: workerUrl.port || 8899,
    path: url,
    method: 'GET',
  };
  const proxy = http.request(opts, p => {
    res.writeHead(p.statusCode, p.headers);
    p.pipe(res);
  });
  proxy.on('error', e => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Video proxy error: ' + e.message);
  });
  proxy.end();
});

server.listen(8899, () => {
  console.log(`Video proxy on 8899 → ${WORKER_URL}, upload → ${VIDEO_DIR}`);
});
