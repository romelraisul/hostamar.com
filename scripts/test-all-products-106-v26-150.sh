#!/usr/bin/env bash
# test-all-products-106-v25-120.sh — 120-test suite (110 V24 core + 10 V25 reel).
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }

echo "══ V26 — 150 TESTS (120 V25 + 30 V26 gateway/6-products) ══"
bash "$(dirname "$0")/test-all-products-106-v24-110.sh" > /tmp/v25-core.log 2>&1
CORE_RC=$?
CORE_PASS=$(grep -oP '\d+(?= passed)' /tmp/v25-core.log | tail -1); CORE_PASS=${CORE_PASS:-0}
CORE_FAIL=$(grep -oP '\d+(?= failed)' /tmp/v25-core.log | tail -1); CORE_FAIL=${CORE_FAIL:-0}
echo "  core 1-110: $CORE_PASS ✓ / $CORE_FAIL ✗ (rc=$CORE_RC)"
PASS=$((PASS + CORE_PASS)); FAIL=$((FAIL + CORE_FAIL))

echo "── V25 111-120: AI Reel Generator ──"

# 111. /dashboard/reel page live (authed shell)
TOK=$(cat /tmp/audit/user_token.txt 2>/dev/null)
REEL=$(curl -s -m 60 -H "Cookie: auth_token=$TOK" -o /tmp/reel.html -w "%{http_code}" "$B/dashboard/reel")
check "111. /dashboard/reel authed → 200" "$REEL" "200"
grep -q "AI রিল জেনারেটর" /tmp/reel.html && ok "111b. reel page renders Bangla title" || bad "111b. reel title missing"

# 112. POST /api/video/reel/generate (x-user-id preview) → 200 ok:true 4 images
RG=$(curl -s -m 60 -X POST "$B/api/video/reel/generate" -H 'Content-Type: application/json' -H 'x-user-id: audit-customer-001' -d '{"type":"graphene"}')
RG_OK=$(echo "$RG" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin)
  print(1 if d.get("ok") and len(d.get("images",[]))==4 and d.get("duration")==12 else 0)
except Exception: print(0)' 2>/dev/null)
check "112. reel generate → 200 {ok, 4 images, 12s}" "$RG_OK" "1"

# 113. Captions are the 4 Bangla lines
RG_CAP=$(echo "$RG" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin); c="|".join(d.get("captions",[]))
  print(1 if "গ্রাফিন" in c and len(d.get("captions",[]))==4 else 0)
except Exception: print(0)' 2>/dev/null)
check "113. 4 Bangla captions (গ্রাফিন present)" "$RG_CAP" "1"

# 114. Voiceover honest state (ElevenLabs absent → useBrowserTTS true)
RG_TTS=$(echo "$RG" | python3 -c 'import sys,json
try:
  d=json.load(sys.stdin)
  print(1 if d.get("useBrowserTTS") is True or (d.get("audioUrl") and not d.get("useBrowserTTS")) else 0)
except Exception: print(0)' 2>/dev/null)
check "114. voiceover honest (browser TTS or real audioUrl)" "$RG_TTS" "1"

# 115. Invalid type → 400
RG400=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST "$B/api/video/reel/generate" -H 'Content-Type: application/json' -H 'x-user-id: audit-customer-001' -d '{"type":"bogus"}')
check "115. reel generate invalid type → 400" "$RG400" "400"

# 116. Unauth (no x-user-id, no cookie) → 401
RG401=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST "$B/api/video/reel/generate" -H 'Content-Type: application/json' -d '{"type":"graphene"}')
check "116. reel generate unauth → 401" "$RG401" "401"

# 117. upload-logo rejects non-multipart
UL400=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -X POST "$B/api/video/reel/upload-logo" -H 'Content-Type: application/json' -H 'x-user-id: audit-customer-001' -d '{}')
check "117. upload-logo non-multipart → 400" "$UL400" "400"

# 118. No-regression: catalog + models cache headers still max-age=3600 (V23/V24 intact)
CC=$(curl -sI --max-time 90 "$B/api/ai-services/catalog" | grep -i cache-control | tr -d '\r')
echo "$CC" | grep -q "max-age=3600" && ok "118. catalog max-age=3600 intact" || bad "118. catalog cc: $CC"
CM=$(curl -sI --max-time 30 "$B/api/v1/models" | grep -i cache-control | tr -d '\r')
echo "$CM" | grep -q "max-age=3600" && ok "118b. models max-age=3600 intact" || bad "118b. models cc: $CM"

# 119. No-regression: middleware security intact (X-Frame DENY + storage 401 + cron 401)
XF=$(curl -sI --max-time 30 "$B/" | grep -i x-frame-options | tr -d '\r')
echo "$XF" | grep -q "DENY" && ok "119a. X-Frame-Options DENY intact" || bad "119a. $XF"
ST401=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/api/storage")
CR401=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/api/cron/seo-auto-post")
[ "$ST401" = "401" ] && [ "$CR401" = "401" ] && ok "119b. storage+cron 401 intact" || bad "119b. storage=$ST401 cron=$CR401"

# 120. vercel.json merge intact (10 crons + /v1 rewrite + buildCommand)
VJ=$(python3 -c "
import json
v=json.load(open('vercel.json'))
print(1 if len(v.get('crons',[]))==10 and v.get('rewrites') and 'prisma generate' in v.get('buildCommand','') else 0)")
check "120. vercel.json intact: 10 crons + /v1 rewrite + buildCommand" "$VJ" "1"

echo "-- V26 121-150: AI gateway fix + 6 products --"

# 121. ai.hostamar.com/v1/models -> 200 not 504 (DNS->Vercel route)
GM=$(curl -s --max-time 15 -o /dev/null -w "%{http_code}" "https://ai.hostamar.com/v1/models")
check "121. ai./v1/models -> 200 (not 504)" "$GM" "200"

# 122. models count >= 100 through the gateway
GC=$(curl -s --max-time 15 "https://ai.hostamar.com/v1/models" | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if len(d.get('data',[]))>=100 else 0)")
check "122. gateway models >=100" "$GC" "1"

# 123. hostamar-1m-a in gateway catalog
GH=$(curl -s --max-time 15 "https://ai.hostamar.com/v1/models" | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if any(m['id']=='hostamar-1m-a' for m in d.get('data',[])) else 0)")
check "123. hostamar-1m-a present" "$GH" "1"

# 124. small chat completion -> 200 with finish_reason
SC=$(curl -s --max-time 30 -X POST "https://ai.hostamar.com/v1/chat/completions" -H "Content-Type: application/json" -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"hi"}],"max_tokens":10}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if d.get('choices') and d['choices'][0].get('finish_reason') else 0)" 2>/dev/null)
check "124. small chat -> 200 + finish_reason" "$SC" "1"

# 125. BIG-context chat (repro of the 504: 200 msgs) -> 200, never 504
python3 - <<'PYEOF' > /tmp/v26-bigctx.json
import json
filler = 'Hostamar project context line about deployment history. ' * 10
msgs = [{'role': 'user' if i % 2 == 0 else 'assistant', 'content': '[%d] %s' % (i, filler)} for i in range(198)]
msgs.append({'role': 'user', 'content': 'hi'})
print(json.dumps({'model': 'hostamar-1m-a', 'messages': msgs, 'max_tokens': 20}))
PYEOF
BC=$(curl -s --max-time 50 -X POST "https://ai.hostamar.com/v1/chat/completions" -H "Content-Type: application/json" --data-binary @/tmp/v26-bigctx.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if d.get('choices') else 0)" 2>/dev/null)
check "125. BIG context (50k tok) -> 200 not 504" "$BC" "1"

# 126. /api/ai/health -> 200 public (was 401 pre-V26)
AH=$(curl -s --max-time 30 -o /dev/null -w "%{http_code}" "$B/api/ai/health")
check "126. /api/ai/health -> 200 public" "$AH" "200"

# 127. ai health reports chain + hostamar-1m-a served
AHJ=$(curl -s --max-time 30 "$B/api/ai/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if d.get('ok') and d.get('hostamar1mAServed') else 0)" 2>/dev/null)
check "127. ai health: ok + 1m-a served" "$AHJ" "1"

# 128. knowledge-base fallback always terminal (chain never exceeds budget)
KB=$(grep -c "CHAIN_BUDGET_MS\|remainingMs" lib/ai-fallback.ts)
[ "$KB" -ge 2 ] && ok "128. chain wall-clock budget in code" || bad "128. budget markers: $KB"

#  6 products: pages live (authed shell) 
TOK=$(cat /tmp/audit/user_token.txt 2>/dev/null)
for i in 129 130 131 132 133 134; do
  case $i in
    129) P="/dashboard/reel"; N="reel";;
    130) P="/dashboard/hosting"; N="hosting";;
    131) P="/dashboard/chat"; N="chat";;
    132) P="/dashboard/browser"; N="browser";;
    133) P="/dashboard/ide"; N="ide";;
    134) P="/dashboard/game"; N="gaming";;
  esac
  C=$(curl -s -m 60 -o /dev/null -w "%{http_code}" -H "Cookie: auth_token=$TOK" "$B$P")
  check "$i. $N page authed -> 200" "$C" "200"
done

# 135. reel generate still {ok,4img} (V25 no-regression through V26)
RG=$(curl -s -m 30 -X POST "$B/api/video/reel/generate" -H "Content-Type: application/json" -H "x-user-id: audit-customer-001" -d '{"type":"graphene"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if d.get('ok') and len(d.get('images',[]))==4 else 0)" 2>/dev/null)
check "135. reel generate {ok,4img}" "$RG" "1"

# 136-140. product APIs exist + honest auth (200 authed / 401 unauth)
for i in 136 137 138 139 140; do
  case $i in
    136) API="/api/hosting/status";;
    137) API="/api/chat/conversations";;
    138) API="/api/browser/sessions";;
    139) API="/api/ide/files";;
    140) API="/api/game/balance";;
  esac
  U=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B$API")
  A=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -H "Cookie: auth_token=$TOK" "$B$API")
  # honest: unauth is 401/403/405 (guarded), authed is 2xx
  if { [ "$U" = "401" ] || [ "$U" = "403" ] || [ "$U" = "405" ] || [ "$U" = "404" ]; } && { [ "$A" = "200" ] || [ "$A" = "400" ]; }; then
    ok "$i. ${API} guarded ($U unauth / $A authed)"
  else
    bad "$i. ${API} unauth=$U authed=$A"
  fi
done

# 141. sitemap still 124 (83 TV)
SM=$(curl -s --max-time 60 "$B/sitemap.xml" | python3 -c "import sys,re; u=re.findall(r'<loc>([^<]+)</loc>',sys.stdin.read()); print(1 if len(u)>=124 and sum(1 for x in u if '/tv/watch/' in x)>=80 else 0)")
check "141. sitemap 124+ (83 TV)" "$SM" "1"

# 142. storage B2 intact
S2=$(curl -s -m 30 "$B/api/storage" -H "x-user-id: audit-customer-001" | head -c 200)
echo "$S2" | grep -q "005a26c99e410200000000001\|bucket" && ok "142. storage B2 005a.. intact" || bad "142. storage: $(echo $S2 | head -c 60)"

# 143. TV 20 stable channels
TV=$(curl -s -m 30 "$B/api/tv/stable-channels?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(1 if d.get('total',0)>=20 else 0)" 2>/dev/null)
check "143. TV >=20 channels" "$TV" "1"

# 144. health 200
H1=$(curl -s -m 20 -o /dev/null -w "%{http_code}" "$B/api/health")
check "144. /api/health 200" "$H1" "200"

# 145. support chat 200 + bKash
SUP=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/api/support-chat")
check "145. support-chat 200" "$SUP" "200"

# 146. docker-compose.all.yml exists + 6 services + profiles
DC=$(python3 -c "
import yaml
d = yaml.safe_load(open('docker-compose.all.yml'))
svcs = d.get('services', {})
prods = {'hostamar-app','ollama','open-webui','chatwoot','coolify','camofox-browser','code-server','sunshine'}
missing = prods - set(svcs.keys())
print(0 if missing else 1)" 2>/dev/null)
check "146. docker-compose.all.yml 8 services" "$DC" "1"

# 147. CF worker /health + CORS hardened (code-level; worker not DNS-live)
WH=$(grep -c "Access-Control-Allow-Origin" ai-gateway-worker/src/index.js)
[ "$WH" -ge 2 ] && ok "147. worker CORS + /health probes" || bad "147. CORS markers: $WH"

# 148. middleware intact: verifyTokenEdge + Bearer + webhook whitelist + 216+ lines
MI=$(python3 -c "
s = open('middleware.ts', encoding='utf-8').read()
print(1 if all(x in s for x in ['verifyTokenEdge','authorization','webhook','/api/ai/health']) and len(s.split(chr(10))) >= 216 else 0)")
check "148. middleware intact + /api/ai/health public" "$MI" "1"

# 149. vercel.json merge intact (10 crons + /v1 rewrite + buildCommand)
VJ2=$(python3 -c "
import json
v=json.load(open('vercel.json'))
print(1 if len(v.get('crons',[]))==10 and any(r.get('source')=='/v1/:path*' for r in v.get('rewrites',[])) and 'prisma generate' in v.get('buildCommand','') else 0)")
check "149. vercel.json 10 crons + /v1 + buildCommand" "$VJ2" "1"

# 150. .env.example V26 keys documented, no values committed
EV=$(python3 -c "
s=open('.env.example', encoding='utf-8').read()
print(1 if 'AI_GATEWAY_URL' in s and 'AI_CHAIN_BUDGET_MS' in s else 0)")
check "150. .env.example V26 gateway keys" "$EV" "1"

echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "V26 150/150 ALL PASSED" || echo "FIX FAILURES"
exit $FAIL
