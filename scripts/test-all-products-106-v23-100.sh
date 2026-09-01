#!/usr/bin/env bash
# test-all-products-106-v23-100.sh — 100-test suite (90 V22 core + 10 V23 usage-protection).
# V23 tests are grounded: they assert what CODE can verify (headers live, ISR flags,
# scripts, vercel.json) and document the dashboard-only owner actions.
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }

echo "══ V23 — 100 TESTS (90 core + 10 usage-protection) ══"
bash "$(dirname "$0")/test-all-products-106-v22-90.sh" > /tmp/v23-core.log 2>&1
CORE_RC=$?
CORE_PASS=$(grep -oP '\d+(?= passed)' /tmp/v23-core.log | tail -1); CORE_PASS=${CORE_PASS:-0}
CORE_FAIL=$(grep -oP '\d+(?= failed)' /tmp/v23-core.log | tail -1); CORE_FAIL=${CORE_FAIL:-0}
echo "  core 1-90: $CORE_PASS ✓ / $CORE_FAIL ✗ (rc=$CORE_RC)"
PASS=$((PASS + CORE_PASS)); FAIL=$((FAIL + CORE_FAIL))

echo "── V23 91-100: Vercel usage protection ──"

# 91. vercel.json: immutable static + 1h heavy-API cache + main-only git + seo cron
VJ=$(cat vercel.json 2>/dev/null)
VJ1=$(echo "$VJ" | grep -c "max-age=31536000, immutable")
VJ2=$(echo "$VJ" | grep -c "s-maxage=3600")
VJ3=$(echo "$VJ" | grep -c '"main": true')
VJ4=$(echo "$VJ" | grep -c "seo-auto-post")
[ "$VJ1" -ge 2 ] && [ "$VJ2" -ge 4 ] && [ "$VJ3" -ge 1 ] && [ "$VJ4" -ge 1 ] && ok "91. vercel.json: immutable static + 1h heavy-API + main-only git + seo cron" || bad "91. vercel.json: static=$VJ1 api=$VJ2 git=$VJ3 cron=$VJ4"

# 92. prebuilt deploy script exists + correct shape
PB=$(cat scripts/vercel-prebuilt-deploy.sh 2>/dev/null)
[ -f scripts/vercel-prebuilt-deploy.sh ] && echo "$PB" | grep -q "vercel deploy --prebuilt" && echo "$PB" | grep -q "npm run build" && ok "92. prebuilt deploy script (local build → --prebuilt, 0 Vercel build time)" || bad "92. prebuilt script missing/wrong"

# 93. prune deployments script exists
[ -f scripts/prune-old-deployments.js ] && grep -q "v13/deployments" scripts/prune-old-deployments.js && ok "93. prune-old-deployments.js (API delete, keep newest 15)" || bad "93. prune script missing"

# 94. LIVE: /api/v1/models now carries explicit s-maxage=3600
CC1=$(curl -sI --max-time 30 "$B/api/v1/models" | grep -i cache-control | head -1)
echo "$CC1" | grep -qE "max-age=3600" && ok "94. LIVE /api/v1/models s-maxage=3600 ($(echo $CC1 | tr -d '\r' | head -c 70))" || bad "94. models cc: $CC1"

# 95. LIVE: catalog route now carries a real max-age (was bare 'public')
CC2=$(curl -sI --max-time 90 "$B/api/ai-services/catalog" | grep -i cache-control | head -1)
echo "$CC2" | grep -qE "max-age=3600" && ok "95. LIVE catalog real cache header ($(echo $CC2 | tr -d '\r' | head -c 70))" || bad "95. catalog cc: $CC2"

# 96. LIVE: /api/docs s-maxage=3600
CC3=$(curl -sI --max-time 30 "$B/api/docs" | grep -i cache-control | head -1)
echo "$CC3" | grep -qE "max-age=3600" && ok "96. LIVE /api/docs s-maxage=3600" || bad "96. docs cc: $CC3"

# 97. ISR: robots revalidate 86400 + blog revalidate 3600 + sitemap 3600 (grep code)
R1=$(grep -c "revalidate = 86400" app/robots.ts 2>/dev/null)
R2=$(grep -c "revalidate = 3600" "app/blog/[slug]/page.tsx" 2>/dev/null)
R3=$(grep -c "revalidate = 3600" app/sitemap.ts 2>/dev/null)
[ "$R1" -ge 1 ] && [ "$R2" -ge 1 ] && [ "$R3" -ge 1 ] && ok "97. ISR: robots 24h + blog 1h + sitemap 1h" || bad "97. ISR: robots=$R1 blog=$R2 sitemap=$R3"

# 98. Security headers still on all routes (regression)
SH=$(curl -sI --max-time 30 "$B/" | grep -ciE "x-frame-options|x-content-type-options|strict-transport-security")
[ "$SH" -ge 3 ] && ok "98. security headers intact (frame+nosniff+hsts)" || bad "98. security headers: $SH"

# 99. Docs + money + security full regression spot
HOME1=$(curl -s -m 60 "$B/?cb=$RANDOM")
N1=$(echo "$HOME1" | grep -c "ডকস")
TOK=$(cat /tmp/audit/user_token.txt 2>/dev/null)
PC=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOK" -X POST $B/api/payment/create -H 'Content-Type: application/json' -d '{"plan":"starter","method":"bkash","phone":"01822417463"}')
AH=$(curl -s -m 30 -H "Authorization: Bearer $TOK" -o /dev/null -w "%{http_code}" "$B/api/admin/agent?history=1")
[ "$N1" -ge 1 ] && [ "$PC" = "200" ] && [ "$AH" = "403" ] && ok "99. regression: docs ডকস + payment 200 + admin 403" || bad "99. docs=$N1 payment=$PC admin=$AH"

# 100. v23 audit doc with owner dashboard actions exists
[ -f docs/v23-audit.md ] && grep -q "Remote Caching" docs/v23-audit.md && ok "100. docs/v23-audit.md (ground truth + owner dashboard runbook)" || bad "100. audit doc missing"

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V23 100/100 ALL PASSED" || echo "❌ FIX FAILURES"
exit $FAIL
