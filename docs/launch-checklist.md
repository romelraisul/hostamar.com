# Launch Checklist — 0 Taka
- [ ] Cloudflare Managed robots.txt disabled (see docs/cloudflare-robots-fix.md)
- [ ] curl https://hostamar.com/robots.txt shows Allow / Disallow /admin /dashboard /api + Sitemap
- [ ] curl https://hostamar.com/sitemap.xml shows 28 URLs (pricing, faq, about, blog, generate, hosting, products)
- [ ] https://hostamar.com/opengraph-image 200 1200x630 PNG BN + bKash badge
- [ ] NEXT_PUBLIC_GA_ID set in Vercel (Settings > Environment Variables), events hero_cta_click/pricing_click/bkash_click firing (dataLayer)
- [ ] No #0E7C3A left in app/page.tsx critical path (grep = 0)
- [ ] Submit sitemap to Search Console (https://search.google.com/search-console)
- [ ] Test Rich Results: Product + FAQPage + BreadcrumbList (validator.schema.org)
- [ ] Test OG: FB Debugger (developers.facebook.com/tools/debug) — 1200x630 loads
- [ ] Build: 114 pages, 0 errors, /robots.txt 0B static, /sitemap.xml 0B static
- [ ] Live curls (see below) all 200
- [ ] Mobile 320px clean (no horizontal scroll), contrast AAA

## Live verification (run after deploy)
\`\`\`bash
curl -s https://hostamar.com/robots.txt | grep -q "Disallow: /admin" && echo "ROBOTS OK"
curl -s https://hostamar.com/sitemap.xml | grep -c "<loc>" && echo "SITEMAP count OK (expect 28)"
curl -sI https://hostamar.com/opengraph-image | grep -i "content-type: image"
curl -sI https://hostamar.com/ | head -5
curl -sI https://hostamar.com/pricing | head -5
\`\`\`
