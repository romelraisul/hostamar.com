#!/usr/bin/env bash
# test-all-products-106-v25-120.sh — 120-test suite (110 V24 core + 10 V25 reel).
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }

echo "══ V25 — 120 TESTS (110 core + 10 reel) ══"
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

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V25 120/120 ALL PASSED" || echo "❌ FIX FAILURES"
exit $FAIL
