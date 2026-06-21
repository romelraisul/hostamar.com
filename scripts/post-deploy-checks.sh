#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# post-deploy-checks.sh — verify app health, DB, video serving after deploy
#
# Usage: bash scripts/post-deploy-checks.sh
# Env: SLACK_WEBHOOK_URL — optional, posts success/failure to Slack
# ---------------------------------------------------------------------------
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
STATUS=0

log() { echo "[$(date '+%H:%M:%S')] $*"; }
fail() { log "❌ $*"; STATUS=1; }
pass() { log "✅ $*"; }

slack() {
  [ -n "$SLACK_WEBHOOK" ] && curl -sf -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$*\"}" "$SLACK_WEBHOOK" 2>/dev/null || true
}

log "=== Post-deploy checks ==="

# 1. Health endpoint
log "--- Health ---"
if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  pass "Health endpoint OK"
else
  fail "Health endpoint returned non-200"
fi

# 2. DB null check
log "--- DB nulls ---"
NULLS=$(docker exec hostamar-postgres psql -U hostamar -d hostamar -t -A \
  -c "SELECT COUNT(*) FROM \"Video\" WHERE \"videoUrl\" IS NULL OR \"thumbnailUrl\" IS NULL;" 2>/dev/null || echo "?")
if [ "$NULLS" = "0" ]; then
  pass "DB nulls: $NULLS"
else
  fail "DB nulls: $NULLS (expected 0)"
fi

# 3. Video serving
log "--- Video ---"
SAMPLE=$(docker exec hostamar-app sh -c 'ls -t /app/videos/*.mp4 2>/dev/null | head -1' 2>/dev/null || echo "")
if [ -n "$SAMPLE" ]; then
  NAME=$(basename "$SAMPLE")
  CODE=$(docker exec hostamar-app sh -c "wget -q -T 5 -O /dev/null http://127.0.0.1:3000/videos/$NAME 2>/dev/null && echo 200 || echo 000")
  if [ "$CODE" = "200" ]; then
    pass "Video $NAME served (HTTP 200)"
  else
    fail "Video $NAME returned HTTP $CODE"
  fi
else
  log "⚠️  No video files found — skipping (expected on fresh deploy)"
fi

# 4. Worker
log "--- Worker ---"
WORKER=$(docker inspect hostamar-gpu-worker --format '{{.State.Status}}' 2>/dev/null || echo "missing")
if [ "$WORKER" = "running" ]; then
  pass "Worker $WORKER"
else
  fail "Worker status: $WORKER"
fi

# 5. Backup check
log "--- Backups ---"
BACKUP_COUNT=$(ls -1 /home/romel/hostamar-backups/videos-backup-*.tar.gz 2>/dev/null | wc -l)
log "Backups on disk: $BACKUP_COUNT"
if [ "$BACKUP_COUNT" -gt 0 ]; then
  LATEST=$(ls -t /home/romel/hostamar-backups/videos-backup-*.tar.gz 2>/dev/null | head -1)
  pass "Latest backup: $(basename "$LATEST")"
fi

# Summary
log "=================="
if [ "$STATUS" -eq 0 ]; then
  log "🎉 All checks passed"
  slack "Deploy OK on $(hostname) — all post-deploy checks passed"
else
  log "⚠️  $STATUS check(s) failed"
  slack "Deploy FAILED on $(hostname) — $STATUS check(s) failed — check logs"
fi
exit "$STATUS"
