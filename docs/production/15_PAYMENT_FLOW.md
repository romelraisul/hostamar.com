# Hostamar.com — Payment Flow (bKash Send Money)

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** Infrastructure complete, checkout CPU limit on free tier

## Payment Flow Overview

```
User → /pricing → Select Plan → /api/store/checkout → Medusa Order Created
                                                    ↓
User sends ৳X to bKash 01822417463 (personal Send Money) with reference
                                                    ↓
User submits TrxID → /api/billing/verify-trx → Transaction: pending_verification
                                                    ↓
Admin reviews → /api/admin/payments/approve/[id] → Subscription active + credits
```

## Pricing Tiers (1cr = 1 BDT = 1 HOST coin)

| Plan | Price (BDT) | Credits | Videos/Month | Storage |
|------|-------------|---------|--------------|---------|
| Starter | ৳990 | 6,000 | 20 | 10 GB |
| Pro | ৳1,900 | 13,000 | 200 | 100 GB |
| Business | ৳2,900 | 30,000 | 999 | 500 GB |

**bKash Personal Number:** `01822417463` (Send Money only, NOT Cash Out)

## Key API Endpoints

### 1. GET /api/store/products
Returns 124 products with `variantId` and `amountBdt`.
```bash
curl -s https://hostamar.com/api/store/products | jq '.products[0]'
# {id: "prod_...", title: "AI Music - ACE-Step", variantId: "variant_...", amountBdt: 990}
```

### 2. POST /api/store/checkout
Creates Medusa order via bridge worker.
```bash
curl -X POST https://hostamar.com/api/store/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": "variant_01M26X2BMJKZXBYJAH14K3MZNP",
    "email": "buyer@example.com",
    "name": "Buyer Name",
    "address1": "123 Street",
    "city": "Dhaka",
    "phone": "01712345678"
  }'
```
**Known Issue:** Returns error 1102 (Cloudflare Worker CPU limit exceeded on free tier). The bridge worker call takes >10ms CPU.
- Primary bridge: `https://hostamar-medusa-bridge.romelraisul.workers.dev` (works standalone)
- Fallback: `https://store.hostamar.com`

### 3. POST /api/billing/verify-trx
Records TrxID for admin verification.
```bash
curl -X POST https://hostamar.com/api/billing/verify-trx \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<jwt>" \
  -d '{"trxId": "ABC123XYZ", "plan": "starter", "amount": 990}'
```
Response: `{ok: true, status: "pending_verification", credits: 6000}`

### 4. POST /api/admin/payments/approve/[transactionId]
Admin approves payment, grants credits, activates subscription.
```bash
curl -X POST https://hostamar.com/api/admin/payments/approve/txn_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<admin_jwt>" \
  -d '{"planOverride": "pro"}'
```

## Test Commands

```bash
# 1. Verify products API
curl -s https://hostamar.com/api/store/products | jq '.count'
# Expected: 124

# 2. Test bridge worker directly (bypasses CPU limit)
curl -s -H "x-publishable-api-key: pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad" \
  https://hostamar-medusa-bridge.romelraisul.workers.dev/store/products?limit=1 | jq '.products[0].title'

# 3. Test verify-trx (requires auth)
# Login first, then:
curl -X POST https://hostamar.com/api/billing/verify-trx \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<jwt>" \
  -d '{"trxId": "TEST123", "plan": "starter", "amount": 990}'

# 4. Admin approve (requires admin auth)
curl -X POST https://hostamar.com/api/admin/payments/approve/txn_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<admin_jwt>"
```

## Known Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Checkout error 1102 | Cloudflare Pages worker free tier 10ms CPU limit | Move checkout to dedicated Cloudflare Worker (not Pages) or upgrade to Workers Paid |
| Bridge worker works | Dedicated Worker has 10ms but bridge is simple proxy | Use bridge directly for checkout, or deploy checkout as separate Worker |
| MEDUSA_URL not in wrangler-pages.toml | Uses fallback to store.hostamar.com | Add MEDUSA_PK as secret, MEDUSA_URL as var |

## Bridge Worker (Working)

**URL:** `https://hostamar-medusa-bridge.romelraisul.workers.dev`
**Auth:** `x-publishable-api-key: pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad`

```bash
# Test bridge
curl -H "x-publishable-api-key: pk_8aab3cc7de63feb0ce7315d1f679f86494bb5776bae47b25070f4b732349a6ad" \
  https://hostamar-medusa-bridge.romelraisul.workers.dev/store/products?limit=5
```

## Database Schema (Prisma)

Key models: `Transaction`, `Subscription`, `Customer`, `Lead`
- Transaction: `gatewayTrxId` (unique), `status` (pending_verification/pending/completed), `creditsAdded`
- Subscription: `plan` (STARTER/PRO/BUSINESS), `status` (active/cancelled), `videosPerMonth`, `storageGB`

## Verification Checklist

- [ ] `/api/store/products` returns 124 products ✓
- [ ] Bridge worker returns products ✓
- [ ] `/api/billing/verify-trx` accepts TrxID (needs auth)
- [ ] `/api/admin/payments/approve` grants credits (needs admin auth)
- [ ] Checkout works via bridge (CPU limit issue)
- [ ] bKash number 01822417463 displayed on pricing page ✓