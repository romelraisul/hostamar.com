# Billing — setup and operations

## GitHub Secrets to add

| Secret | Value | Where to get |
|--------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → API keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → endpoint signing secret |
| `STRIPE_PRICE_FREE` | `price_...` | Stripe Dashboard → Products → price ID |
| `STRIPE_PRICE_STARTER` | `price_...` | Stripe Dashboard → Products → price ID |
| `STRIPE_PRICE_BUSINESS` | `price_...` | Stripe Dashboard → Products → price ID |

## Local development

```bash
# Set test keys
export STRIPE_SECRET_KEY=sk_test_xxx
export STRIPE_PUBLISHABLE_KEY=pk_test_xxx
export STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# Forward webhooks locally
stripe listen --forward-to localhost:3000/api/billing/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Webhook endpoint

Production: `https://hostamar.com/api/billing/webhook`  
Staging: `https://staging.hostamar.com/api/billing/webhook`

Configure in Stripe Dashboard → Webhooks → Add endpoint.  
Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

## Testing

```bash
# Run billing smoke (requires test keys in env)
bash scripts/test-e2e-billing.sh

# Run unit tests for billing routes
npm run test:billing
```

## Rollback

- Revert the billing commit and redeploy.
- Subscription data remains in Stripe — no data loss.
- Run `ALTER TABLE "Customer" DROP COLUMN "stripeCustomerId"` if reverting DB migration.
