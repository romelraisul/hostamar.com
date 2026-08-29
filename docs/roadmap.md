# Roadmap — 6-Step AI Implementation (cigen.io framework, adapted)

## Where we are (2026-08-29)
- [x] Step 1 Strategy & Alignment — "Bangla-first AI business OS, zero cost, bKash payments"
- [x] Step 2 Data Readiness — Neon Postgres (104 customers), B2 storage, KV model catalog
- [x] Step 3 Infrastructure & Tooling — Vercel + CF Worker + optional home GPU; all free
- [x] Step 4 Development & Pilot — 50 services, 120 models (112 pass), TV 50, chat, IDE, browser, game wired 2026-08-29
- [ ] Step 5 Deployment & Change Management — THIS PUSH: real functionality behind all 15 dashboard links
- [ ] Step 6 Monitoring & Continuous Improvement — daily-health cron live; alerts + retraining loop pending

## Next 30 days (priority order)
1. **Seed demand**: 3-5 paying customers (covers ৳3000 domain). FB groups + referrals (referral page live).
2. **Video generation real**: wire home GPU render (HunyuanVideo) as the computer-ON hook behind /api/generate placeholder MP4.
3. **Analytics signal**: add @vercel/speed-insights + funnel events (signup→first chat→first generate→payment).
4. **Security debt**: npm audit fix (109 vulns, 5 critical), MFA optional TOTP, RateLimitEvent table ensure (signup 5/h currently fail-open).
5. **SEO/GEO**: IndexNow key, submit sitemap to Bing/GSC, AI-Overview-friendly first-200-words answer block on /.

## 90 days
- RAG index of real customer docs (support quality), personalization A/B on dashboard,
  TeamSpaces (multi-user), template marketplace (UGC 50→200 services).

## Timeline benchmark
- Simple automation: 2-4 weeks ✅ (done)
- Chatbot: 6-12 weeks ✅ (done)
- Complex agents: 4-8 months → agents/orchestrator.ts shipped; production tuning in-flight
