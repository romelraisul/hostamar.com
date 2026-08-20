# Dashboard + Admin Audit — Hostamar 20 Aug 2026

## Before / After Tabs

| Route | Before Tabs | After (Spec) | How Fixed |
|---|---|---|---|
| /dashboard layout | Dashboard/Videos/Analytics/Services/Payment/Referral/Settings (7, not 6 products) | Video(production)/Hosting/Chat/Browser/IDE(93 models)/Game + Overview + Billing + Settings + Referral (sidebar 6 icons, header credit meter) | Shipped layout.tsx: 6 product nav + credit meter 6000/6000 + Command+K |
| /dashboard page | Stats 4 (videos/services/storage/plan) + QuickActions 4 + ProductsGrid + RecentVideos | Header 6000/6000 credit meter + Recent projects + Usage graph per product (credit used Video/Hosting/Chat/Browser/IDE/Game) + quick "ফ্রিতে ভিডিও বানান" green CTA | Page.tsx fetches /api/dashboard/stats creditsRemaining + products usage |
| /admin layout | Dashboard/Customers/Videos/Services/Subscriptions/Payments/Orders/Ecosystem/Analytics/Settings (10) | Overview/Users/Credits/Transactions/Models/Products/Hosting + Settings (7 spec tabs) | Shipped layout.tsx: correct nav |
| /admin page | Single dark page: 7 StatCards + Orders table + Payments table (no tabs) | 7 tabs: 1 Overview stats from /api/admin/stats, 2 Users from /api/admin/customers?limit=20 paginated + credit edit 6000, 3 Credits CreditTransaction, 4 Transactions bKash TrxID pending_verification->approved + invoice PDF, 5 Models 93 from lib/replicate + ai gateway, 6 Products 6 toggle LIVE/Planned + tunnel 530/200, 7 Hosting BDIX/uptime | Shipped page.tsx: tab switcher + fetch each |

## 6-Product Credit Mapping (per account 6000)

| Product | Cost | Meter Location | Competitor |
|---|---|---|---|
| Video (comfy.hostamar.com / /generate) | 100 / video | Dashboard header 6000→5900 + /api/generate/history | InVideo $17 Plus |
| Hosting (5GB Free NVMe BDIX 20ms) | 0 (free tier) + 2000/3500 plans | /dashboard/hosting cPanel | ExonHost ~৳834/mo |
| Chat (Tawk.to + AI assist 100msg/day) | 1 / msg, cap 100/day | /dashboard/chat counter | Tawk.to FREE |
| Browser (iframe + summarize) | 5 / summary (Aria FREE) | /dashboard/browser meter | Opera Aria |
| IDE (Monaco + 93 models ai.hostamar.com) | 10 / run (WebContainers) | /dashboard/ide model selector | Replit/Cursor |
| Game (Playground canvas Phaser) | 5-10 / play | /dashboard/game Play button | Rosebud/Scenario |

## Build 114p 87.7kB
114 pages, shared ~87.7kB, Middleware 26.3kB, hybrid green #0E7C3A / blue #2563EB, 320px, no purple-pink.

## Tunnel
browser/comfy/api 530 -> run Windows: cloudflared tunnel run --name hostamar-app + python gateway.py (ai.hostamar.com already 200)


## Shipped 20 Aug 2026 (dpl_DPsev → new)
- dashboard/page.tsx 370L → new 6-product tabs + CreditMeter 6000/6000 wired to /api/dashboard/stats + Recent + Usage + Sticky CTA + Command palette (dashboard/layout.tsx now fetches credits/storage too)
- dashboard/layout.tsx 166L: header credit meter + Recent sidebar + command palette Cmd+K
- admin/page.tsx 442L → 632L: 7 tabs Overview/Users/Credits/Transactions/Models/Products/Hosting + tunnel status card browser 530/comfy 530/ai 200 + FALLBACK_URL
- admin/layout.tsx 186L: 7 spec tabs + MORE legacy
- Color: login bg-[#0E7C3A] verified, dashboard #0E7C3A green primary, admin 7 cards green
- Tunnel: browser/comfy 530 awaiting Windows cloudflared tunnel run --name hostamar-app + python gateway.py (ai 200 live)
