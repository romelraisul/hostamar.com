# Monetization — bKash auto-verify + Stripe/PayPal + Subscription + Affiliate

## Pricing 3 tiers (6000 credit = 6000 Taka)
| Tier | Taka | Credits | USD @126.25 | Hosting |
|------|------|---------|-------------|---------|
| Starter | 599 | 6000 | $4.75 | 10GB Most Popular |
| Pro | 1299 | 13000 | $10.30 | 50GB 2x value |
| Business | 2999 | 30000 | $23.75 | Unlimited |

Credit cost: Video 100cr ($0.10) margin 90%, Chat 1cr margin 95%, 50 services 15-100cr margin 80%+

## bKash auto-verify (zero-card fallback)
- `lib/bkash.ts`: regex `^[A-Z0-9]{10}$` + amount 599/1299/2999 + duplicate check `Transaction.gatewayTrxId` -> auto-approve if matches, else pending.
- `POST /api/payments/bkash/verify {trxId, amount, phone}` -> if valid: `Transaction.status=approved`, `CreditTransaction +6000/+13000/+30000`, `SeoEvent payment_success`, `notifySlack`, `generateInvoice`.
- If bKash API unavailable, same pattern. Admin `/admin` Transactions লেনদেন can manual approve.

## Stripe + PayPal (global)
- `lib/stripe.ts` `createCheckoutSession(tier)` lazy import `stripe`, `$cents` from PRICING, metadata tier/credits. `isStripeConfigured()` checks `STRIPE_SECRET_KEY`.
- `POST /api/payments/stripe/create-checkout {tier}` -> 503 `{fallback: bkash_only}` if not configured, else `{url, sessionId}`. `POST /api/payments/stripe/webhook` -> `checkout.session.completed` -> `fulfillPayment`.
- `lib/paypal.ts` same via REST `api-m.sandbox.paypal.com` / live, `POST /api/payments/paypal/create-order` -> `{orderId, approveUrl}`, `POST /api/payments/paypal/capture {orderId}` -> `fulfillPayment`, `POST /api/payments/paypal/webhook`.
- `lib/payments/fulfill.ts` shared: credits + Subscription + Referral 500cr +10% Taka (60 for starter) + invoice + SeoEvent + Slack.
- ENV: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_ENV=sandbox|live`, `NEXT_PUBLIC_SITE_URL`.
- UI `/pricing` Bangla: dual `৫৯৯ টাকা ≈ $৪.৭৫ @১২৬.২৫` live from `/api/binance-price`, bKash `#E2136E` TrxID `ট্রানজেকশন আইডি লিখুন` -> `যাচাই করুন` -> `যাচাই হচ্ছে...` -> `৬০০০ ক্রেডিট যোগ হয়েছে`, Stripe `#635BFF` `Pay with Stripe`, PayPal `#FFC439`.

## Subscription + renewal
- `Subscription` added `stripeSubscriptionId?`, `paypalSubscriptionId?`, `autoRenew @default(true)`, `creditsPerMonth 6000`.
- Cron `GET /api/cron/subscription-renew` `0 2 * * *` Bearer `CRON_SECRET`, finds `nextBillingDate < now && autoRenew && status=active`, tries Stripe invoice else PayPal else pending, extends +1 month, credits, Bangla email `আপনার সাবস্ক্রিপশন নবায়নের সময় হয়েছে`.
- `/dashboard/credits` Bangla ক্রেডিট circular meter `৬০০০/৬০০০ অবশিষ্ট/ব্যবহৃত #0E7C3A 79%`, cost pills 15/25/40/75/100cr, `bKash Renew #0E7C3A`, Subscription card `আপনার প্ল্যান: Starter ৫৯৯ টাকা/মাস • পরবর্তী নবায়ন ২৭ আগস্ট` + Cancel/Upgrade, chart recharge vs spend.

## Invoice PDF Bangla
- `lib/invoice.ts` `jsPDF` + `NotoSansBengali.ttf` `addFileToVFS/addFont`, header `#0E7C3A`, `INV-{YYYYMMDD}-{id}`, customer, tier, credits, TrxID, BIN, footer `ধন্যবাদ`, save `/public/invoices/*.pdf` + MinIO `s3.hostamar.com/invoices/*` via `@aws-sdk/client-s3` if `S3_ENDPOINT` set.
- On payment: `SeoEvent payment_success` + `Transaction` + `CreditTransaction` + Slack `💰 New payment 599 Taka Starter 6000cr user@example.com TrxID ABC123` if `SLACK_WEBHOOK_URL`.

## Affiliate 10% viral
- `lib/referral.ts` `generateReferralCode()` 6 chars `A-Z2-9` no I/O, `rewardReferrerOnPayment()` 500cr +10% Taka (60 starter) via `Referral` `pending->paid`.
- `GET /api/referral/code` + `POST /api/referral/create` auth, `ReferralCapture.tsx` `?ref=ABC123` -> `localStorage hostamar_ref` + cookie `affiliate_ref 30d` in `app/layout.tsx`, signup `Referral.create {bonusAmount:60}`.
- `POST /api/referral/withdraw` bKash min 100৳, `GET /api/admin/referrals` + `[id]/approve` payout.
- `/dashboard/referral` Bangla রেফারেল: code `ABC123`, link `https://hostamar.com/?ref=ABC123`, total referrals, `১৫০০ ক্রেডিট + ১৮০ টাকা`, Withdraw bKash.

## Admin 8 tabs Bangla
- `ওভারভিউ/ইউজার/ক্রেডিট/লেনদেন/মডেল·১২০/প্রোডাক্ট·৫০+/হোস্টিং/রেফারেল` new Referrals রেফারেল payout, Overview profit `total revenue - cost = margin 80%`.

## How to add Stripe keys
```
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add PAYPAL_CLIENT_ID production
vercel env add PAYPAL_SECRET production
# fallback bKash only if not set — zero-card deploy stays green
```

## Verify
```
curl https://hostamar.com/api/binance-price | jq .usdtBdt # 126.25
curl -X POST https://hostamar.com/api/payments/bkash/verify -H "Content-Type: application/json" -d '{"trxId":"ABC123DEF4","amount":599}' | jq # -> approved +6000 + invoiceUrl
curl -X POST https://hostamar.com/api/payments/stripe/create-checkout -H "Content-Type: application/json" -d '{"tier":"starter"}' | jq # -> 503 bkash_only if no keys, else url
curl -H "Authorization: Bearer $JWT" https://hostamar.com/api/referral/code | jq # -> {code, link}
curl https://hostamar.com/api/market-adjust | jq # no_change | pending_approval diff>2%
```
