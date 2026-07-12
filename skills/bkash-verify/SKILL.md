---
name: bkash-verify
description: Use this skill to verify bKash / Nagad / Rocket / USDT payments and reconcile the provisioning ledger before provisioning any account.
---

# bKash Verify Skill

Gate every provisioning action on a verified payment. Never provision an account
without a `tran_id` that `/api/payment/verify` has marked `paid`.

## Steps
1. Extract the `tran_id` and `status` (VALID | mock_valid) from the request.
2. Call `/api/payment/verify` with `{ tran_id, status, customer_email, plan }`.
3. Only if `verified: true` and `provisioned: true`, surface the `loginUrl`.
4. If `verified: false`, report the reason and DO NOT call `/api/internal/provision`.

## Rules
- Mask the customer PIN / OTP. Never log full payment secrets.
- `mock_valid` is only accepted when `ALLOW_MOCK_PROVISION=true` (VPS test env).
- Production must use `status: 'VALID'` validated via SSLCommerz when creds are set.

## Failure modes
- `tran_id` not found in ledger → ask the customer to complete payment first.
- `schema init failed` → DB unreachable; retry once, then escalate to support.
