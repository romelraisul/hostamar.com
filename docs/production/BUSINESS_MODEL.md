# BUSINESS_MODEL — Free-Tier Map, Zero Paid Services

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** ZERO PAID SERVICES — No card on file, anywhere

---

## Core Principle

**NO MONEY + NO CARD = FREE TIERS ONLY**

Every component must run on a free tier. Any feature requiring a paid plan or card is a design rejection, not a TODO.

---

## Free Tier Inventory (Verified Live)

| Service | Tier | Limits | Status |
|---------|------|--------|--------|
| **Cloudflare Pages** | Free | Unlimited sites, 500 builds/mo | ✅ LIVE (hostamar-pages) |
| **Cloudflare Workers** | Free | 100k requests/day, 10ms CPU | ✅ LIVE (hostamar-pages, f005-cdn, api-router) |
| **Cloudflare KV** | Free | 100k reads/day, 1k writes/day | ✅ LIVE (HOSTAMAR_CATALOG) |
| **Cloudflare R2** | Free | 10GB/mo | ❌ NOT USED (B2 instead) |
| **Backblaze B2** | Free | 10GB storage, 1GB/day egress (Bandwidth Alliance) | ✅ LIVE (7 buckets, 1.7GB used) |
| **Vercel** | Hobby | 100GB bandwidth, 100 serverless funcs | ⚠️ GATED (GitHub suspended) |
| **Turso** | Free | 500M rows, 1GB storage | ✅ LIVE (primary DB) |
| **Neon** | Free | 0.5GB storage, 100h compute | ✅ MIRROR (serverless over 443) |
| **Supabase** | Free | 500MB DB, 1GB bandwidth | ✅ MIRROR (6h schedule) |
| **AlwaysData** | Free Forever | 1GB storage, 1 site, no card | ✅ FALLBACK (api.hostamar.com) |
| **GitHub** | Free | Unlimited public repos | ⚠️ SUSPENDED (appeal #4892433) |
| **GitLab** | Free | Unlimited private repos | ✅ MIRROR |
| **Forgejo** | Self-hosted | Unlimited | ✅ LIVE (git.hostamar.com) |
| **Codeberg** | Free | Unlimited | ⚠️ QUOTA-BLOCKED |

---

## Cost Breakdown (Monthly)

| Item | Cost | Notes |
|------|------|-------|
| Cloudflare (Pages + Workers + KV + R2) | $0 | Free tier |
| Backblaze B2 | $0 | 10GB free, Bandwidth Alliance egress |
| Turso | $0 | Free tier |
| Neon | $0 | Free tier |
| Supabase | $0 | Free tier |
| AlwaysData | $0 | Forever free, no card |
| Vercel | $0 | Hobby (gated) |
| GitHub/GitLab/Forgejo/Codeberg | $0 | Free |
| **Domain (hostamar.com)** | ~$12/yr | Only paid item — domain registration |
| **Electricity (home PC)** | Variable | RTX 5060, not always-on |

**Total Monthly: $0** (domain amortized ~$1/mo)

---

## Revenue Model (Target — Not Live)

| Product | Target Price | Status |
|---------|--------------|--------|
| **AI Agent Cloud** | $49/mo/agent | Not started |
| **Sovereign Video OS** | $0.10/min render | Station live, monetization pending |
| **EU-BD GPU Spot** | $0.20/h (4090), $1.5/h (H100) | Not started |
| **bKash Checkout** | 1cr = 1 BDT | PENDING integration |

---

## Credit System (Live)

- **Currency:** 1cr = 1 BDT = 1 taka
- **Signup Bonus:** 3000cr
- **Plans (Target):**
  - Starter: ৳990 = 6000cr
  - Pro: ৳1,990 = 13000cr
  - Business: ৳2,990 = 30000cr
- **bKash Personal:** 01822417463

---

## Payment Flow (Pending)

```
User → Send Money to 01822417463 (bKash)
     → Get TrxID
     → Submit at /dashboard/payment
     → Auto-approve in 5 min (cron employee)
     → Credits added to account
```

**Status:** bKash tokenized checkout PGW — PENDING. No payment path in production until live.

---

## Sustainability Rules

1. **Never add paid dependency** — if it needs a card, reject the feature
2. **Prefer self-hosted** — Forgejo, Infisical, Podman stack over SaaS
3. **Bandwidth Alliance** — B2 + Cloudflare = zero egress
4. **Serverless first** — no always-on servers needed
5. **Home PC as VPS** — RTX 5060 for ComfyUI, tunnel to Cloudflare

---

## Financial Guardrails

- **No card on file** anywhere (Cloudflare, Vercel, B2, Neon, Turso, Supabase, AlwaysData)
- **No auto-renew** subscriptions
- **No test charges** allowed
- **bKash only** for BD payments (no Stripe, no PayPal, no international)
- **Domain only recurring cost** — renew annually