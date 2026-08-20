# Cloudflare robots.txt override — hostamar.com

## Problem
- Next.js builds correct robots.txt at /robots.txt (Allow / Disallow /admin /dashboard /api, Sitemap https://hostamar.com/sitemap.xml)
- LIVE shows Cloudflare Managed AI Content-Signal policy instead (search=yes,ai-train=no)
- Cause: Cloudflare Dashboard > Crawl > robots.txt is set to Managed and overrides origin

## Fix (_dashboard — one click)
1. Cloudflare Dashboard > hostamar.com
2. Crawl > robots.txt  (or Security > Bots > Content Signals)
3. Disable "Managed robots.txt" OR set to Custom with:
\`\`\`
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /api/
Sitemap: https://hostamar.com/sitemap.xml
Host: https://hostamar.com
\`\`\`

## Why Next.js is correct
- app/robots.ts returns MetadataRoute.Robots with correct disallows
- public/robots.txt fallback exists (static bypass, same content)
- Vercel serves /robots.txt from .next/static when built; Cloudflare edge cache overrides unless Managed is disabled

## Verify
\`\`\`bash
curl -s https://hostamar.com/robots.txt | grep -q "Disallow: /admin" && echo "ROBOTS OK" || echo "ROBOTS STILL MANAGED"
curl -s https://hostamar.com/robots.txt | head -20
\`\`\`
Expected: Disallow: /admin present, no "Content-Signal: search=" block.

## After fix
- Purge Cloudflare cache: Caching > Purge Everything
- Re-curl with cache-bypass: curl -s https://hostamar.com/robots.txt -H "Cache-Control: no-cache"
