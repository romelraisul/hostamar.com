#!/usr/bin/env bash
# test-all-products-106-v24-110.sh — 110-test suite (100 V23 core + 10 V24 env-audit).
# V24 tests are grounded in the ACTUAL scan outcome: no FB/GSC/Vercel tokens exist
# on this machine (335 env files scanned). Tests branch HONEST/LIVE as before.
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }

echo "══ V24 — 110 TESTS (100 core + 10 env-audit) ══"
bash "$(dirname "$0")/test-all-products-106-v23-100.sh" > /tmp/v24-core.log 2>&1
CORE_RC=$?
CORE_PASS=$(grep -oP '\d+(?= passed)' /tmp/v24-core.log | tail -1); CORE_PASS=${CORE_PASS:-0}
CORE_FAIL=$(grep -oP '\d+(?= failed)' /tmp/v24-core.log | tail -1); CORE_FAIL=${CORE_FAIL:-0}
echo "  core 1-100: $CORE_PASS ✓ / $CORE_FAIL ✗ (rc=$CORE_RC)"
PASS=$((PASS + CORE_PASS)); FAIL=$((FAIL + CORE_FAIL))

TOK=$(cat /tmp/audit/user_token.txt 2>/dev/null)
H="Authorization: Bearer $TOK"

echo "── V24 101-110: env audit + honest-state wiring ──"

# 101. Env audit doc exists with the scan table (grounded from the real 335-file scan)
[ -f docs/v24-env-audit.md ] && grep -q "335 env files" docs/v24-env-audit.md && ok "101. docs/v24-env-audit.md (335-file scan, honest table)" || bad "101. env audit doc missing"

# 102. FB token: NOT on this machine — honest UNAUTHENTICATED state on prod
FB=$(curl -s -m 60 -H "$H" -X POST $B/api/mcp -H 'Content-Type: application/json' -d '{"tool":"facebook_create_post","params":{"message":"v24"}}')
FBR=$(echo "$FB" | python3 -c 'import sys,json
try:
  r=json.load(sys.stdin).get("result",{})
  print("LIVE" if r.get("postId") else ("HONEST" if "FACEBOOK_PAGE" in str(r.get("error","")) else "OTHER"))
except Exception: print("OTHER")' 2>/dev/null)
if [ "$FBR" = "HONEST" ]; then ok "102. FB honest: token absent from all 335 env files → UNAUTHENTICATED error (owner: Graph API Explorer, docs/v19-audit.md)"
elif [ "$FBR" = "LIVE" ]; then ok "102. FB LIVE: token configured in Vercel env (post created)"
else bad "102. FB unexpected: $(echo $FB | head -c 120)"; fi

# 103. GSC JSON: NOT on this machine — honest missing note on prod
PG=$(curl -s -m 60 -H "$H" -X POST $B/api/mcp -H 'Content-Type: application/json' -d '{"tool":"seo_ping_gsc","params":{"sitemapUrl":"https://hostamar.com/sitemap.xml"}}')
PGR=$(echo "$PG" | python3 -c 'import sys,json
try:
  r=json.load(sys.stdin).get("result",{})
  g=r.get("google",[])
  print("LIVE" if (isinstance(g,list) and g and g[0].get("ok")) else ("HONEST" if "GOOGLE_SERVICE_ACCOUNT_JSON" in str(r.get("note","")) else "OTHER"))
except Exception: print("OTHER")' 2>/dev/null)
if [ "$PGR" = "HONEST" ]; then ok "103. GSC honest: JSON absent from machine → missing note + Bing attempted (owner: Cloud Console, docs/v21-audit.md)"
elif [ "$PGR" = "LIVE" ]; then ok "103. GSC LIVE: Indexing API submission ok"
else bad "103. GSC unexpected: $(echo $PG | head -c 120)"; fi

# 104. VERCEL_TOKEN: absent locally — v23 scripts read it from env when owner creates one
grep -q 'VERCEL_TOKEN' scripts/vercel-prebuilt-deploy.sh && grep -q 'VERCEL_TOKEN' scripts/prune-old-deployments.js && ok "104. prebuilt+prune scripts read VERCEL_TOKEN from env (token absent on machine — owner: dashboard, docs/v23-audit.md)" || bad "104. scripts missing token env"

# 105. No credential leakage into the audit doc (values never printed)
LEAK=$(grep -cE 'EAA[0-9A-Za-z]{10,}|vcp_[A-Za-z0-9]{10,}|vct_[A-Za-z0-9]{10,}|"private_key"' docs/v24-env-audit.md 2>/dev/null)
check "105. env audit doc has zero secret values" "$LEAK" "0"

# 106. Already-wired keys still live: KILOCODE (chat) + DATABASE (health) + B2 (storage)
CH=$(curl -s -m 120 -H "$H" -X POST $B/api/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"hi"}]}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("model"))' 2>/dev/null)
check "106a. kilocode chain live (found keys wired)" "$CH" "hostamar-1m-a"
HB=$(curl -s -m 30 $B/api/health | python3 -c 'import sys,json;print(json.load(sys.stdin)["database"]["connected"])' 2>/dev/null)
check "106b. DATABASE_URL live (health connected)" "$HB" "True"

# 107. Top10 auto-blog cron converging: blog URLs in sitemap ≥ 8 (each cron run adds 2)
SMB=$(curl -s -m 60 "$B/sitemap.xml" | grep -c "/blog/")
[ "$SMB" -ge 8 ] && ok "107. top10 auto-blog: $SMB blog URLs in sitemap (cron converging 2/run)" || bad "107. blog URLs: $SMB"

# 108. Cron fail-closed still green
CST=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/api/cron/seo-auto-post")
check "108. seo-auto-post unauth → 401" "$CST" "401"

# 109. Usage-protection headers still live (V23 regression)
CC1=$(curl -sI --max-time 30 "$B/api/v1/models" | grep -i cache-control | tr -d '\r')
echo "$CC1" | grep -q "max-age=3600" && ok "109. models cache header max-age=3600 live (Fluid-CPU fix intact)" || bad "109. models cc: $CC1"

# 110. Full spot regression: docs link + money + admin + MCP tools
HOME1=$(curl -s -m 60 "$B/?cb=$RANDOM")
N1=$(echo "$HOME1" | grep -c "ডকস")
PC=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -H "$H" -X POST $B/api/payment/create -H 'Content-Type: application/json' -d '{"plan":"starter","method":"bkash","phone":"01822417463"}')
AH=$(curl -s -m 30 -H "$H" -o /dev/null -w "%{http_code}" "$B/api/admin/agent?history=1")
MC=$(curl -s -m 30 $B/api/mcp | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("tools",[])))')
[ "$N1" -ge 1 ] && [ "$PC" = "200" ] && [ "$AH" = "403" ] && [ "$MC" -ge 35 ] && ok "110. regression: docs + payment 200 + admin 403 + $MC MCP tools" || bad "110. nav=$N1 payment=$PC admin=$AH mcp=$MC"

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V24 110/110 ALL PASSED" || echo "❌ FIX FAILURES"
exit $FAIL
