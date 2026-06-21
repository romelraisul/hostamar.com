# Marketing copy drafts

## Product Hunt launch post

**Tagline:** AI video creation for Bangladeshi creators — 50+ templates, 90-second renders, no GPU needed.

**Headline:** Hostamar — AI Video Generator Built for Bangladesh

**Body:**
Most AI video tools are built for English-speaking markets with expensive GPU infrastructure. Hostamar flips that.

Built for Bangladeshi creators, businesses, and marketers, Hostamar lets you generate professional marketing videos from a text prompt in about 90 seconds — no GPU, no cloud API costs, no credit card required.

**What makes it different:**
- CPU-only video generation (Pillow + FFmpeg) — works on any machine, no GPU needed
- 50+ Bengali-friendly templates across 10 categories (Facebook shop, education, food, travel, wedding)
- Native Bengali text rendering + English support
- Generates 720x1280 portrait video in ~1.7 seconds
- Free tier: 5 videos/month
- No cloud dependency — runs locally with Docker

**Stack:** Next.js, BullMQ, PostgreSQL, Redis, Stripe, Docker, GitHub Actions CI/CD

**Status:** Production live with billing, onboarding A/B experiments, analytics, and automated backups.

**Links:**
- Product: https://hostamar.com
- GitHub: https://github.com/romelraisul/hostamar.com

## Beta email — A/B subject lines

**Variant A (direct):**
"Try Hostamar — create an AI video in 90 seconds"

**Variant B (curiosity):**
"We made video creation 10x faster for Bangladesh"

## Social post (Twitter/X)

"Just shipped AI video generation for Bangladesh. 50+ templates, Bengali text, 90-second renders, no GPU needed. Try it free: https://hostamar.com/signup"

## Short launch checklist

- [ ] Set NEXT_PUBLIC_ANALYTICS_PROVIDER in production
- [ ] Send beta email to seed list (50-200 people)
- [ ] Run bash scripts/test-e2e-onboarding.sh after traffic arrives
- [ ] Wait for 1,000 users or 14 days
- [ ] Run analysis using scripts/experiment-report.md
- [ ] If v2 wins: flip feature flag; deploy
- [ ] Post to Product Hunt / Twitter
