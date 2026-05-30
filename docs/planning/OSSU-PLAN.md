# 🚀 OSSU × Bengali AI Academy — Full Business & Go-To-Market Plan

**Author:** Romel Raisul  
**Date:** 2026-05-12  
**Status:** Ready for Execution  
**Stack:** Next.js 14, TypeScript, Prisma/PostgreSQL, Tailwind, Next-auth v5  
**Infrastructure:** Vercel (Hobby), Cloudflare Pages (backup), Neon PostgreSQL, Upstash Redis, Uptime Kuma  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Model Expansion](#2-business-model-expansion)
3. [Pricing Strategy](#3-pricing-strategy)
4. [Cost Projections & Unit Economics](#4-cost-projections--unit-economics)
5. [Revenue Projections (24 Months)](#5-revenue-projections-24-months)
6. [Go-To-Market Strategy](#6-go-to-market-strategy)
7. [Phase-by-Phase Launch Plan](#7-phase-by-phase-launch-plan)
8. [Product Roadmap Integration](#8-product-roadmap-integration)
9. [Marketing Playbook](#9-marketing-playbook)
10. [KPIs & Milestones](#10-kpis--milestones)
11. [Risk & Mitigation](#11-risk--mitigation)
12. [Immediate Action Items](#12-immediate-action-items)

---

## 1. Executive Summary

**Vision:** OSSU Computer Science curriculum-বিতার একটি AI-powered Bengali learning platform তৈরি করা, যেটা self-taught developer-দের structured path দেবে, certification দেবে এবং Hostamar video AI-ত integrate করে practical skill-building করবে।

**Target Market:**
- 🇧🇩 Bangladesh: 40K+ coding-interested students/month (Facebook group data)
- 🌏 Global Bengali diaspora: 500K+ potential learners
- 🏢 SMEs/Bootcamps: 200+ potential institutional buyers in BD

**Revenue Model:** Freemium SaaS + Hostamar-powered video course marketplace

---

## 2. Business Model Expansion

### 2.1 Revenue Streams

| # | Stream | Phase | Revenue Type | Est. % of Revenue |
|---|--------|-------|-------------|-------------------|
| 1 | **Freemium Subscriptions** | Phase 1 | Recurring (monthly) | 50% |
| 2 | **Hostamar Video Credits** | Phase 1 | Usage-based | 20% |
| 3 | **Certification Fees** | Phase 2 | One-time per cert | 10% |
| 4 | **Enterprise Onboarding** | Phase 3 | B2B contracts | 15% |
| 5 | **Marketplace Commission** | Phase 4 | Transaction fee (15%) | 5% |

### 2.2 Freemium Tier Breakdown

#### Free Tier (Always Free)
- OSSU curriculum access (text + links)
- Progress tracking (basic)
- Community forum access
- Limited: 1 quiz attempt per module, no certificate
- 1 Hostamar video generation/month (watermarked)

#### Pro Tier — ৳500/month (~$5)
- Everything in Free
- Unlimited quiz attempts
- AI-powered code review (Phase 2+)
- Downloadable certificates (PDF)
- 10 Hostamar video credits/month
- Collaborative notebooks
- Priority community support

#### Enterprise Tier — Custom Pricing (৳2,000-10,000/employee/month)
- Everything in Pro
- Custom learning paths
- Team admin dashboard
- Progress analytics & reporting
- Dedicated support
- API access
- White-label certification
- Bulk Hostamar video generation

### 2.3 Hostamar Integration Revenue

| Feature | Pricing | Type |
|---------|---------|------|
| AI Video Lesson Generation | ৳5/video (Pro free credits included) | Per-use |
| Course Promo Video | ৳50-100/video | Per-use |
| Student Project Demo Video | ৳10/video | Per-use |
| Batch Video (10+ lessons) | ৳400-800/batch | Bundle |

### 2.4 Marketplace Revenue

- Bengali tutorials, course modules, templates
- Creator uploads → 70% creator / 30% platform commission
- Custom OSSU plugin development → flat fee + maintenance

---

## 3. Pricing Strategy

### 3.1 Pricing Psychology (Bangladesh Market)

```
৳500/month = ১৬ টাকা/দিন = চা ২ কাপের দাম
৳3,000/৬মাস = "একটি বইয়ের দামে ৬ মাস স্কিল"
৳5,00০/বছর = "মাসে ৪১৬ টাকা, কম রেস্তোরাঁ খরচ"
```

### 3.2 Payment Methods

| Method | Fee | Integration |
|--------|-----|-------------|
| bKash | 1.5% | bKash PGW API |
| Nagad | 1.2% | Nagad MPL API |
| USDT (BEP20) | 0.5% | Manual wallet + verification |
| Stripe | 3.6% + $0.30 | For global users |
| Bank Transfer | Free | Manual reconciliation |

### 3.3 Introductory Offers

- **Launch Week:** First 3 months at ৳250/month (50% off)
- **Group Discount:** 3+ users = ৳400/month each
- **Annual Prepay:** ৳5,000/year (save ৳1,000)
- **Hostamar Bundle:** Subscribe Pro + get 50 extra video credits free

---

## 4. Cost Projections & Unit Economics

### 4.1 Monthly Infrastructure Cost (Phase 1)

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Hobby) | Pro (needed for env vars) | $20/month |
| Neon PostgreSQL | Pro (512MB RAM, 10GB) | $0-20/month |
| Upstash Redis | Free tier → Standard | $0-9/month |
| Cloudflare | Free tier | $0 |
| Uptime Kuma | Self-hosted (free) | $0 |
| Vaultwarden | Self-hosted on Railway free | $0 |
| **Total Infra** | | **~$20-49/month** |

### 4.2 Monthly Operating Cost

| Item | Cost |
|------|------|
| Domain (hosted OSSU platform) | ৳500-800/year |
| Email service (Resend free tier) | $0 |
| Monitoring (Uptime Kuma) | $0 |
| CDN (Cloudflare) | $0 |
| **Total Operations** | **~$0-5/month** |

### 4.3 Unit Economics

```
Assumptions (Month 12 target):
- Subscribers: 200 Pro users
- Revenue: 200 × ৳500 = ৳1,00,000/month ($950)
- Hostamar video credits used: 2,000 credits
- Video credit revenue: ৳20,000/month

Per-User Economics:
- CAC (Customer Acquisition Cost): ৳50-100
- MRR per user: ৳500
- LTV (12-month): ৳6,000
- LTV:CAC ratio: 60:1 (exceptional)

Gross Margin: ~92% (hosting is cheap, video credits are marginal)
Net Margin (solo founder): ~65-75%
```

### 4.4 Break-Even Analysis

| Metric | Value |
|--------|-------|
| Monthly fixed costs | ~$55 (~৳6,000) |
| Break-even subscribers | 12 Pro users |
| Target for comfortable operation | 50 Pro users |
| Target for full-time income | 200+ Pro users |

---

## 5. Revenue Projections (24 Months)

### 5.1 Conservative Scenario

| Month | Free Users | Pro Users | Enterprise | Total Revenue (৳) | Total Revenue ($) |
|-------|-----------|-----------|------------|-------------------|-------------------|
| 1-3 | 50 | 5 | 0 | 2,500 | $24 |
| 4-6 | 150 | 15 | 0 | 7,500 | $71 |
| 7-9 | 400 | 40 | 1 | 22,000 | $209 |
| 10-12 | 800 | 80 | 3 | 48,000 | $456 |
| 13-15 | 1,500 | 150 | 8 | 1,05,000 | $1,000 |
| 16-18 | 3,000 | 300 | 15 | 2,10,000 | $2,000 |
| 19-21 | 5,000 | 500 | 25 | 3,75,000 | $3,563 |
| 22-24 | 8,000 | 800 | 40 | 6,00,000 | $5,714 |

### 5.2 Aggressive Scenario (Hostamar viral boost)

| Month | Pro Users | Revenue (৳) | Notes |
|-------|-----------|-------------|-------|
| 6 | 50 | 35,000 | AI video content goes viral |
| 12 | 200 | 1,50,000 | Bengali dev community adoption |
| 18 | 600 | 4,50,000 | Enterprise deals close |
| 24 | 1,500 | 12,00,000 | Marketplace revenue kicks in |

---

## 6. Go-To-Market Strategy

### 6.1 Target Audience Personas

**Persona 1: Shuvo, 22, Self-taught Developer**
- Location: Dhaka
- Income: ৳15,000-25,000/month (fresher)
- Pain: No structured CS learning path in Bengali
- Where: Facebook groups, YouTube, Reddit r/bangladesh
- Willing to pay: ৳300-500/month for quality content

**Persona 2: Rima, 28, Bootcamp Instructor**
- Location: Chittagong
- Income: ৳40,000-60,000/month
- Pain: Needs structured curriculum for students
- Where: LinkedIn, Twitter, educator communities
- Willing to pay: Enterprise tier for team access

**Persona 3: Faisal, 35, SME CTO**
- Location: Dhaka
- Pain: Needs developer onboarding pipeline
- Where: LinkedIn, tech meetups
- Willing to pay: ৳5,000-15,000/month for team training

### 6.2 Positioning Statement

> "আমাদের সাথে OSSU-তে শেখো ভিডিওতে, কুইজেঁতে, আর সার্টিফিকেট নিয়ে — প্রথম মাসেই ইম্প্লয়ের-রেডি হয়ে যাও।"

### 6.3 Channel Strategy

#### Primary Channels (70% effort)

**1. Facebook Ecosystem**
- Post in 50+ Bengali coding/tech groups (2x daily)
- Create dedicated page: "OSSU Bengali Academy"
- Weekly live coding sessions (Facebook Live)
- Target: 500 followers/month, 5% conversion to free

**2. YouTube**
- Channel: "OSSU Bengali" — curriculum walkthroughs
- Upload 2 videos/week (5-10 min each)
- Use Hostamar to generate intro/outro videos
- Target: 1,000 subscribers by Month 6

**3. Discord/Telegram Community**
- Setup: OSSU Bengali Learners server
- Channels: #python, #web-dev, #data-science, #jobs, #help
- Weekly: Code review session, AMA with OSSU graduates
- Target: 500 members by Month 3

#### Secondary Channels (30% effort)

**4. LinkedIn**
- Post: "I'm building OSSU Bengali Academy" weekly updates
- Connect with HR/CTO at Bangladeshi tech companies
- Target: 300 connections, 10 enterprise leads by Month 6

**5. Twitter/X**
- Daily tweets: OSSU progress, Bengali dev memes, tips
- Use hashtag: #OSSUbn #BengaliDev #Hostamar
- Target: 500 followers, 20 Pro conversions

**6. Reddit**
- r/bangladesh, r/learnprogramming, r/selfhosted
- Genuine value posts, no spam
- Target: 50 signups/month from Reddit

### 6.4 Launch Strategy — Week by Week

#### Pre-Launch (Week -4 to -1)
- [ ] Build landing page on Hostamar/Vercel
- [ ] Record 3 intro videos on Hostamar
- [ ] Post in 20 Facebook groups: "Something big coming for Bengali devs"
- [ ] Collect email list via Google Form (target: 200 emails)
- [ ] Create Discord server, invite early adopters

#### Launch Week (Week 0)
- [ ] Deploy OSSU platform (Phase 1 MVP)
- [ ] Post launch announcement in ALL Facebook groups
- [ ] YouTube: "I built a Bengali CS learning platform — here's why"
- [ ] LinkedIn: Full story post
- [ ] Twitter thread: "How I'm building OSSU Bengali Academy"
- [ ] Offer: First 100 Pro users get 50% lifetime discount

#### Post-Launch (Week 1-8)
- [ ] Weekly: Publish 1 new Hostamar-generated video lesson
- [ ] Daily: Engage in Facebook groups, answer questions
- [ ] Bi-weekly: Collect feedback surveys
- [ ] Monthly: Release new features based on feedback

---

## 7. Phase-by-Phase Launch Plan

### Phase 1 — MVP Launch (Month 0-3) — Budget: ~$100

**Product:**
- [x] Curriculum hosting (OSSU full path)
- [x] Progress tracking (checkboxes, %)
- [x] Profile system with OAuth2
- [x] Basic quiz system (MCQ per module)
- [x] Badge system (shareable images)
- [ ] Video lesson player (Hostamar embed)

**Infrastructure:**
- [ ] Vercel Pro deployment
- [ ] Neon PostgreSQL database
- [ ] Upstash Redis for sessions
- [ ] Vaultwarden for secrets
- [ ] Uptime Kuma monitoring

**Marketing:**
- [ ] Facebook group presence (30 groups)
- [ ] YouTube channel with 6 videos
- [ ] Discord community (200 members)
- [ ] Landing page with waitlist

**Revenue Target:** $0 (building user base)

### Phase 2 — Monetization (Month 3-6) — Budget: ~$200

**Product:**
- [ ] Pro/Free tier implementation
- [ ] Automated grading system
- [ ] PDF certificate generation
- [ ] Collaborative notebooks (CodeMirror/Monaco)
- [ ] CSV export of progress
- [ ] 1:1 Hostamar video integration

**Infrastructure:**
- [ ] Coolify v3 multi-tenant setup
- [ ] bKash/Nagad payment integration
- [ ] Email automation (Resend)
- [ ] Nightingale alerting

**Marketing:**
- [ ] Paid post in top 5 Facebook groups (৳500 each)
- [ ] YouTube collab with 2 Bengali tech YouTubers
- [ ] First 50 Pro users testimonial campaign
- [ ] bKash promo: "Pay ৳250, get first month free"

**Revenue Target:** ৳15,000/month (~$140)

### Phase 3 — Growth (Month 6-12) — Budget: ~$500

**Product:**
- [ ] AI code review (LLM integration)
- [ ] Enterprise admin dashboard
- [ ] Team management & analytics
- [ ] Advanced modules (AI, DevOps, Security)
- [ ] Hostamar batch video generation

**Infrastructure:**
- [ ] Railway/Render for microservices
- [ ] ElasticSearch for progress logs
- [ ] Prometheus + Grafana dashboards

**Marketing:**
- [ ] Enterprise outreach (cold email 50 CTOs)
- [ ] Content marketing (SEO blog posts in Bengali)
- [ ] Affiliate program (5% commission for referrals)
- [ ] Tech meetup sponsorships (৳5,000/event)

**Revenue Target:** ৳75,000/month (~$700)

### Phase 4 — Scale (Month 12-18) — Budget: ~$1000

**Product:**
- [ ] Marketplace for Bengali tutorials
- [ ] AI learning assistant (ChatGPT-like)
- [ ] Gamified challenges & leaderboards
- [ ] Multi-language support (English + Bengali)
- [ ] AIRI VTuber coding companion (experimental)

**Infrastructure:**
- [ ] Kubernetes cluster (Coolify/Railway)
- [ ] CDN for static content (Cloudflare)
- [ ] Sharded PostgreSQL

**Revenue Target:** ৳2,50,000/month (~$2,400)

### Phase 5 — Global (Month 18-24) — Budget: ~$2000

**Product:**
- [ ] Full enterprise SSO (SAML/OIDC)
- [ ] Custom learning path builder
- [ ] Mobile app (React Native)
- [ ] Community moderation tools
- [ ] White-label for institutions

**Marketing:**
- [ ] International expansion (India, Nepal, Middle East)
- [ ] Conference talks (PyCon BD, JSConf Asia)
- [ ] Partnership with universities

**Revenue Target:** ৳6,00,000/month (~$5,700)

---

## 8. Product Roadmap Integration

### How This Connects to Hostamar

```
Hostamar (Video AI SaaS)
    └── OSSU Academy (Learning Platform)
         ├── Hostamar API (auto-generate video lessons)
         ├── Student projects → Hostamar demo videos
         ├── Course promos → Hostamar generated
         └── Revenue share: Academy drives Hostamar usage
```

**Cross-Selling Strategy:**
1. Every OSSU student sees Hostamar in action (embedded video lessons)
2. Free tier: 1 Hostamar video/month → upgrades to Pro for more
3. Pro tier: 10 Hostamar credits/month → buy more if needed
4. Enterprise: Bulk Hostamar video generation for course content

### Migration Path for Database Schema

```prisma
// schema.prisma additions for OSSU module

model OssuUser {
  id          String   @id @default(uuid())
  userId      String   // references your existing users table
  progress    Json     // { "/path/to/course": { completed: [...], current: "..." } }
  certifications OssuCertification[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model OssuCertification {
  id          String   @id @default(uuid())
  userId      String
  coursePath  String
  completedAt DateTime
  pdfUrl      String   // Generated via Hostamar
  verified    Boolean  @default(false)
}

model OssuQuiz {
  id          String   @id @default(uuid())
  modulePath  String
  questions   Json     // [{ question, options, correctIndex }]
  passingScore Int     @default(70)
}
```

### API Endpoints Needed

```
GET    /api/ossu/curriculum          → Full OSSU path list
GET    /api/ossu/progress            → User progress
PATCH  /api/ossu/progress            → Update module completion
GET    /api/ossu/quiz/:moduleId      → Quiz for module
POST   /api/ossu/quiz/:moduleId      → Submit quiz, return grade
POST   /api/ossu/certify/:moduleId   → Generate + download certificate
GET    /api/ossu/video/recommend     → Recommended Hostamar videos
POST   /api/ossu/video/generate      → Generate lesson video (Pro+)
GET    /api/ossu/leaderboard         → Gamification leaderboard
```

---

## 9. Marketing Playbook

### 9.1 Content Calendar (Monthly)

| Week | Facebook | YouTube | LinkedIn | Twitter | Discord |
|------|----------|---------|----------|---------|---------|
| 1 | "এই সপ্তাহে কী কী শিখবো" + poll | Tutorial: Module walkthrough | Progress update post | Tips thread | Live coding session |
| 2 | Student testimonial | Student project showcase | Industry trend analysis | Dev meme + tip | Quiz competition |
| 3 | Free resource share | "Bengali dev-এর জন্য OSSU" | Job posting / hiring tip | Thread: Common mistakes | AMA with mentor |
| 4 | New feature announcement | Behind the scenes (Hostamar) | Partnership announcement | Monthly roundup | Community challenge |

### 9.2 SEO Strategy (Bengali Content)

Target keywords:
- "ওএসএসইউ কোর্স বাংলায়" (OSSU course in Bengali)
- "সেলফ টগোডার CS লার্নিং বাংলাদেশ" (Self-taught CS Bangladesh)
- "কম্পিউটার সায়েন্স কোর্স বিনামূল্যে" (Free CS course)
- "প্রোগ্রামিং শেখা বাংলায়" (Learn programming in Bengali)
- "বাংলা কোডিং কোর্স" (Bengali coding course)

Blog posts to create:
1. "OSSU-তে CS শেখার সম্পূর্ণ গাইড (বাংলায়)"
2. "Self-Taught Developer হওয়ার রোডম্যাপ ২০২৬"
3. "বাংলাদেশে Tech ক্যারিয়ার শুরু করার ৫টি উপায়"
4. "AI দিয়ে কোড রিভিউ: কিভাবে প্রোগ্রামিং শেখা সহজ হয়"
5. "Hostamar + OSSU: ভিডিওয়ের সাথে কোডিং শেখা"

### 9.3 Partnership Opportunities

| Partner | Type | Value |
|---------|------|-------|
| **Bengali AI Academy** | Content partner | Co-branded certifications |
| **Hostamar** | Tech partner | Video generation credits |
| **bKash** | Payment partner | Lower transaction fees |
| **Bangladesh CS communities** | Distribution | Free user acquisition |
| **Coding bootcamps (BD)** | Institutional partner | Bulk enterprise deals |
| **Tech YouTubers (BD)** | Influencer marketing | Free trial code distribution |

### 9.4 Referral Program

```
User refers friend → Friend signs up free
- Referral gets: +5 Hostamar video credits
- Referee gets: 7-day Pro trial
- If referee converts to Pro: Referral gets ৳100 credit

Target: 20% of Pro users come from referrals by Month 6
```

---

## 10. KPIs & Milestones

### Key Performance Indicators

| Metric | Month 3 | Month 6 | Month 12 | Month 24 |
|--------|---------|---------|----------|----------|
| Total Users (Free+Pro) | 200 | 500 | 2,000 | 10,000 |
| Pro Users | 20 | 80 | 300 | 1,500 |
| Enterprise Accounts | 0 | 3 | 15 | 50 |
| Monthly Revenue (৳) | 10,000 | 40,000 | 1,50,000 | 6,00,000 |
| MRR ($) | $95 | $380 | $1,425 | $5,714 |
| Churn Rate | 15% | 10% | 8% | 5% |
| Quizzes Completed/Week | 50 | 200 | 1,000 | 5,000 |
| Certificates Issued | 50 | 250 | 1,500 | 8,000 |
| Hostamar Videos Generated | 100 | 500 | 3,000 | 20,000 |

### Milestone Gates

```
Month 0:  MVP deployed, first 10 users onboarded
Month 1:  100 free users, payment integration live
Month 3:  First Pro conversion, 20 Pro users
Month 6:  Revenue positive, 80 Pro users, 3 enterprise
Month 9:  AI code review feature live, 150 Pro users
Month 12: Marketplace launched, 300 Pro users
Month 18: 500 Pro users, AI assistant live
Month 24: 1,500 Pro users, international expansion begins
```

---

## 11. Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-------------|
| Low initial adoption | High | High | Aggressive Facebook/Telegram marketing; free tier with value |
| Payment integration issues (bKash API down) | Medium | Medium | Manual payment fallback; Stripe for global users |
| Content quality concerns | Medium | High | Peer review system; community ratings on modules |
| Competitor (Learnyst, etc.) | Low | Medium | Bengali-first focus; Hostamar integration differentiation |
| Infrastructure cost spike | Low | Medium | Auto-scaling limits; monitoring alerts via Uptime Kuma |
| Key person (me) burnout | High | High | Build community moderators; automate grading; delegate |
| Low Pro conversion rate | Medium | High | Improve free tier value demonstration; trial period |

---

## 12. Immediate Action Items

### This Week (May 12-18, 2026)

| # | Task | Time | Status |
|---|------|------|--------|
| 1 | Create OSSU Academy project in `/mnt/c/Users/romel/` | 1hr | ☐ |
| 2 | Design database schema (Prisma) | 1hr | ☐ |
| 3 | Setup Vercel project: `ossu-academy` | 30min | ☐ |
| 4 | Create landing page with email collection | 2hr | ☐ |
| 5 | Post teaser in 10 Facebook groups | 1hr | ☐ |
| 6 | Record intro video on Hostamar | 30min | ☐ |
| 7 | Setup Discord server with channels | 30min | ☐ |
| 8 | Research bKash PGW API docs | 30min | ☐ |

### Next Week (May 19-25, 2026)

| # | Task | Time | Status |
|---|------|------|--------|
| 9 | Build MVP: curriculum page + progress tracking | 10hr | ☐ |
| 10 | OAuth2 integration (GitHub + Google) | 3hr | ☐ |
| 11 | Quiz system (basic MCQ) | 5hr | ☐ |
| 12 | First 3 video lessons on Hostamar | 2hr | ☐ |
| 13 | Deploy & test on Vercel | 2hr | ☐ |
| 14 | Soft launch to first 10 users | 1hr | ☐ |
| 15 | Collect feedback & iterate | ongoing | ☐ |

### Month 1 Budget Allocation: $75

| Item | Cost |
|------|------|
| Vercel Pro | $20 |
| Cloudflare domain | $10 |
| Facebook ads (test) | $25 |
| Domain email (Resend) | $0 (free tier) |
| Misc (design assets, etc.) | $20 |
| **Total** | **$75** |

---

## Appendix: Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENT                        │
│  Next.js 14 (SSR) ──── NextAuth v5             │
└─────────────┬─────────────────┬─────────────────┘
              │                 │
              ▼                 ▼
┌──────────────────┐  ┌──────────────────────┐
│  Vercel (Frontend)│  │  API Routes          │
│  Tailwind CSS     │  │  /api/ossu/*         │
└────────┬─────────┘  └──────────┬───────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐  ┌──────────────────────┐
│  Neon PostgreSQL │  │  Upstash Redis       │
│  (Primary DB)    │  │  (Session + Cache)   │
└──────────────────┘  └──────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Hostamar    │ │  Uptime Kuma │ │  Vaultwarden │
    │  API(Video)  │ │  (Monitor)   │ │  (Secrets)   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

*Document created: 2026-05-12 | Next review: 2026-05-19*
*Author: Romel Raisul — Solo Founder, Hostamar + OSSU Academy*