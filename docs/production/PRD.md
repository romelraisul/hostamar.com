# PRD — hostamar.com product definition: 3 strategic products, users, shipped vs pending scope.

## What hostamar.com is

hostamar.com is a Bangladesh-first AI + cloud platform owned by Romel Raisul, built solo
on zero budget: free tiers only, no card on file, host machine not always-on, so the
architecture is serverless/Vercel-first. The live surface today includes the 24/7 AI TV
station (`/tv`), the model catalog (`/models.json` v40), a credits-based store and
dashboard/admin area, and the `api.hostamar.com` model gateway.

Strategic thesis (~/hostamar-vision/FINAL_GOAL.md): hosting ($149B market) and AI video
($6B) alone are too small — sell **infrastructure, not software**. The ~25-repo foundation
(+ OpenMontage = 26 repos) is the base layer for 3 products aimed at much larger markets
(McKinsey: $7T into data centers by 2030; Citi: $4.2T global AI market 2030).

## The 3 products (per FINAL_GOAL.md)

| # | Product | What it is | Current status |
|---|---------|------------|----------------|
| 1 | **Hostamar AI Agent Cloud** (`agent.hostamar.com`) | "CoreWeave + Vercel + n8n in one": persistent container + cron + storage + memory + GPU for user agents, priced from $49/mo (target). Coolify + agent memory (Chat Memory + Skill + Wiki + CodeGraph — agent never forgets) + open-connector (1400+ APIs). Example user ask: a Bangla agent that pulls YouTube trends daily, makes a video, posts to Facebook. | Not started as a product. Foundations exist: podman fleet, coolify-wsl container, model gateway, Infisical. |
| 2 | **Sovereign Video OS** (`/tv`) | Script-to-monetization: OpenCut + HunyuanVideo 1.5 + Voicebox + ACE-Step + OpenMontage (12 pipelines). Auto-monetization: video → YouTube/TikTok + Hostamar CDN + bKash paywall (target). White-label headless render API at $0.10/min (target). | Station is LIVE: `/tv` + 362 published entries served from B2 via signed URLs; `/tv/watch` SEO pages. |
| 3 | **EU-BD GPU spot market** (privacy-first) | Sovereign cloud where data never touches the US — for BD + EU customers under tightening data-residency law. Market reference prices: RTX 4090 spot ~$0.20/h, H100 ~$1.5/h. Infisical + OpenObserve for compliance/audit. | Not started as a product. Local infra (podman, Infisical, openobserve-wsl) is the seed. |

## Users

- Bangla-first creators and SMBs in Bangladesh: mobile-first, 3G-sensitive, bKash payers.
- Developers/agent builders who need hosted compute with memory (Agent Cloud, later).
- EU + BD customers with data-residency requirements (GPU spot market, later).
- Operator = solo founder, no support staff: every tier-1 flow must self-resolve
  (cron employees + agent tiering) or escalate honestly.

## Current shipped scope (verified live)

- `/tv`, `/api/tv`, `/api/tv/live`, `/models.json` all HTTP 200.
- `/models.json` = version 40: models.total 152, categories 10, edge_tools 53, renders 168.
- `/api/tv` = count 362, source `b2-cache`, `b2_only: true`.
- Video storage: Backblaze B2 bucket `hostamar-prod`, **PRIVATE**, served via Cloudflare
  Worker signed URLs (AWS SDK S3Client getSignedUrl) + Bandwidth Alliance free egress.
- `api.hostamar.com` = Cloudflare Worker api-router: PRIMARY omni :20128 via Cloudflare
  tunnel `hostamar-primary`, FALLBACK alwaysdata.
- DB: Turso primary with mirror chain Turso→Supabase→Neon on a 6h schedule.
- WAF: 100 req/10s rate limit. Local fleet: podman + docker containers; nvidia guard at
  127.0.0.1:12436/v1 (6 models) with kilo.ai fallback (384 models).

## Pending (do not present as shipped)

- **bKash tokenized checkout: PENDING.** Until it lands, no paid claims and no
  payment go-live. All monetization copy must stay honest about this.
- **GitHub push: BLOCKED** (account suspended, appeal #4892433). Documentation must not
  claim GitHub CI is active; Forgejo (git.hostamar.com) is the live git host.
- Agent Cloud and the GPU spot market exist as goals only, not features.

## Non-negotiable rules

- Zero paid services; no card on file anywhere, ever.
- B2 bucket stays PRIVATE — signed URLs only; making it public is permanently rejected.
- Secrets live only in self-hosted Infisical; never in git.
- Degrade honestly when a provider is down; never fabricate success.
