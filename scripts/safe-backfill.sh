#!/bin/bash
# ---------------------------------------------------------------------------
# safe-backfill.sh — run backfill with safety checks and DB dump
#
# Usage:
#   bash scripts/safe-backfill.sh             # dry-run + safety checks only
#   bash scripts/safe-backfill.sh --apply     # dump → dry-run → apply → verify
# ---------------------------------------------------------------------------
set -euo pipefail

APPLY=false
[[ "${1:-}" = "--apply" ]] && APPLY=true

log() { echo "[$(date '+%H:%M:%S')] $*"; }

DB_NAME="${DB_NAME:-hostamar}"
DB_USER="${DB_USER:-hostamar}"
DUMP_DIR="/tmp/hostamar-backups"
mkdir -p "$DUMP_DIR"

log "=== Safe Backfill ==="
log "Mode: $($APPLY && echo 'APPLY (will write)' || echo 'DRY-RUN')"
log ""

# 1. Check DATABASE_URL or pg connection
DB_URL="${DATABASE_URL:-postgresql://hostamar:***@hostamar-postgres:5432/hostamar}"
log "1. Testing DB connection..."
if docker exec hostamar-postgres psql -U hostamar -d hostamar -c "SELECT 1" &>/dev/null; then
  log "   ✅ DB reachable"
else
  log "   ❌ DB unreachable - check DATABASE_URL"
  exit 1
fi

# 2. Check current NULL counts
log "2. Checking current NULL counts..."
NULL_COUNT=$(docker exec hostamar-postgres psql -U hostamar -d hostamar -t -A \
  -c "SELECT COUNT(*) FROM \"Video\" WHERE \"url\" IS NULL OR \"thumbnailUrl\" IS NULL;" 2>/dev/null)
log "   Records with NULL url/thumbnailUrl: $NULL_COUNT"

TOTAL=$(docker exec hostamar-postgres psql -U hostamar -d hostamar -t -A \
  -c "SELECT COUNT(*) FROM \"Video\";" 2>/dev/null)
log "   Total records: $TOTAL"

# 3. Backup (only in apply mode)
if $APPLY; then
  DUMP_FILE="$DUMP_DIR/hostamar_pre_backfill_$(date +%Y%m%d_%H%M%S).dump"
  log "3. Creating DB dump: $DUMP_FILE"
  docker exec hostamar-postgres pg_dump -U hostamar -F c -b -v -f "/tmp/pre_backfill.dump" 2>/dev/null
  docker cp hostamar-postgres:/tmp/pre_backfill.dump "$DUMP_FILE" 2>/dev/null
  log "   ✅ Dump saved to $DUMP_FILE"
else
  log "3. Skipping DB dump (dry-run mode)"
fi

# 4. Run backfill (dry-run or apply)
BACKFILL_OPTS=""
$APPLY && BACKFILL_OPTS="--apply"
log "4. Running backfill $($APPLY && echo '--apply' || echo 'dry-run')..."
docker exec hostamar-app sh -c "cd /app && npx tsx scripts/backfill-video-urls.ts $BACKFILL_OPTS" 2>&1
log "   ✅ Backfill completed"

# 5. Verify (only in apply mode)
if $APPLY; then
  log "5. Verifying..."
  NEW_NULL_COUNT=$(docker exec hostamar-postgres psql -U hostamar -d hostamar -t -A \
    -c "SELECT COUNT(*) FROM \"Video\" WHERE \"url\" IS NULL OR \"thumbnailUrl\" IS NULL;" 2>/dev/null)
  log "   Records with NULL after backfill: $NEW_NULL_COUNT"
  if [ "$NEW_NULL_COUNT" -eq 0 ]; then
    log "   ✅ All records populated — ready for NOT NULL migration"
    log ""
    log "   Run NOT NULL migration:"
    log "     docker exec -i hostamar-postgres psql -U hostamar -d hostamar \\"
    log "       < prisma/migrations/002_make_video_url_not_null/migration.sql"
  else
    log "   ⚠️  $NEW_NULL_COUNT records still NULL — inspect before NOT NULL"
  fi
fi

log ""
log "=== Done ==="
