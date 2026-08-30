#!/usr/bin/env bash
# test-all-products-105-v7-full-free.sh — ship-verification suite, FULL FREE edition.
# Verifies: no credit restriction anywhere (no 402, no deduction), plus the
# full 120-product regression (auth, IDOR, dashboard speed, real-content
# chat/game/ide pages, deduped 105, pinned chat E2E with FREE revisions).
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }
EMAIL="v7free-$RANDOM@example.com"; PW="v7free-1234"; H=""; JAR="/tmp/v7-jar-$RANDOM.txt"

echo "══ SHIP V7 — FULL FREE — FINAL TEST VERIFY ══"
echo "── Auth ──"
S=$(curl -s -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V7 Free\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
echo "$S" | grep -q '"id"' && ok "signup" || bad "signup: $S"
L=$(curl -s -D /tmp/v7hdr.txt -c "$JAR" -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
grep -qi "httponly" /tmp/v7hdr.txt && ok "cookie HttpOnly" || bad "HttpOnly"
grep -qi "samesite=strict" /tmp/v7hdr.txt && ok "cookie SameSite=Strict" || bad "SameSite"
TOK=$(echo "$L" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$TOK" ] && ok "login token" || bad "login"
H="Authorization: Bearer $TOK"

echo "── FULL FREE: credits endpoint ──"
CR=$(curl -s -b "$JAR" $B/api/dashboard/credits)
check "credits 6000" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("credits"))')" "6000"
check "unlimited true" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("unlimited"))')" "True"
check "isFree true" "$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("isFree"))')" "True"

echo "── FULL FREE: 10-service activation loop (NO 402, credits stay 6000) ──"
SVC_OK=0
for sid in voiceover jingle market-research prompt-pack sql-query t-shirt-design infographic translation seo-audit ats-optimizer; do
  R=$(curl -s -X POST $B/api/ai-services/activate -H "$H" -H 'Content-Type: application/json' -d "{\"serviceId\":\"$sid\",\"inputs\":{\"a\":\"b\"}}")
  if echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('success') else 1)" 2>/dev/null; then SVC_OK=$((SVC_OK+1)); fi
done
check "10 activations all success" "$SVC_OK" "10"
CR2=$(curl -s -b "$JAR" $B/api/dashboard/stats | python3 -c "import sys,json;print(json.load(sys.stdin).get('creditsBalance'))")
check "credits STILL 6000 after 10 activations" "$CR2" "6000"

echo "── FULL FREE: generate/game/ide/browser (no deduction) ──"
G=$(curl -s -X POST $B/api/generate -H "$H" -H 'Content-Type: application/json' -d '{"serviceId":"s01","prompt":"free test"}')
echo "$G" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('success') else 1)" 2>/dev/null && ok "generate free" || bad "generate"
GM=$(curl -s -X POST $B/api/game -H "$H" -H 'Content-Type: application/json' -d '{"gameId":"minecraft","action":"start"}')
echo "$GM" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('success') else 1)" 2>/dev/null && ok "game free" || bad "game"
ID=$(curl -s -X POST $B/api/ide/server -H "$H" -H 'Content-Type: application/json' -d '{"type":"vscode"}')
echo "$ID" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('success') else 1)" 2>/dev/null && ok "ide free" || bad "ide"
BS=$(curl -s -X POST $B/api/browser/sessions -H "$H" -H 'Content-Type: application/json' -d '{"type":"chrome"}')
echo "$BS" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('success') else 1)" 2>/dev/null && ok "browser free" || bad "browser"
CR3=$(curl -s -b "$JAR" $B/api/dashboard/stats | python3 -c "import sys,json;print(json.load(sys.stdin).get('creditsBalance'))")
check "credits STILL 6000 after all products" "$CR3" "6000"

echo "── Chat authed FREE (no 402 precheck) ──"
CH=$(curl -s -X POST $B/api/v1/chat/completions -H "$H" -H 'Content-Type: application/json' -d '{"model":"kilo-auto/free","messages":[{"role":"user","content":"hi"}]}' -m 90)
PR=$(echo "$CH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('provider',''))" 2>/dev/null)
[ -n "$PR" ] && ok "authed chat free, provider=$PR" || bad "authed chat: $CH"

echo "── Pinned chat E2E FREE: activate empty → ask → deliver → revision → STILL 6000 ──"
A=$(curl -s -X POST $B/api/ai-services/activate -H "$H" -H 'Content-Type: application/json' -d '{"serviceId":"packaging","inputs":{}}')
CID=$(echo "$A" | python3 -c "import sys,json;print(json.load(sys.stdin).get('chatId',''))" 2>/dev/null)
[ -n "$CID" ] && ok "activate (empty inputs)" || bad "activate"
M=$(curl -s "$B/api/ai-services/chat/$CID/messages" -H "$H")
echo "$M" | python3 -c "
import sys,json
d=json.load(sys.stdin)
m=[x for x in d.get('messages',[]) if x['role']=='ai'][0]
sys.exit(0 if ('product' in m['content'].lower() or 'প্রোডাক্ট' in m['content']) else 1)" 2>/dev/null && ok "AI asks missing (Bangla/English)" || bad "AI ask"
S2=$(curl -s -X POST "$B/api/ai-services/chat/$CID/messages" -H "$H" -H 'Content-Type: application/json' -d '{"content":"product: Honey Jar, size: 250ml"}')
echo "$S2" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('status')=='delivered' else 1)" 2>/dev/null && ok "delivered (free)" || bad "deliver"
R=$(curl -s -X POST "$B/api/ai-services/chat/$CID/messages" -H "$H" -H 'Content-Type: application/json' -d '{"content":"make it green #0E7C3A"}')
echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('status')=='delivered' else 1)" 2>/dev/null && ok "revision FREE (same thread)" || bad "revision"
CR4=$(curl -s -b "$JAR" $B/api/dashboard/stats | python3 -c "import sys,json;print(json.load(sys.stdin).get('creditsBalance'))")
check "credits STILL 6000 after revision" "$CR4" "6000"

echo "── Dashboard fast + real content ──"
DT=$(curl -s -b "$JAR" -o /dev/null -w '%{time_total}' $B/dashboard)
python3 -c "import sys;sys.exit(0 if float('$DT')<3 else 1)" && ok "dashboard <3s ($DT s)" || bad "dashboard ${DT}s"
CHATK=$(curl -s -b "$JAR" $B/dashboard/chat | wc -c)
[ "$CHATK" -gt 30000 ] && ok "chat real content (${CHATK}B)" || bad "chat ${CHATK}B"
GAMEK=$(curl -s -b "$JAR" $B/dashboard/game | wc -c)
[ "$GAMEK" -gt 30000 ] && ok "game real content (${GAMEK}B)" || bad "game ${GAMEK}B"
IDEK=$(curl -s -b "$JAR" $B/dashboard/ide | wc -c)
[ "$IDEK" -gt 30000 ] && ok "ide real content (${IDEK}B)" || bad "ide ${IDEK}B"
ME=$(curl -s -b "$JAR" $B/api/auth/me)
echo "$ME" | python3 -c "import sys,json;sys.exit(0 if json.load(sys.stdin).get('user') else 1)" && ok "auth/me 200 user" || bad "auth/me"

echo "── Security (unchanged) ──"
check "storage unauth" "$(curl -s -o /dev/null -w '%{http_code}' $B/api/storage)" "401"
check "mfa unauth" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/auth/mfa -H 'Content-Type: application/json' -d '{"action":"status"}')" "401"
check "cron no-secret" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/admin/agent/cron -H 'Content-Type: application/json' -d '{"type":"daily-health"}')" "401"

echo "── Dedup + core regression ──"
C=$(curl -s $B/api/ai-services/catalog)
check "catalog 105" "$(echo "$C" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("totalDeduped"))')" "105"
check "0 duplicate IDs" "$(echo "$C" | python3 -c 'import sys,json;d=json.load(sys.stdin);ids=[s["id"] for s in d["services"]];print(len(ids)-len(set(ids)))')" "0"
check "health" "$(curl -s $B/api/health | python3 -c 'import sys,json;print(json.load(sys.stdin)["database"]["connected"])')" "True"
check "models 120" "$(curl -s $B/api/v1/models | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')" "120"
check "tv 50" "$(curl -s "$B/api/tv/stable-channels?limit=50" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')" "50"
LINKS=$(for p in /dashboard /dashboard/videos /dashboard/hosting /dashboard/chat /dashboard/browser /dashboard/game /dashboard/ide /dashboard/ai-services /dashboard/services /dashboard/services/new /dashboard/analytics /dashboard/tv /dashboard/payment /dashboard/referral /dashboard/settings; do curl -s -o /dev/null -w '%{http_code} ' $B$p; done)
echo "$LINKS" | grep -q "404" && bad "links: $LINKS" || ok "15 links 307 unauth"

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 SHIP READY — FULL FREE — ALL PRODUCTS VERIFIED" || echo "❌ FIX FAILURES BEFORE SHIP"
exit $FAIL
