# Credit Policy — FULL FREE UNLIMITED (v11, 2026-08-30)

**Policy: NO credit restrictions. If there is credit, the user can use it.**
Balances stay 6000/6000, nothing 402s, nothing blocks, no bKash required.
Usage still logs raw-SQL audit rows (amount 0) for analytics.

## Implementation
- `lib/credits.ts` → `FREE_TIER_ENABLED = true` — deductCredits always
  succeeds; getCreditBalance returns 6000/isFree/unlimited. The race-safe
  metered implementation remains DORMANT behind the flag for a future paid
  mode (flip one constant, one deploy).
- All product routes had their v9 raw deduct/402 blocks REMOVED:
  activate, generate, game, ide, browser, chat completions, insight.
- Pinned-chat revisions: FREE unlimited (was product cost in v9).
- Chat OS (Orca IDE): `ACTION_COSTS` all 0; `bill()` always succeeds
  (audit row only). MCP registry: all tool costs 0, `bill()` always ok.
- `/api/dashboard/credits` → {credits: 6000, total: 6000, used: 0, percent: 0,
  isFree: true, unlimited: true, costs all 0, message "FREE UNLIMITED — all
  products free — 6000 bonus credits"}.
- `scripts/reset-all-credits-free.js` — restored 78 drained customers to 6000
  (run against prod DB; idempotent).

## Cost table (all FREE)
| Product | Cost |
|---|---|
| All 105 AI services (activate) | FREE |
| Pinned-chat revisions | FREE unlimited |
| Video generate | FREE |
| Game servers | FREE |
| IDE sessions | FREE |
| Browser sessions | FREE |
| Authed chat (120 models) | FREE |
| Dashboard insight | FREE |
| Chat OS actions (chat/terminal/save/commit/design/mcp/plugin/task/preview) | FREE |
| MCP tool calls (all 11) | FREE |

## UI
All badges now "FREE • Activate" (always enabled), modal footer "Cost: FREE —
unlimited free testing", game/ide/browser "ফ্রি", revision copy "ফ্রি •
আনলিমিটেড", Chat OS hints "(ফ্রি)".

## What is NOT free / kept hard
- Security: auth required everywhere (401s), IDOR guards, rate limits
  (signup 5/h IP, login 10/15m, chat 100/min, chatos 60/min) — abuse
  protection unchanged.
- bKash payment panel remains for future premium but is NOT required.
