#!/bin/bash
# ---------------------------------------------------------------------------
# test-e2e-onboarding.sh — E2E smoke for Onboarding V2
#
# Usage: bash scripts/test-e2e-onboarding.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PASS=0; FAIL=0
BASE="http://localhost:3000"
pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "=== Onboarding V2 E2E Smoke ==="

# 1. Health check
echo "--- Step 1: Health ---"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/health" 2>/dev/null || echo "000")
[ "$CODE" = "200" ] && pass "Health endpoint returns 200" || fail "Health returned $CODE"

# 2. Feature flag forces v2
echo "--- Step 2: Feature flag ---"
FLAG_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/?ff_onboarding_v2=v2" 2>/dev/null || echo "000")
[ "$FLAG_CODE" = "200" ] && pass "Page loads with ff_onboarding_v2=v2" || fail "Page returned $FLAG_CODE"

# 3. Email endpoint (valid)
echo "--- Step 3: Email submission (valid) ---"
EMAIL_RES=$(curl -s -X POST "$BASE/api/onboarding/email" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test+onboard@example.com","source":"test"}' 2>/dev/null || echo '{}')
EMAIL_OK=$(echo "$EMAIL_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok', False))" 2>/dev/null || echo "false")
[ "$EMAIL_OK" = "True" ] && pass "Email accepted" || fail "Email rejected: $EMAIL_RES"

# 4. Email endpoint (invalid)
echo "--- Step 4: Email submission (invalid) ---"
INVALID_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/onboarding/email" \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email"}' 2>/dev/null || echo "000")
[ "$INVALID_CODE" = "400" ] && pass "Invalid email rejected (400)" || fail "Invalid email returned $INVALID_CODE"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] && echo "🎉 All checks passed!" || echo "⚠️  $FAIL check(s) failed"
