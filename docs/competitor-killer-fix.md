# Competitor Killer Fix — 20 Aug 2026

## Live Prices Scraped (source: live pricing pages 20 Aug 2026)
- InVideo: Free -> Plus $17/mo (75cr) -> Max $85 Most Popular (390cr) -> Generative $170 -> Elite $900
- Pictory: Starter $19/mo -> Pro $35/mo ann -> Team $119/mo ann
- Veed: Lite $12/mo ann -> Pro $24-29/mo -> Enterprise custom
- ExonHost: ~৳834/mo Starter 5GB (WHTop), Shared 1GB $2.03, Turbo 50GB $19.95
- HostSeba: Basic ৳831/yr (86% off, renew 1845) -> Stater 1350 -> Standard 2229 -> Advance 4729
- Tawk.to: FREE forever, AI Assist Hobby free -> Growth $29/mo -> Business $99
- Opera Aria: FREE (5 img/day anon, 30 with account)
- Arc Max: EOL May 2025, acquired $610M by Atlassian, now Dia invite-only
- Scenario: Starter $15/mo 1500cr -> Pro $45 -> Max $75 -> Enterprise
- Ludo.ai: Pro $35/mo ($420/yr 12kcr), Indie/Rosebud free 10k credits
- Replit: Core $25/mo ($20 ann) -> Pro $100/mo (15 builders)
- Cursor: Hobby FREE -> Pro $20 -> Pro+ $60 -> Ultra $200 -> Teams $40/user
- StackBlitz: FREE -> $8.50 Pro (WebContainers)
- Brave Leo: FREE private in Brave 70M users

## What Fixed (70/20/10 LIVE)

### PHASE 1 — Real /hosting (260 lines)
- Killed Welcome back placeholder
- Hero: 5GB Free NVMe + BDIX Dhaka PoP + 20ms + 99.9% UptimeRobot, cPanel ছাড়া, bKash CTA
- Band: ExonHost vs Hostamar + HostSeba ৳2220 No AI vs ৳2000 AI সহ, LiteSpeed+LSCache+JetBackup 7pts, bKash/Nagad/Rocket
- Pricing: ৳0 / ৳2000 / ৳3500 aligned to locked ৳0/2000/3500 (yearly 1600/2800), sticky 320px CTA
- Brand: #FFFFFF + #2563EB only

### PHASE 2 — Demo on /generate (216 lines)
- Trust bar: bKash/Nagad/Rocket + BDIX 20ms + 500+ creators + Watermark-free
- Comparison lines: InVideo $17 vs Hostamar ৳0, Pictory $19 vs ৳0, Veed $12 vs ৳0
- 3 demo cards: Eid / Boishakh / 11.11 with gradients + Play
- Fix: pills flex-wrap, Generate sticky bottom-0 mobile + desktop hidden, FAQPage JSON-LD 5 Q/A
- Title: "AI ভিডিও জেনারেটর — ৳0 তে শুরু - Hostamar" + 1 gradient

### PHASE 3 — SEO Cannibalization Fix
- Layouts: /hosting, /generate, /chat, /browser (noindex), /game (noindex), /dev added with unique titles + canonicals
  - /hosting = BDIX হোস্টিং - bKash অটো | 5GB ফ্রি
  - /generate = AI ভিডিও জেনারেটর — ৳0 তে শুরু
  - /chat = AI চ্যাট উইজেট - ৳0 100msg/day
  - /dev = AI Dev IDE - ৳0
  - /browser + /game = Lab noindex planned
- /products/[slug]: gradients purple-pink -> #2563EB brand, added Product (SoftwareApplication) + BreadcrumbList JSON-LD
- /products/* shims: FCFCF9 -> #FFFFFF, 0E7C3A -> #2563EB
- /products page: 70/20/10 reorder + 70% LIVE badge, planned faded

### PHASE 4 — Homepage 70/20/10 + Kill List
- Homepage: HeroC 70% + 20% Hosting band (BDIX 5GB + HostSeba comparison) + 10% Tools 2 cards (Chat + Dev IDE) labeled ৳1000/mo early bundle
- Navbar: Browser + Game hidden from dropdown (kept only /products bottom Planned)
- lib/products.ts gradients: purple-pink/indigo-pink/rose-orange/green-emerald -> #2563EB brand pure

### PHASE 5 — Verify
- npm run build: 114 pages 0 errors, shared 87.6kB (same)
- /hosting: real not Welcome back, BDIX + bKash live
- /generate: 3 demo cards + sticky CTA + InVideo $17 vs ৳0 live
- /products/[slug]: Product + Breadcrumb JSON-LD live
- Brand: hosting+generate critical clean (0E7C3A=0, purple in lib fixed)

## Remaining Non-Critical (not in acceptance)
- /app/ide/page.tsx + /app/browser/page.tsx + /app/dashboard/hosting still have heritage 0E7C3A (internal/dashboard, not marketing critical) — sweep next
- /chat widget live embed + /dev StackBlitz embed: already linked, full widget embed is P1 (SupportWidget.tsx exists)

