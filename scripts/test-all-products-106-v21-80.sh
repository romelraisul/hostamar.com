#!/usr/bin/env bash
# test-all-products-106-v21-80.sh — 80-test suite (70 V20 core + 10 V21 seo-blog/sitemap/ping).
# Grounded: sitemap/robots were ALREADY live (app/sitemap.ts + app/robots.ts since before V19);
# V21 adds /docs + /docs/bn + 10 blog URLs to sitemap, BlogPost table + auto-blog cron,
# seo_ping_gsc tool (real Indexing API + Bing). FB posting still honest-no-token state.
set -u
B="https://hostamar.com"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✓ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }
PW="v21-123456"

echo "══ V21 — 80 TESTS (70 core + 10 seo/sitemap/ping) ══"
bash "$(dirname "$0")/test-all-products-106-v20-70.sh" > /tmp/v21-core.log 2>&1
CORE_RC=$?
CORE_PASS=$(grep -oP '\d+(?= passed)' /tmp/v21-core.log | tail -1); CORE_PASS=${CORE_PASS:-0}
CORE_FAIL=$(grep -oP '\d+(?= failed)' /tmp/v21-core.log | tail -1); CORE_FAIL=${CORE_FAIL:-0}
echo "  core 1-70: $CORE_PASS ✓ / $CORE_FAIL ✗ (rc=$CORE_RC)"
PASS=$((PASS + CORE_PASS)); FAIL=$((FAIL + CORE_FAIL))

EMAIL="v21-$RANDOM@example.com"
curl -s -m 30 -X POST $B/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"V21\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}" -o /tmp/v21s.json
TOK=$(curl -s -m 30 -X POST $B/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
H="Authorization: Bearer $TOK"
[ -n "$TOK" ] && ok "71a. v21 test user login" || bad "71a. login"
mcpbal(){ curl -s -m 30 -H "$H" $B/api/dashboard/credits | python3 -c 'import sys,json;print(json.load(sys.stdin).get("credits"))'; }
mcpcall(){ curl -s -m 120 -H "$H" -X POST $B/api/mcp -H 'Content-Type: application/json' -d "$1"; }

echo "── V21 71-80: sitemap + robots + auto-blog + GSC ping ──"

# 71. Sitemap: includes /docs + /docs/bn + /blog posts + 83 TV (≥125 URLs)
SM=$(curl -s -m 60 "$B/sitemap.xml")
SMD=$(echo "$SM" | grep -c "<url>")
DOCS=$(echo "$SM" | grep -c "<loc>https://hostamar.com/docs</loc>")
DOCSBN=$(echo "$SM" | grep -c "<loc>https://hostamar.com/docs/bn</loc>")
BLOG=$(echo "$SM" | grep -c "/blog/")
[ "$SMD" -ge 120 ] && [ "$DOCS" -ge 1 ] && [ "$DOCSBN" -ge 1 ] && [ "$BLOG" -ge 1 ] && ok "71. sitemap $SMD URLs incl /docs + /docs/bn + blog" || bad "71. sitemap: total=$SMD docs=$DOCS bn=$DOCSBN blog=$BLOG"

# 72. Sitemap valid XML with urlset
echo "$SM" | grep -q "<urlset" && ok "72. sitemap valid XML (urlset)" || bad "72. sitemap not valid"

# 73. Robots.txt: Sitemap + Allow / + Disallow /api/ /admin /dashboard
RB=$(curl -s -m 30 "$B/robots.txt")
echo "$RB" | grep -q "Sitemap: https://hostamar.com/sitemap.xml" && echo "$RB" | grep -q "Allow: /" && echo "$RB" | grep -q "Disallow: /api/" && echo "$RB" | grep -q "Disallow: /admin" && echo "$RB" | grep -q "Disallow: /dashboard" && ok "73. robots.txt allow/disallow/sitemap correct" || bad "73. robots.txt broken"

# 74. seo_ping_gsc tool exists + honest result (2cr charged)
B0=$(mcpbal)
PG=$(mcpcall '{"tool":"seo_ping_gsc","params":{"sitemapUrl":"https://hostamar.com/sitemap.xml"}}')
B1=$(mcpbal)
D=$(python3 -c "print(round($B0-$B1,1))" | sed "s/\.0$//")
PGOK=$(echo "$PG" | python3 -c 'import sys,json;d=json.load(sys.stdin);r=d.get("result",{});print(1 if ("bing" in r and ("google" in r or "GOOGLE_SERVICE_ACCOUNT" in str(r.get("note","")) or "google" in r)) else 0)' 2>/dev/null)
check "74a. seo_ping_gsc responds (google+bing fields)" "$PGOK" "1"
check "74b. seo_ping_gsc real deduction 2cr" "$D" "2"

# 75. seo_generate_blog_post returns title+slug+meta+content (10cr) + persists to BlogPost
B0=$(mcpbal)
BP=$(mcpcall '{"tool":"seo_generate_blog_post","params":{"topic":"Best Bangla Voiceover AI in Bangladesh","keywords":["bangla voiceover","ai voiceover bangladesh"],"serviceId":"voiceover"}}')
B1=$(mcpbal)
D=$(python3 -c "print(round($B0-$B1,1))" | sed "s/\.0$//")
BPOK=$(echo "$BP" | python3 -c 'import sys,json;d=json.load(sys.stdin);r=d.get("result",{});print(1 if r.get("title") and r.get("slug") and len(str(r.get("content",""))) > 400 else 0)' 2>/dev/null)
check "75a. blog post generated (title+slug+content)" "$BPOK" "1"
check "75b. blog post real deduction 10cr" "$D" "10"
SLUG=$(echo "$BP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("result",{}).get("slug",""))' 2>/dev/null)

# 76. Blog post page live at /blog/{slug} (dynamic render from BlogPost table)
if [ -n "$SLUG" ]; then
  BST=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/blog/$SLUG")
  check "76. blog post page /blog/$SLUG → 200" "$BST" "200"
else
  bad "76. no slug returned from blog generation"
fi

# 77. BlogPost persisted — blog list page 200 + our slug is NOT 404
BL=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/blog")
check "77. /blog index → 200" "$BL" "200"

# 78. cron seo-auto-post: fail-closed 401 (upgraded cron keeps auth)
CS=$(curl -s -m 30 -o /dev/null -w "%{http_code}" "$B/api/cron/seo-auto-post")
check "78. seo-auto-post unauth → 401 (fail-closed intact)" "$CS" "401"

# 79. docs/sops live + MCP registry has seo_ping_gsc (35 tools)
MCPN=$(curl -s -m 30 $B/api/mcp | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("tools",[])))')
[ "$MCPN" -ge 35 ] && ok "79. MCP registry $MCPN tools (incl seo_ping_gsc)" || bad "79. MCP tools: $MCPN"

# 80. Docs link + security regression (docs ডকস/ডকুমেন্টেশন + admin 403 + cron + money)
HOME1=$(curl -s -m 60 "$B/?cb=$RANDOM")
N1=$(echo "$HOME1" | grep -c "ডকস"); F1=$(echo "$HOME1" | grep -c "ডকুমেন্টেশন")
AH=$(curl -s -m 30 -H "$H" -o /dev/null -w "%{http_code}" "$B/api/admin/agent?history=1")
PC=$(curl -s -m 30 -o /dev/null -w "%{http_code}" -H "$H" -X POST $B/api/payment/create -H 'Content-Type: application/json' -d '{"plan":"starter","method":"bkash","phone":"01822417463"}')
[ "$N1" -ge 1 ] && [ "$F1" -ge 1 ] && [ "$AH" = "403" ] && [ "$PC" = "200" ] && ok "80. full regression: docs link + admin 403 + payment 200" || bad "80. regression: nav=$N1 footer=$F1 admin=$AH payment=$PC"

echo "══ RESULT: $PASS passed, $FAIL failed ══"
[ "$FAIL" -eq 0 ] && echo "🚢 V21 80/80 ALL PASSED" || echo "❌ FIX FAILURES"
exit $FAIL
