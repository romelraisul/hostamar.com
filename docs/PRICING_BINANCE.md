# PRICING + BINANCE P2P — hostamar.com

Date: 2026-08-26

## The rate that matters

Crypto/crypto-adjacent pricing uses **Binance P2P USDT/BDT** (~122–128), NOT the
Bangladesh Bank rate (~117). All USD displays on Hostamar use this rate.

Live endpoint: `GET /api/binance-price` (public, 5-min cache)

```json
{ "usdtBdt": 127.1, "source": "binance_p2p",
  "welcome": { "taka": 6000, "usd": 47.21 },
  "plans": { "starter": {599, $4.71}, ... } }
```

Source chain: Binance P2P C2C API → CoinGecko tether→bdt → static floor 120.
In-memory cache 1h; hourly cron `/api/cron/binance-price` (daily on Hobby —
Vercel rejects sub-daily crons; upgrade to Pro for hourly).

## Hosting plans (1 credit = 1 Taka, monthly upfront)

| Plan | CPU | RAM | NVMe | Taka/mo | USD (Binance) |
|---|---|---|---|---|---|
| Starter | 1 | 1GB | 25GB | **599৳** | ~$4.71 |
| Basic | 2 | 2GB | 50GB | **1199৳** | ~$9.43 |
| Pro | 2 | 4GB | 80GB | **2499৳** | ~$19.66 |
| Premium | 4 | 8GB | 160GB | **4999৳** | ~$39.33 |

Market anchors: Hetzner CX22 €3.79–5.83 · DO $12 · Vultr $10.

## Usage pricing

- Chat: 0.1 T/1k (Llama small) · 0.5 T/1k (mini/haiku/deepseek/kimi/glm/qwen) ·
  3 T/1k (GPT-4o/Sonnet/Gemini-pro) · 10 T/1k (Opus/o1)
- Video: 150 T per 5s (market: Kling $0.05/s)
- Browser: 1 T per 10 pages
- Welcome bonus: 6000 Taka ≈ $47–49 at signup

## Price mismatch fix

The hosting API originally used a legacy per-spec formula (charged 28 credits for
a Starter server advertised at 599). Fixed: POST /api/hosting/servers now resolves
the request to a plan via `resolveHostingPlan()` and charges `plan.price` — the
advertised monthly price, upfront.

## Future $HOSTA coin

- 1 Credit = 1 Taka ≈ 0.008 USDT = future 1 $HOSTA (1:1 conversion)
- Total supply 1B $HOSTA; existing credit balances are the pre-mine
- Pegged to Binance P2P rate for USD marketing ("6000 Taka ≈ $48 free")
- Teaser live on /pricing; tokenomics section renders from
  `components/pricing-binance.tsx`

## Where it's wired

- `/pricing` — WelcomeBanner (6000 Taka ≈ $X), BinanceBadge (live dot + rate),
  BDT/USD toggle, plan USD strip, HostaTeaser
- `/signup` — Bangla banner: "ফ্রি ৬,০০০ টাকা ক্রেডিট ≈ $50 USD"
- `/api/hosting/servers` — charges plan.price monthly upfront
- `lib/binance.ts`, `lib/pricing.ts` — single sources
