# V66 Fix Admin /check 404 HTML bn _next/static/css + PC-VPS down
Symptom: /check returns 404 HTML bn _next/static/css/5c9b3ed02c1edbe4.css
Root: .next/standalone/.next/static/css missing after build — Next.js output:standalone requires manual copy
Fix: mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
Also: cloudflared DNS timeout — restart tunnel
Result: /api/health 200, /_next/static/css 200, /api/chat 401 JSON (correct without auth), hostamar.com/freestack 200
