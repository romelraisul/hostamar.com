#!/usr/bin/env bash
# scripts/test-provision-bridge.sh
# Verifies the (B) Agent->Provision bridge end-to-end against a RUNNING server.
# It posts a mock-valid payment to /api/payment/verify, which upserts the
# ledger and calls the INTERNAL_API_KEY-protected /api/internal/provision.
#
# Usage:
#   INTERNAL_API_KEY=xxx bash scripts/test-provision-bridge.sh            # -> http://localhost:3000
#   BASE_URL=https://hostamar.com INTERNAL_API_KEY=xxx bash scripts/test-provision-bridge.sh
#
# Requirements on the target server:
#   - DATABASE_URL pointing at a DB with the ProvisioningLedger migration applied
#   - INTERNAL_API_KEY env set (used by /api/internal/provision)
#   - APP_BASE_URL set to the server's own origin (so verify can call provision)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TRAIN_ID="TEST-$(date +%s)"
PLAN="starter"
EMAIL="test@hostamar.com"

echo "=== (B) provision bridge test ==="
echo "BASE_URL=$BASE_URL  tran_id=$TRAIN_ID  plan=$PLAN"

if [ -z "${INTERNAL_API_KEY:-}" ]; then
  echo "WARN: INTERNAL_API_KEY not set in env; the internal provision call will 401 unless the server has it configured." >&2
fi

RESP=$(curl -sS --max-time 30 "$BASE_URL/api/payment/verify" \
  -H 'Content-Type: application/json' \
  -d "{\"tran_id\":\"$TRAIN_ID\",\"status\":\"mock_valid\",\"customer_email\":\"$EMAIL\",\"plan\":\"$PLAN\"}")

echo "verify response: $RESP"

PROVISIONED=$(printf '%s' "$RESP" | python3 -c "import sys,json;print(str(json.load(sys.stdin).get('provisioned')).lower())" 2>/dev/null || echo "parse-error")

if [ "$PROVISIONED" = "true" ]; then
  echo "PASS: provisioned=true"
  exit 0
else
  echo "FAIL: provisioned=$PROVISIONED (expected true)" >&2
  exit 1
fi
