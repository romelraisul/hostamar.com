#!/usr/bin/env bash
# test-all-products-106-v15.sh — 35-test suite (30 core + 5 docs).
# Covers: auth/coin, hostamar SKU branding ×5, token pricing table ×6,
# logo-design search normalization, discount badge 3-tier math, tier activation,
# worktree 5cr flat, Orca actions, bKash 402 plans, regression core.
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }
EMAIL="v14-$RANDOM@example.com"; PW="v14-123456"; H=""; TOK=""

echo "══ V14 — HARDEN — 30 TESTS ══"
curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V14\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}" -o /tmp/v14s.json
grep -q '"id"' /tmp/v14s.json && ok "1. signup" || bad "1. signup"
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
for i in 1 2 3 4 5; do
  M=$(curl -s -m 120 -H "$H" -X POST $B/api/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"hi"}]}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(1 if d.get("model")=="hostamar-1m-a" and d.get("provider")=="hostamar-1m-a" else 0)')
  BR=$((BR+M))
done
check "7. branded 5/5" "$BR" "5"

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

echo "── worktree 5cr flat ──"
S0=$(curl -s -m 30 -H "$H" $B/api/dashboard/stats | python3 -c 'import sys,json;print(json.load(sys.stdin).get("creditsBalance"))')
W=$(curl -s -m 120 -H "$H" -X POST $B/api/orca -H 'Content-Type: application/json' -d '{"action":"create_worktree","args":{"name":"v14","agent":"hostamar"}}')
S1=$(curl -s -m 30 -H "$H" $B/api/dashboard/stats | python3 -c 'import sys,json;print(json.load(sys.stdin).get("creditsBalance"))')
D=$(python3 -c "print(round($S0-$S1,1))")
check "21. worktree 5cr flat" "$D" "5.0"
WOK=$(echo "$W" | python3 -c 'import sys,json;print(1 if json.load(sys.stdin).get("success") else 0)')
check "22. worktree created" "$WOK" "1"

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
check "29. MCP 11 tools" "$MC" "11"
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

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V16 40/40 ALL PASSED" || echo "❌ FIX FAILURES"
exit $FAIL
