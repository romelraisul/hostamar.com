# Cost & ROI — ZERO COST Architecture (verified 2026-08-29)

## The zero-cost stack
| Layer | Service | Free limit | Monthly cost |
|---|---|---|---|
| Hosting | Vercel `hostamar-build` | 100 deploys/day (17/100 used) | ৳0 |
| Edge/fallback | Cloudflare Worker `hostamar-ai-gateway` | 100k req/day | ৳0 |
| CDN/DNS | Cloudflare (acct e00717304c1139751214b8cda5078a8d) | unlimited | ৳0 |
| DB | Neon Postgres | 0.5GB | ৳0 |
| Storage | B2 `hostamar-prod` (s3.us-east-005) | 10GB free (0/5GB used, 9 objects) | ৳0 |
| LLM | kilocode free models (LongCat-2.0), CF edge, home litellm (optional), kb-fallback | free, no card | ৳0 |
| Analytics | @vercel/analytics + speed-insights | free | ৳0 |
| CI/CD | GitHub Actions + git push | free | ৳0 |
| Domain | hostamar.com renewal | ~৳3000/yr | the ONLY cost |

## Survival model (computer off)
```
Vercel (always answers) → kilocode direct free
                       ↘ CF Worker free tier
                       ↘ litellm home (only if ON — optional GPU boost)
                       ↘ openrouter free (revival)
                       ↘ knowledge-base fallback (Bangla bKash/pricing kb — NEVER fails)
```
Health, catalog, models, chat, TV, storage-quota all 200 with computer OFF (verified: prod runs entirely on Vercel; home tunnel is additive).

## Alternative-stack cost comparison (what we avoid)
- Zapier $20+/mo or Make $9+/mo → **n8n self-hosted free** (computer optional)
- Jasper $39 + Surfer $49/mo → **own model chain ৳0**
- Sanity CMS $99/mo → **custom headless (Prisma) ৳0**
- Pinecone $ → **B2 + BM25-lite + KV ৳0**
- Sentry/ paid APM → **Vercel analytics + daily-health cron ৳0**
- InVideo $17/mo (our direct competitor) → **Hostamar FREE tier, bKash local payment**

## ROI (ibute.tech SMB benchmarks vs our reality)
- Typical SMB Tier1 workflow automation: $8.5k, 4-mo ROI → **ours: ৳0 build, ROI infinite on first sale**
- Tier2 chatbot: $22k, 341% ROI → **ours: already live (support + dashboard chat)**
- Hidden costs avoided: data cleanup, change management, 10-20% annual maintenance — all self-served.

## Unit economics to cover the domain (৳3000)
| Sale | Amount | Count needed |
|---|---|---|
| Starter | ৳599 | 5 |
| Pro | ৳1299 | 3 (also covers buffer) |
| Business | ৳2999 | 1 |

Break-even = 3 Pro sales/year. Auto-approve payment agent keeps fulfillment labor at zero.
