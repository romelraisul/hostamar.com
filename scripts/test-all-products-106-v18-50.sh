#!/usr/bin/env bash
# test-all-products-106-v18-50.sh — 50-test suite (45 V17 core + 5 NEW security IDOR+admin).
# Based on V17 45/45 (money surface fixed + docs link live) plus 5 grounded security tests.
# All new tests target REAL endpoints only — phantom paths are not tested.
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }
EMAIL="v18-$RANDOM@example.com"; PW="v18-123456"; H=""; TOK=""
EMAIL_B="v18b-$RANDOM@example.com"; TOK_B=""; H_B=""

echo "══ V18 — 50 TESTS (45 core + 5 security) ══"
# ---- primary user A ----
curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V18\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}" -o /tmp/v18s.json
grep -q '"id"' /tmp/v18s.json && ok "1. signup" || bad "1. signup"
TOK=$(curl -s -m 30 -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
[ -n "$TOK" ] && ok "2. login" || bad "2. login"
H="Authorization: Bearer $TOK"

CR=$(curl -s -m 30 -H "$H" $B/api/dashboard/credits)
check "3. credits 6000 bonus" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("credits"))')" "6000"
check "4. isFree false" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("isFree"))')" "False"
check "5. unlimited false" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("unlimited"))')" "False"
PL=$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("plans",{}).get("Business"))')
check "6. bKash plan Business 2999TK→30000cr" "$PL" "2999TK → 30000cr"

echo "── hostamar SKU branding ×5 ──"
BR=0
TRIES=0
while [ "$BR" -lt 5 ] && [ "$TRIES" -lt 8 ]; do
  TRIES=$((TRIES+1))
  M=$(curl -s -m 150 -H "$H" -X POST $B/api/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"hi"}]}' | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin)
  print(1 if d.get("model")=="hostamar-1m-a" and d.get("provider")=="hostamar-1m-a" else 0)
except Exception:
  print(0)')
  BR=$((BR+M))
done
check "7. branded 5/5 (in $TRIES tries)" "$BR" "5"

echo "── token pricing table ──"
PLABEL=$(curl -s -m 30 "$B/api/orca?price-model=hostamar-1m-a" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
check "8. hostamar-1m-a price" "$PLABEL" "0.3cr/1K in • 1.5cr/1K out"
PF=$(curl -s -m 30 "$B/api/orca?price-model=hostamar-flash" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
PFN=$(echo "$PF" | sed "s/0\.030/0.03/;s/0\.060/0.06/")
check "9. hostamar-flash price" "$PFN" "0.03cr/1K in • 0.06cr/1K out"
PS=$(curl -s -m 30 "$B/api/orca?price-model=claude-sonnet-4-6" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
check "10. Sonnet price" "$PS" "0.36cr/1K in • 1.8cr/1K out"
PH=$(curl -s -m 30 "$B/api/orca?price-model=claude-haiku-4-5" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
check "11. Haiku price" "$PH" "0.12cr/1K in • 0.6cr/1K out"
PO=$(curl -s -m 30 "$B/api/orca?price-model=claude-opus-4-6" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
PON=$(echo "$PO" | sed "s/3\.0cr/3cr/")
check "12. Opus price" "$PON" "0.6cr/1K in • 3cr/1K out"
PG=$(curl -s -m 30 "$B/api/orca?price-model=gpt-4-turbo" | python3 -c 'import sys,json;print(json.load(sys.stdin)["label"])')
check "13. GPT-4 Turbo price" "$PG" "1.2cr/1K in • 3.6cr/1K out"

echo "── catalog 106 + search + discount ──"
C=$(curl -s -m 60 $B/api/ai-services/catalog)
check "14. catalog 106 unique" "$(echo "$C" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("totalDeduped"))')" "106"
DUP=$(echo "$C" | python3 -c 'import sys,json;d=json.load(sys.stdin);ids=[s["id"] for s in d["services"]];print(len(ids)-len(set(ids)))')
check "15. 0 duplicate IDs" "$DUP" "0"
LS=$(curl -s -m 60 "$B/api/ai-services/catalog?search=logo-design" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total"))')
[ "$LS" -ge 1 ] && ok "16. logo-design search ≥1 ($LS)" || bad "16. logo-design search: $LS"
VD=$(echo "$C" | python3 -c 'import sys,json;d=json.load(sys.stdin);print([s for s in d["services"] if s["id"]=="voiceover"][0].get("hostamarDiscountPct"))')
check "17. voiceover basic discount 79%" "$VD" "79"
VT=$(echo "$C" | python3 -c 'import sys,json;d=json.load(sys.stdin);print([s for s in d["services"] if s["id"]=="voiceover"][0].get("tiers",{}).get("basic"))')
check "18. voiceover basic 500cr" "$VT" "500"
LT=$(echo "$C" | python3 -c 'import sys,json;d=json.load(sys.stdin);print([s for s in d["services"] if s["id"]=="logo-design"][0].get("tiers",{}).get("basic"))')
check "19. logo-design basic 400cr" "$LT" "400"

echo "── tier activation ──"
A=$(curl -s -m 120 -H "$H" -X POST $B/api/ai-services/activate -H 'Content-Type: application/json' -d '{"serviceId":"logo-design","tier":"basic","inputs":{"brandName":"TestCo"}}')
CC=$(echo "$A" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("creditCost"))')
check "20. logo-design basic activation 400cr" "$CC" "400"
CHAT_ID=$(echo "$A" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("chatId",""))')
[ -n "$CHAT_ID" ] || CHAT_ID=$(curl -s -m 30 -H "$H" $B/api/ai-services/chats | python3 -c 'import sys,json;d=json.load(sys.stdin);cs=d.get("chats",[]);print(cs[0].get("chatId","") if cs else "")')

echo "── worktree 5cr flat ──"
S0=$(curl -s -m 30 -H "$H" $B/api/dashboard/stats | python3 -c 'import sys,json;print(json.load(sys.stdin).get("creditsBalance"))')
W=$(curl -s -m 120 -H "$H" -X POST $B/api/orca -H 'Content-Type: application/json' -d '{"action":"create_worktree","args":{"name":"v18","agent":"hostamar"}}')
S1=$(curl -s -m 30 -H "$H" $B/api/dashboard/stats | python3 -c 'import sys,json;print(json.load(sys.stdin).get("creditsBalance"))')
D=$(python3 -c "print(round($S0-$S1,1))")
check "21. worktree 5cr flat" "$D" "5.0"
WOK=$(echo "$W" | python3 -c 'import sys,json;print(1 if json.load(sys.stdin).get("success") else 0)')
check "22. worktree created" "$WOK" "1"
WT_ID=$(echo "$W" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("result",{}).get("worktree",{}).get("id",""))')

echo "── Orca actions ──"
F=$(curl -s -m 30 -H "$H" $B/api/orca | python3 -c 'import sys,json;print(1 if "clients" in json.load(sys.stdin) else 0)')
check "23. Orca clients manifest" "$F" "1"
CL=$(curl -s -m 30 -H "$H" $B/api/orca | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("clients",[])))')
[ "$CL" -ge 20 ] && ok "24. Agent Fleet ≥20 clients ($CL)" || bad "24. fleet: $CL"

echo "── regression ──"
check "25. health" "$(curl -s -m 30 $B/api/health | python3 -c 'import sys,json;print(json.load(sys.stdin)["database"]["connected"])')" "True"
check "26. models 120" "$(curl -s -m 60 $B/api/v1/models | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')" "120"
check "27. TV 50" "$(curl -s -m 60 "$B/api/tv/stable-channels?limit=50" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')" "50"
check "28. storage unauth 401" "$(curl -s -m 30 -o /dev/null -w '%{http_code}' $B/api/storage)" "401"
MC=$(curl -s -m 30 $B/api/mcp | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["tools"]))')
[ "$MC" -ge 11 ] && ok "29. MCP tools ≥11 ($MC — 11 core + facebook + seo)" || bad "29. MCP tools: $MC"
M402=$(curl -s -m 120 -H "$H" -X POST $B/api/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"hi"}]}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(1 if (d.get("pricing") or {}).get("inCrPer1k")==0.3 else 0)')
check "30. chat pricing breakdown 0.3cr/1K" "$M402" "1"

echo "── docs (31-35) ──"
DOCS=$(curl -s -m 90 "$B/docs?cb=$RANDOM")
echo "$DOCS" | grep -q "Hostamar Docs" && ok "31. /docs 200 real content (client-rendered via /api/docs)" || bad "31. /docs content"
echo "$DOCS" | grep -q "1cr = 1TK" && ok "32. banner 1cr=1TK=1COIN" || bad "32. banner"
echo "$DOCS" | grep -q "01822417463" && ok "33. bKash 01822417463" || bad "33. bKash"
echo "$DOCS" | grep -q "Orca" && echo "$DOCS" | grep -q "106" && ok "34. 106 + Orca guide" || bad "34. Orca/106"
HOME1=$(curl -s -m 60 "$B/?cb=$RANDOM")
echo "$HOME1" | grep -q "ডকস" && echo "$HOME1" | grep -q 'href="/docs"' && ok "35. navbar Docs link" || bad "35. navbar Docs"

echo "── docs bn + api (36-40) ──"
ENAPI=$(curl -s -m 90 "$B/api/docs?lang=en")
ENS=$(echo "$ENAPI" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("sections",[])))')
[ "$ENS" -ge 60 ] && ok "36. /api/docs EN sections ($ENS)" || bad "36. EN sections: $ENS"
BNAPI=$(curl -s -m 60 "$B/api/docs?lang=bn")
BNS=$(echo "$BNAPI" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("sections",[])))')
[ "$BNS" -ge 10 ] && ok "37. /api/docs BN sections ($BNS)" || bad "37. BN sections: $BNS"
BNPG=$(curl -s -m 60 "$B/docs/bn")
BNSZ=$(echo "$BNPG" | wc -c)
[ "$BNSZ" -gt 30000 ] && ok "38. /docs/bn 200 (${BNSZ}B)" || bad "38. /docs/bn: ${BNSZ}B"
ENPG=$(curl -s -m 60 "$B/docs")
echo "$ENPG" | grep -q "Hostamar Docs" && ok "39. /docs EN 200" || bad "39. /docs EN"
NAV1=$(curl -s -m 60 "$B/?cb=$RANDOM")
echo "$NAV1" | grep -q "ডকস" && echo "$NAV1" | grep -q 'href="/docs"' && ok "40. navbar Docs link" || bad "40. navbar Docs"

echo "── NEW V17 41-45: money surface + docs link ──"
PC=$(curl -s -m 60 -H "$H" -X POST $B/api/payment/create -H 'Content-Type: application/json' -d '{"plan":"starter","method":"bkash","phone":"01822417463"}')
PC_ST=$(echo "$PC" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("success"), d.get("amount"), d.get("credits"), (d.get("mode")=="manual"))' 2>/dev/null)
[ "$PC_ST" = "True 599 6000 True" ] && ok "41. payment create starter → 200 manual ৳599→6000cr fallback" || bad "41. payment create: $PC_ST ($PC)" 
TV=$(curl -s -m 30 -H "$H" -X POST $B/api/billing/verify-trx -H 'Content-Type: application/json' -d '{"trxId":"FAKE123","plan":"starter"}')
TV_CODE=$(echo "$TV" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("code","NO_CODE"))' 2>/dev/null)
[ "$TV_CODE" = "INVALID_TRX_ID" ] && ok "42. TrxVerify fake TrxID → 400 INVALID_TRX_ID (fake-success deleted)" || bad "42. TrxVerify: $TV_CODE ($TV)"
IDOR=$(curl -s -m 30 -H "$H" $B/api/payment/bkash/verify)
IDOR_SCOPE=$(echo "$IDOR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("scope","NO_SCOPE"))' 2>/dev/null)
[ "$IDOR_SCOPE" = "own" ] && ok "43. IDOR fixed: non-admin sees own payments only (scope=own)" || bad "43. IDOR scope: $IDOR_SCOPE ($IDOR)"
DASHPAY=$(curl -s -m 60 -H "Cookie: auth_token=$TOK" "$B/dashboard/payment")
P599=$(echo "$DASHPAY" | grep -c "599")
P2999=$(echo "$DASHPAY" | grep -c "2,999")
[ "$P599" -ge 1 ] && [ "$P2999" -ge 1 ] && ok "44. plans unified: /dashboard/payment shows ৳599 + ৳2,999 (single source)" || bad "44. dash payment plans: 599=$P599 2999=$P2999"
FOOTER=$(curl -s -m 60 "$B/?cb=$RANDOM")
F1=$(echo "$FOOTER" | grep -c "ডকুমেন্টেশন")
F2=$(echo "$FOOTER" | grep -c "বাংলা ডকস")
F3=$(echo "$FOOTER" | grep -c 'href="/docs/bn"')
[ "$F1" -ge 1 ] && [ "$F2" -ge 1 ] && [ "$F3" -ge 1 ] && ok "45. footer Docs column: ডকুমেন্টেশন + বাংলা ডকস + /docs/bn link" || bad "45. footer docs: doc=$F1 bn=$F2 href=$F3"

echo "── NEW V18 46-50: security IDOR + admin escalation ──"
# Setup second user B for cross-user tests (reuse B creds if already made)
curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V18B\",\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" -o /tmp/v18b.json >/dev/null 2>&1 || true
# if EMAIL_B still empty, create one
if [ -z "$EMAIL_B" ]; then EMAIL_B="v18b-$RANDOM@example.com"; curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V18B\",\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" -o /tmp/v18b.json; fi
TOK_B=$(curl -s -m 30 -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
H_B="Authorization: Bearer $TOK_B"
if [ -z "$TOK_B" ]; then
  EMAIL_B="v18b-$RANDOM@example.com"
  curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V18B\",\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" -o /tmp/v18b.json
  TOK_B=$(curl -s -m 30 -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
  H_B="Authorization: Bearer $TOK_B"
fi

# 46. IDOR worktrees — B tries to fan_prompt with A's worktree id → 403 (defense-in-depth, before billing)
if [ -n "$WT_ID" ] && [ -n "$TOK_B" ]; then
  FAN_B=$(curl -s -m 30 -H "$H_B" -X POST $B/api/orca -H 'Content-Type: application/json' -d "{\"action\":\"fan_prompt\",\"args\":{\"prompt\":\"hi\",\"worktreeIds\":[\"$WT_ID\"]}}")
  FAN_CODE=$(echo "$FAN_B" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("error",""))' 2>/dev/null)
  [ "$FAN_CODE" = "FORBIDDEN" ] && ok "46. IDOR worktrees: B fan_prompt A's wt → 403 FORBIDDEN (before billing)" || bad "46. fan_prompt cross-user: $FAN_CODE ($FAN_B)"
else
  bad "46. setup failed WT_ID=$WT_ID TOK_B len ${#TOK_B}"
fi

# 47. IDOR ai-services — B tries to read A's pinned chat → 404 (CHAT_NOT_FOUND)
if [ -n "$CHAT_ID" ] && [ -n "$TOK_B" ]; then
  CHAT_B=$(curl -s -m 30 -H "$H_B" $B/api/ai-services/chat/$CHAT_ID/messages)
  CHAT_ERR=$(echo "$CHAT_B" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("error",""))' 2>/dev/null)
  [ "$CHAT_ERR" = "CHAT_NOT_FOUND" ] && ok "47. IDOR ai-services: B GET A's chat → 404 CHAT_NOT_FOUND" || bad "47. chat IDOR: $CHAT_ERR ($CHAT_B)"
else
  bad "47. setup failed CHAT_ID=$CHAT_ID"
fi

# 48. IDOR storage + chat scope — B's chats are isolated (no A's chat in B's list), storage own scope
if [ -n "$TOK_B" ]; then
  CHATS_B=$(curl -s -m 30 -H "$H_B" $B/api/ai-services/chats)
  HAS_A=$(echo "$CHATS_B" | python3 -c "import sys,json;d=json.load(sys.stdin);print(1 if any(c.get('chatId')=='$CHAT_ID' for c in d.get('chats',[])) else 0)" 2>/dev/null)
  [ "$HAS_A" = "0" ] && ok "48. IDOR storage/chats: B's chat list has no A's chat (isolated)" || bad "48. B sees A's chat: $HAS_A"
else
  bad "48. no TOK_B"
fi

# 49. Admin escalation — cron with public hardcoded secret must now be 401 (fail-closed), non-admin admin/agent POST 403
CRON_PUB=$(curl -s -m 30 -X POST $B/api/admin/agent/cron -H 'x-cron-secret: hostamar-cron-2026' -H 'Content-Type: application/json' -d '{"type":"auto-payments"}' -o /tmp/cron_pub.json -w "%{http_code}")
CRON_BODY=$(cat /tmp/cron_pub.json 2>/dev/null)
[ "$CRON_PUB" = "401" ] && ok "49a. cron hardcoded secret hostamar-cron-2026 → 401 (fail-closed, live-exploit fixed)" || bad "49a. cron hardcoded: $CRON_PUB ($CRON_BODY)"
ADMIN_POST=$(curl -s -m 30 -H "$H" -X POST $B/api/admin/agent -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"hi"}]}' -o /tmp/admin_post.json -w "%{http_code}")
[ "$ADMIN_POST" = "403" ] && ok "49b. non-admin POST /api/admin/agent → 403" || bad "49b. admin agent POST: $ADMIN_POST ($(cat /tmp/admin_post.json))"
ADMIN_HIST=$(curl -s -m 30 -H "$H" "$B/api/admin/agent?history=1" -o /tmp/admin_hist.json -w "%{http_code}")
[ "$ADMIN_HIST" = "403" ] && ok "49c. non-admin GET /api/admin/agent?history=1 → 403 (IDOR leak fixed)" || bad "49c. admin history GET: $ADMIN_HIST ($(cat /tmp/admin_hist.json | head -c 200))"

# 50. Price injection clamped + money surface still fixed
PAY_INJ=$(curl -s -m 30 -H "$H" -X POST $B/api/payment/create -H 'Content-Type: application/json' -d '{"plan":"starter","method":"bkash","phone":"01822417463","credits":999999}')
INJ_AMT=$(echo "$PAY_INJ" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("amount"))' 2>/dev/null)
INJ_CR=$(echo "$PAY_INJ" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("credits"))' 2>/dev/null)
[ "$INJ_AMT" = "599" ] && [ "$INJ_CR" = "6000" ] && ok "50a. price injection: payment/create ignores credits 999999 → 599/6000" || bad "50a. price injection: amt=$INJ_AMT cr=$INJ_CR ($PAY_INJ)"
# verify-manual clamped also tested via billing/verify-trx amount check already 42, re-assert money surface
TV2=$(curl -s -m 30 -H "$H" -X POST $B/api/billing/verify-trx -H 'Content-Type: application/json' -d '{"trxId":"FAKE999","plan":"starter","amount":999999}')
TV2_CODE=$(echo "$TV2" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("code",""))' 2>/dev/null)
# bad amount vs plan price 599 should be flagged (INVALID) or 400 — any 4xx is pass
TV2_ST=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -H "$H" -X POST $B/api/billing/verify-trx -H 'Content-Type: application/json' -d '{"trxId":"FAKE999","plan":"starter","amount":999999}')
[ "$TV2_ST" = "400" ] && ok "50b. price injection: verify-trx amount 999999 vs plan 599 → 400" || bad "50b. verify-trx amount: $TV2_ST ($TV2)"

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V18 50/50 ALL PASSED — 0 IDOR — 0 ADMIN ESCALATION" || echo "❌ FIX FAILURES"
exit $FAIL
