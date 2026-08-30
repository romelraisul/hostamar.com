# Customer Satisfaction Metrics — 105 Unique Products — FULL FREE (v7, 2026-08-30)

**Policy change shipped in this release: after signup, NO credit restrictions.**
6000 credits shown, nothing deducts, nothing blocks, no 402 anywhere.
Usage is still logged (free-tier analytics rows at cost 0) but never enforced.

## How to re-enable metered mode later
`lib/credits.ts` → `FREE_TIER_ENABLED = false`. The full race-safe metered
implementation (CreditAccount + Customer.credits paths, 402+bKash) is
preserved intact and dormant in the same file. One flag, one deploy.

## What is now FREE (no check, no deduction, no 402) — verified live
| Product | Before | Now (v7) |
|---|---|---|
| Activate any of 105 AI services | −15..100cr, 402 if low | FREE, always allowed |
| Pinned-chat revisions | −5cr per revision | FREE, unlimited, same permanent thread |
| Video generate (s01-s50) | −15..100cr | FREE |
| Game servers (Minecraft/CS2/…) | −20..80cr | FREE |
| IDE sessions (vscode/pycharm/jupyter) | −10..15cr/hr | FREE |
| Browser sessions | −5cr/hr | FREE |
| Authed chat (120 models) | −1cr/1k tokens, 402 precheck | FREE — usage logged only |
| bKash panel | required to top up | optional — kept for future premium |

## Verified flows (fresh user, live prod)
- signup → 6000 credits, unlimited:true, isFree:true ("Full Free — Test All Products")
- /dashboard 0.40s page, stats 1.5-1.9s (insight lazy, non-blocking)
- /dashboard/chat 61KB, /game 55KB, /ide 54KB — real content, no login redirect
- Activate voiceover with EMPTY inputs → chat created, credits STAY 6000
- Materials → delivered (full Bangla deliverable) → revision → still 6000
- 10-service activation loop → all 200, zero 402s (see test suite)

## UI shipped
- Activate buttons: "Free • Activate" (always enabled)
- Price badge: Fiverr $20-50 struck through vs "You: FREE"
- Modal footer: "Cost: FREE • You have 6000 credits • Unlimited free testing"
- Chat view: revisions show "ফ্রি, আনলিমিটেড" — no -5cr anywhere
- Game/IDE/Browser cards: "ফ্রি" badges, no cr/hr

## Honesty notes
- Rate limits (signup 5/h IP, login 10/15m, chat 100/min, support 30/min) are
  UNCHANGED — full-free means free of credit restrictions, not free of abuse
  protection. Per-instance sliding windows as documented.
- CreditTransaction rows are written at amount=0 (`free:*` product tag) for
  usage analytics; the admin dashboard can see what customers test.
- The bKash flow stays fully wired for when paid plans return.
