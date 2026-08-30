# Credit → Coin Plan (V12) — 1cr = 1TK = 1 future HOST coin

## The unit
- **1 credit = 1 TK (Bangladeshi Taka)** — not a dollar fraction.
- **Future: 1 credit = 1 HOST coin** — Hostamar's own crypto coin
  (ERC20/BEP20), whitepaper to be published at launch. Every credit a
  customer holds today maps 1:1 to HOST at coin launch.

## Bonus + purchase
- **Signup bonus: 6000cr (= 6000 TK value)** — spend at any product/service.
- Buy more via bKash (Send Money 01822417463 + TrxID auto-approve):
  | Plan | Pay | Get |
  |---|---|---|
  | Starter | ৳599 | 6,000cr |
  | Pro | ৳1,299 | 13,000cr (+700 bonus) |
  | Business | ৳2,999 | 30,000cr (+100 bonus) |

## Chat token pricing (market-anchored, USD→TK at 120, 1cr=1TK)
| Model | Market anchor | Charge |
|---|---|---|
| hostamar-1m-a | Gemini 3 Pro / Sonnet 5 intro ($2.50/$12.50 per 1M) | 0.3cr/1K in • 1.5cr/1K out • base 1cr |
| hostamar-1m-b | Opus 4.5 ($5/$25) | 0.6cr/1K in • 3cr/1K out • base 2cr |
| hostamar-flash | Gemini Flash batch ($0.25/$0.50) | 0.03cr/1K in • 0.06cr/1K out • base 0.5cr |
| kilo-auto / longcat | budget class ($0.5/$1.5) | 0.06cr/1K in • 0.18cr/1K out • base 1cr |
| Sonnet-class | $3/$15 | 0.36/1.8 per 1K |
| Haiku-class | $1/$5 | 0.12/0.6 per 1K |
| GPT-4 Turbo | $10/$30 | 1.2/3.6 per 1K |

Full table in `lib/pricing/market-pricing.ts` (research: 2026 market tiers —
Opus 4.6 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, GPT-5.4 $2.50/$15,
Gemini 3.1 Pro $2/$12; cheapest floor Gemini Flash-lite/DeepSeek V4 ~$0.50
combined; most expensive GPT-5.5 ~$35 combined).

## AI-services market pricing (Fiverr-anchored, 60% discount)
Anchored to the Fiverr research (voiceover $20-$60 basic / $150-$350 premium,
AI content $25-$60 basic, logo $20-$100, thumbnail $5-$20, faceless video
$10-$50). Hostamar prices at ~40% of Fiverr USD (converted to TK), clamped
100-5000cr, three tiers per product:
- voiceover: 500 / 1200 / 2500cr (vs Fiverr basic ৳2400 — ~79% cheaper)
- logo-design: 400 / 900 / 1800cr
- video-script: 300 / 700 / 1400cr
- thumbnail: 150 / 350 / 700cr
Full curated + formula table in `lib/pricing/ai-services-pricing.ts`.

## Product actions (PAID)
worktree 5cr · fan-prompt 5cr×N · terminal 1cr · file save 1cr ·
git commit 1cr · design-click 1cr · plugin 5cr · task 2cr ·
preview session 5cr/hr · revisions = product tier cost (not free).

## Future coin mechanics (roadmap)
1. ERC20/BEP20 contract HOST, fixed supply aligned to credits outstanding.
2. Snapshot: Customer.credits × 1 = HOST allocation.
3. bKash purchase prices stay TK-pegged; coin trades float.
(This documents the plan; coin launch is an owner decision, no code shipped
for the chain itself.)
