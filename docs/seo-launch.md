# SEO Launch — hostamar.com (0 Taka)

## 1. Submit sitemap
- Search Console > Sitemaps > Add: https://hostamar.com/sitemap.xml
- Verify: 28 URLs (/, /pricing, /faq, /about, /blog, /generate, /hosting, /products/*, etc)

## 2. Rich Results — Product + FAQPage + BreadcrumbList + Organization
- Product (/pricing): 3 Offers 0/2000/3500 BDT, brand Hostamar
- FAQPage (/faq + / + /pricing): from docs/bangla-copy.md + docs/seo.md
- BreadcrumbList (/blog/[slug], /products/[slug])
- Organization: logo https://hostamar.com/logo.png
- Test: https://search.google.com/test/rich-results + https://validator.schema.org

## 3. OG image
- /opengraph-image 1200x630 PNG, BN text + bKash badge
- Test: https://developers.facebook.com/tools/debug/ — paste hostamar.com — scrape again — check image 1200x630 loads

## 4. GA4
- Set Vercel env: NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
- Events: hero_cta_click (HeroC CTA), pricing_click (pricing cards), bkash_click (bKash checkout)
- Verify: GA4 DebugView or dataLayer: window.dataLayer in console, then click CTA

## 5. Core Web Vitals
- /admin stats Promise.all 0.8-1.2s + private max-age=15
- PageSpeed Insights: https://pagespeed.web.dev/analysis?url=https://hostamar.com/
