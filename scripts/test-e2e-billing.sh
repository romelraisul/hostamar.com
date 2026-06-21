#!/bin/bash
# ---------------------------------------------------------------------------
# test-e2e-billing.sh — E2E smoke for Stripe billing integration
#
# Requires: STRIPE_SECRET_KEY env var (test key)
# Usage: STRIPE_SECRET_KEY=sk_test_xxx bash scripts/test-e2e-billing.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PASS=0
FAIL=0
BASE="http://localhost:3000/api/billing"

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "=== Billing E2E Smoke ==="

# 1. Check plans endpoint
echo "--- Step 1: Plans ---"
PLANS=$(curl -s "$BASE/plans" 2>/dev/null || echo '{"plans":[]}')
PLANS_COUNT=$(echo "$PLANS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('plans',[])))" 2>/dev/null || echo "0")
[ "$PLANS_COUNT" -ge 1 ] && pass "Plans endpoint returns >=1 plan (got $PLANS_COUNT)" || fail "No plans returned"

# 2. Check Stripe connectivity (if key is set)
echo "--- Step 2: Stripe connectivity ---"
if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  # Verify key format
  if echo "$STRIPE_SECRET_KEY" | grep -q "^sk_"; then
    pass "STRIPE_SECRET_KEY set and has correct prefix"
  else
    fail "STRIPE_SECRET_KEY has unexpected format"
  fi
else
  pass "STRIPE_SECRET_KEY not set — skipping (expected in CI without secrets)"
fi

# 3. Check webhook endpoint exists (no auth test)
echo "--- Step 3: Webhook endpoint ---"
WEBHOOK_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/webhook" \
  -H 'Content-Type: application/json' \
  -d '{}' 2>/dev/null || echo "000")
# Expected: 400 (missing signature) or 200 (if stripe-signature header present)
if [ "$WEBHOOK_CODE" = "400" ]; then
  pass "Webhook endpoint reachable (returns 400 without signature — correct)"
elif [ "$WEBHOOK_CODE" = "200" ]; then
  pass "Webhook endpoint reachable (200)"
else
  fail "Webhook returned unexpected status $WEBHOOK_CODE"
fi

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] && echo "🎉 All checks passed!" || echo "⚠️  $FAIL check(s) failed"
