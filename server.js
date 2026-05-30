// Simple standalone server for hosting
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let reqPath = url.parse(req.url).pathname;
  
  // Default to index.html for SPA routing
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }
  
  // Check if file exists in .next/static
  let filePath = path.join(__dirname, '.next', 'static', reqPath);
  
  // Handle API routes proxy (redirect to Vercel)
  if (reqPath.startsWith('/api/') || reqPath.startsWith('/_next/')) {
    const options = {
      hostname: 'hostamar-local-8i0q2d0bg-romelraisul-8939s-projects.vercel.app',
      port: 443,
      path: req.url,
      method: req.method,
      headers: req.headers
    };
    
    const https = require('https');
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
    return;
  }
  
  // Serve static files
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found, try to serve index.html (SPA fallback)
        const indexPath = path.join(__dirname, '.next', 'static', 'index.html');
        fs.readFile(indexPath, (err2, content2) => {
          if (err2) {
            res.writeHead(500);
            res.end('Server Error: ' + err2.code);
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content2, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      const extname = path.extname(filePath);
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Hosting from .next/ directory');
});
