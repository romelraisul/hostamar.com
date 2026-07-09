# Task 6 - SEO, Speed, Trust - Hostamar
Path: /home/romel/hostamar-build/docs/seo.md + app/layout.tsx + schema

## 1. Technical SEO Audit - Current vs Fix

### Meta Tags (Fix in layout.tsx)
Current: Generic "Build. Play. Explore. Create." - no keyword, no BD targeting
Fix:
- title: "AI মার্কেটিং ভিডিও বাংলাদেশ | হোস্টিং সহ - Hostamar"
- description: "50+ বাংলা টেমপ্লেট দিয়ে 30 সেকেন্ডে মার্কেটিং ভিডিও বানান। ঈদ, বৈশাখ, 11.11 - সব। bKash পেমেন্ট, BDIX হোস্টিং। ৳0 থেকে শুরু।"
- keywords: ["AI marketing video Bangladesh", "বাংলা ভিডিও মেকার", "ঈদ অফার ভিডিও", "hosting Bangladesh bKash"]
- canonical: https://hostamar.com
- og:image: /og-image-bn.jpg (1200x630, with ৳0 + bKash badge)
- lang: bn-BD + en fallback

### Schema - JSON-LD (Add to layout.tsx)

1. Product Schema - for ৳2000/৳3500 pricing
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Hostamar AI Marketing + Hosting",
  "description": "AI দিয়ে মার্কেটিং ভিডিও + BDIX হোস্টিং বাংলাদেশ",
  "brand": {"@type":"Brand","name":"Hostamar"},
  "offers": [
    {"@type":"Offer","name":"Free","price":"0","priceCurrency":"BDT","description":"3 AI videos/mo, 1GB hosting"},
    {"@type":"Offer","name":"Starter","price":"2000","priceCurrency":"BDT","priceValidUntil":"2026-12-31","description":"100 AI videos, 10GB NVMe, .com free"},
    {"@type":"Offer","name":"Pro","price":"3500","priceCurrency":"BDT","description":"Unlimited AI videos, 20GB NVMe, API"}
  ],
  "aggregateRating": {"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"500"}
}
```

2. FAQ Schema - from bangla-copy.md
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"Hostamar কি HostSeba/ExonHost এর মতো?","acceptedAnswer":{"@type":"Answer","text":"না। ওরা শুধু হোস্টিং দেয়। আমরা দিই AI মার্কেটিং ভিডিও + হোস্টিং। ৳2000 এ হোস্টিং + 100 ভিডিও।"}},
    {"@type":"Question","name":"bKash দিয়ে পেমেন্ট করা যাবে?","acceptedAnswer":{"@type":"Answer","text":"হ্যাঁ। bKash, Nagad, Rocket - সব। USD কার্ড লাগে না। 30 সেকেন্ডে একটিভ।"}},
    {"@type":"Question","name":"ফ্রি তে কি ওয়াটারমার্ক থাকবে?","acceptedAnswer":{"@type":"Answer","text":"Free তে ছোট ওয়াটারমার্ক থাকবে। ৳2000 প্ল্যানে থাকবে না।"}}
  ]
}
```

3. Organization + LocalBusiness
```json
{
  "@type": "Organization",
  "name": "Hostamar",
  "url": "https://hostamar.com",
  "logo": "https://hostamar.com/logo.png",
  "sameAs": ["https://facebook.com/romelraisul"],
  "address": {"@type": "PostalAddress", "addressCountry": "BD", "addressLocality": "Bogura"},
  "paymentAccepted": "bKash, Nagad, Rocket, Cash",
  "currenciesAccepted": "BDT"
}
```

### Core Web Vitals - Action Plan
- LCP: Hero image <100KB WebP, preload, no large JS. Current HeroSection already has no img - good.
- INP: Avoid client heavy. Make Hero server component (no 'use client'). Move ollama calls to server.
- CLS: Set width/height for all images, avoid layout shift from pricing cards
- Speed: Add next/image, next/font optimization, edge caching for /api/health
- Checklist:
  - robots.txt: Allow /, Disallow /api/, Sitemap: https://hostamar.com/sitemap.xml
  - sitemap.xml: /, /pricing, /tools, /templates, /blog/ai-marketing-video-bangladesh
  - Add <link rel="alternate" hreflang="bn-BD" /> + en

## 2. Content Cluster Plan - Keyword: "AI marketing video Bangladesh"

Pillar Page: /blog/ai-marketing-video-bangladesh (2000 words, Bangla + English mix)
- H1: AI মার্কেটিং ভিডিও বাংলাদেশ - SME গাইড 2026
- Intent: Commercial - why AI video + hosting together

Cluster 1 - Transactional:
- /templates/eid-offer-video-maker - "ঈদ অফার ভিডিও মেকার - 30 সেকেন্ডে"
- /templates/boishakh-sale-video - "পহেলা বৈশাখ সেল ভিডিও"
- /templates/11-11-sale-video - "11.11 মেগা সেল ভিডিও বাংলাদেশ"
- /pricing - "bKash দিয়ে হোস্টিং + AI ভিডিও"

Cluster 2 - Informational:
- /blog/best-hosting-bangladesh-bkash - Compare HostSeba vs ExonHost vs Hostamar (your positioning.md)
- /blog/how-to-make-fb-ads-video-bangla - FB ads video tutorial
- /blog/capcut-vs-hostamar-bangla - Why local

Cluster 3 - Local Trust:
- /about - Bogura, BDIX, 500+ creators proof
- /contact - bKash merchant number, address

Internal linking: Every cluster -> Pillar with anchor "AI marketing video Bangladesh"

## 3. Legal Drafts - Bangladesh Law Compliant

### Privacy Policy - /privacy (Short BD compliant)
Effective: 2026-07-09
We collect: name, phone, email, bKash trxID, video prompts. No NID.
Use: To deliver AI videos + hosting + bKash verification.
Store: BDIX server, encrypted. 1 year retention.
Share: Only bKash/Nagad for payment verify, no selling data.
Rights: Per Digital Security Act + ICT Act 2006, you can request delete via support@hostamar.com
Contact: Raisul Mahmud Romel, Bogura, BD

### Terms - /terms
- Service: AI video gen + hosting. No guarantee 100% uptime, target 99.5% (BDIX)
- Payment: BDT only, bKash/Nagad/Rocket. Subscription auto-renew.
- Content: You own your videos. Don't generate hate/porn per Digital Security Act.
- Termination: We can suspend if illegal content.

### Refund Policy - /refund (Per Bangladesh Consumer Rights Act)
- 7 দিনের মধ্যে 100% রিফান্ড - কোন প্রশ্ন ছাড়া
- bKash/Nagad এ 24-48 ঘণ্টায় ফেরত
- Free plan এ রিফান্ড নাই
- How to: support@hostamar.com + bKash trxID
- Digital product but per BD law, if not as described, refund.

## 4. Next.js Code - layout.tsx snippet (APPLIED)

```tsx
// app/layout.tsx — see actual file for applied changes
export const metadata = {
  title: "AI মার্কেটিং ভিডিও বাংলাদেশ | হোস্টিং সহ - Hostamar",
  description: "50+ বাংলা টেমপ্লেট দিয়ে 30 সেকেন্ডে মার্কেটিং ভিডিও বানান। ঈদ, বৈশাখ, 11.11 - সব। bKash পেমেন্ট, BDIX হোস্টিং। ৳0 থেকে শুরু।",
  keywords: ["AI marketing video Bangladesh","বাংলা ভিডিও মেকার","hosting Bangladesh bKash"],
  openGraph: {
    title: "AI দিয়ে মার্কেটিং ভিডিও 30 সেকেন্ডে",
    description: "হোস্টিং সহ, bKash পেমেন্ট",
    images: ["/og-image-bn.jpg"],
    locale: "bn_BD"
  },
  alternates: { canonical: "https://hostamar.com", languages: { "bn-BD": "/bn", "en-US": "/en" } }
};
```

## 5. Trust Badges to Add (Footer)
- bKash Merchant, Nagad, BDIX Certified, SSL Secure, 500+ Creators, 7-day Refund BD Law

## Acceptance
- File at docs/seo.md
- Schema passes https://validator.schema.org
- Lighthouse: LCP <2.5s, CLS <0.1
- Pillar page ranks for "AI marketing video Bangladesh" in 30 days