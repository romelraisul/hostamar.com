# Strict Credit Deduction — Every Point (v9, 2026-08-30)

**Policy: NOTHING is free except the 6000 welcome credits at signup.**
Every product, service activation, revision, chat, insight, MCP tool call,
and session deducts real credits. Insufficient → 402 + bKash 01822417463.

## The one flag
`lib/credits.ts` → `FREE_TIER_ENABLED = false` — the race-safe metered
implementation is ACTIVE again (v7's no-op lives behind the flag if ever needed).

## Points that deduct (amount)
| Point | Cost | On insufficient |
|---|---|---|
| Service activation (105 catalog) | service.creditCost (15-100cr) | 402 + bKash + plans 599/1299/2999 |
| **Pinned-chat REVISION** | **SAME as product cost** (order.creditCost) — NOT -5cr, NOT free | AI replies with top-up message |
| Video generate (s01-s50) | service.creditCost | 402 + bKash |
| Game server start | 20-80cr | 402 + bKash |
| IDE session | 10-15cr | 402 + bKash |
| Browser session | 5cr | 402 + bKash |
| Authed chat (120 models) | 1cr / 1000 tokens, min 1 | 402 + bKash |
| Dashboard insight (lazy green card) | 2cr | 402 |
| MCP: analyze_image | 5cr | 402 |
| MCP: sequential_thinking / deep_think | 2cr | 402 |
| MCP: run_browser_agent | 5cr | 402 |
| MCP: gateway_chat | 1cr | 402 |
| MCP: activate_service | service.creditCost | 402 |

## Points that stay free (viewing only)
Catalog search/browse, dashboard stats, auth/me, TV viewing, support chat,
MCP manifest + search_catalog + dashboard_stats (own data), health.

## Revision rule (the headline change)
`lib/pinned-chat.ts`: `revCost = order.creditCost` — a Voiceover (40cr) order
pays 40cr per revision. Math verified: 6000 → activate 5960 → revision 5920.
Same permanent 📌 thread forever — but every revision costs.

## Recharging
bKash 01822417463 (Send Money + TrxID) → auto-payments cron validates
TrxID ^[A-Za-z0-9]{8,15}$ + plan amounts 599/1299/2999 → Transaction
completed + Notification + 6000cr grant. Recharge verified E2E earlier this
session (0 → 6000 after TrxID approve).

## MCP servers (12, zero cost, 1mcp pattern) — lib/mcp/registry.ts + /api/mcp
catalog-mcp, pinned-chat-mcp, vision-mcp, sequential-thinking-mcp,
deep-think-mcp, browser-mcp, webmcp-gateway-mcp (list/call), model-gateway-mcp,
analytics-mcp, insight-mcp — every billable tool calls deductCredits FIRST.
WebMCP-compatible: clients can register via navigator.modelContext; the
manifest at GET /api/mcp lists servers/tools/costs.
