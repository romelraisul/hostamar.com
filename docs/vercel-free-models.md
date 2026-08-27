# Vercel AI Gateway — Free Models (?freeTier=true)

Source: https://vercel.com/ai-gateway/models?freeTier=true — Vercel AI Gateway lists 316 models, **217 availableToFreeTier** at lower rate limits, on $5 included credit (no card).

## $0 / $0 input/output — truly free (2 models)
| Model | Input $/M | Output $/M | FreeTier | Use case |
|---|---|---|---|---|
| `inclusionai/ling-3.0-flash-free` | $0 | $0 | ✅ | Fast cheap fallback |
| `poolside/laguna-s-2.1-free` | $0 | $0 | ✅ | Coding fallback |

## Best free-tier eligible for Hostamar (recommended order)
| Model | Input $/M | Output $/M | FreeTier | Use case |
|---|---|---|---|---|
| `openai/gpt-oss-120b` | ~$0.04 | ~$0.16 | ✅ (shown as Free Tier eligible) | **Primary chatbot** — big context, best quality free |
| `google/gemini-2.5-flash-lite` | ~$0.10 | ~$0.40 | ✅ | Fast fallback, Bangla good |
| `openai/gpt-5-nano` | ~$0.05 | ~$0.40 | ✅ | General fallback |
| `moonshotai/kimi-k2` | ~$0.60 | ~$2.50 | ✅ Free Tier eligible | Long context fallback |

## Implementation for Hostamar
- Primary in `lib/ai-gateway.ts` + `app/api/chat/vercel/route.ts`: `openai/gpt-oss-120b` → fallbacks `google/gemini-2.5-flash-lite`, `inclusionai/ling-3.0-flash-free`, `poolside/laguna-s-2.1-free`
- Existing `app/api/chat/route.ts` keeps kilo-edge (free, same $0) — vercel gateway is additive (`/api/chat/vercel` + `/api/chat/openai-compat`)
- Frontend `app/dashboard/chat/page.tsx` can switch `fetch('/api/chat')` to `fetch('/api/chat/vercel')` or keep kilo — both free, vercel needs no extra SDK key on Vercel (auto `VERCEL_OIDC_TOKEN`)

## How to verify
- `curl -X POST https://hostamar.com/api/chat/vercel -H "Content-Type: application/json" -d '{"prompt":"Hello in Bangla"}'` → `{reply, model: openai/gpt-oss-120b, provider: vercel-gateway}`
- Dashboard: https://vercel.com/ai-gateway/models?freeTier=true → filter Free Tier, count 217/316
- Don't commit keys: `vercel env add AI_GATEWAY_API_KEY production` + `.env.local`, fallback to `VERCEL_OIDC_TOKEN` on Vercel (no key in code).

## Cost table (gateway, no markup)
| Provider | Example | FreeTier rate limit | Note |
|---|---|---|---|
| Vercel Gateway | gpt-oss-120b | lower limits but within $5 | $5 included — no card, 217 models |
| Kilo edge | minimax-m3:free | unlimited free | Hostamar existing free |
