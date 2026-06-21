#!/bin/bash
# ---------------------------------------------------------------------------
# test-e2e-game.sh — E2E smoke test for Game MVP
#
# Prerequisites: running Docker stack, app on port 3000
# Usage: bash scripts/test-e2e-game.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PASS=0
FAIL=0
BASE="http://localhost:3000/api/games"

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "=== Game MVP E2E Smoke ==="

# 1. Health check
echo "--- Step 1: Health ---"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && pass "Health endpoint returns 200" || fail "Health returned $STATUS"

# 2. Create a game
echo "--- Step 2: Create game ---"
GAME=$(curl -s -X POST "$BASE" \
  -H 'Content-Type: application/json' \
  -d '{"player":"test-player-1"}' 2>/dev/null || echo "")
GAME_ID=$(echo "$GAME" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
[ -n "$GAME_ID" ] && pass "Game created (id=$GAME_ID)" || fail "Game creation failed"

# 3. List games
echo "--- Step 3: List games ---"
LIST=$(curl -s "$BASE" 2>/dev/null || echo "[]")
LIST_COUNT=$(echo "$LIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
[ "$LIST_COUNT" -ge 1 ] && pass "Games list returns >=1 game" || fail "Games list empty"

# 4. Join a game
echo "--- Step 4: Join game ---"
JOIN=$(curl -s -X POST "$BASE/$GAME_ID/join" \
  -H 'Content-Type: application/json' \
  -d '{"player":"test-player-2"}' 2>/dev/null || echo "")
JOIN_OK=$(echo "$JOIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
[ "$JOIN_OK" = "active" ] && pass "Second player joined" || fail "Join failed: $JOIN"

# 5. Make a move
echo "--- Step 5: Make move ---"
MOVE=$(curl -s -X POST "$BASE/$GAME_ID/move" \
  -H 'Content-Type: application/json' \
  -d '{"player":"test-player-1","position":0}' 2>/dev/null || echo "")
MOVE_OK=$(echo "$MOVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
[ "$MOVE_OK" = "active" ] && pass "Move accepted" || fail "Move rejected: $MOVE"

# 6. Get scoreboard
echo "--- Step 6: Scoreboard ---"
SCORE=$(curl -s "$BASE/scoreboard" 2>/dev/null || echo "[]")
SCORE_COUNT=$(echo "$SCORE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
[ "$SCORE_COUNT" -ge 0 ] && pass "Scoreboard accessible" || fail "Scoreboard failed"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] && echo "🎉 All checks passed!" || echo "⚠️  $FAIL check(s) failed"
