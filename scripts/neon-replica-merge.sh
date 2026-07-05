#!/bin/bash
set -euo pipefail
# neon-replica-merge.sh
# Merge Neon/replica-side changes back into local Postgres on host recovery.
# Conflict rule: for duplicate PK/unique keys, keep the row with the latest updatedAt.
# Requires: psql, local DATABASE_URL, REPLICA_URL or DATABASE_URL_REPLICA in env.

LOCAL_URL="${DATABASE_URL:-}"
REPLICA_URL="${REPLICA_URL:-${DATABASE_URL_REPLICA:-}}"
STATE_FILE=".neon-merge-state"
STATE_DIR="/tmp"
mkdir -p "$STATE_DIR"
STATE_PATH="${STATE_DIR}/${STATE_FILE}"

if [[ -z "$LOCAL_URL" || -z "$REPLICA_URL" ]]; then
  echo "neon-merge: missing DATABASE_URL/REPLICA_URL" >&2
  exit 1
fi

psql "$LOCAL_URL" -Atc "SELECT 1" >/dev/null || {
  echo "neon-merge: local database unreachable" >&2
  exit 1
}
psql "$REPLICA_URL" -Atc "SELECT 1" >/dev/null || {
  echo "neon-merge: replica database unreachable" >&2
  exit 1
}

TS=$(date '+%Y-%m-%d %H:%M:%S')
LAST_SYNC_AT=""
if [[ -f "$STATE_PATH" ]]; then
  LAST_SYNC_AT=$(cat "$STATE_PATH" || true)
fi
echo "$TS" > "$STATE_PATH"

psql "$LOCAL_URL" <<SQL
CREATE TABLE IF NOT EXISTS _neon_merge_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  pk TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
SQL

TABLES=(
  Customer:customerId
  Business:customerId
  Subscription:id
  Video:id
  Preview:id
  Service:id
  VideoQueue:id
  ActivityLog:id
  Payment:id
  Transaction:id
  Notification:id
  Referral:id
  Order:id
  Lead:id
  LeadLog:id
  Campaign:id
  FollowUp:id
  OutreachLog:id
  PipelineSnapshot:id
  UserProgress:userId_courseId_lessonId
  RateLimitEvent:id
  BetaInvite:code
  Conversation:id
  Message:id
  GameBalance:id
  GameSpin:id
)

for entry in "${TABLES[@]}"; do
  TABLE="${entry%%:*}"
  PK="${entry##*:}"
  [[ "$TABLE" == "$PK" ]] || true
  QUERY="
    WITH replica_changes AS (
      SELECT r.*, COALESCE(r.updatedAt, r.createdAt) AS change_ts
      FROM dblink('${REPLICA_URL}', 'SELECT * FROM \"${TABLE}\"') AS r(*)
      WHERE COALESCE(r.updatedAt, r.createdAt) > '${LAST_SYNC_AT:-1970-01-01}'::timestamp
    ),
    conflicts AS (
      SELECT l.*, r.change_ts AS replica_ts
      FROM replica_changes r
      JOIN \"${TABLE}\" l USING (\"${PK}\")
      WHERE COALESCE(l.updatedAt, l.createdAt) < r.change_ts
    ),
    upserts AS (
      SELECT *
      FROM replica_changes r
      WHERE NOT EXISTS (
        SELECT 1 FROM \"${TABLE}\" l WHERE l.\"${PK}\" = r.\"${PK}\"
      )
      UNION ALL
      SELECT r.*
      FROM replica_changes r
      JOIN conflicts c USING (\"${PK}\")
      WHERE COALESCE(r.updatedAt, r.createdAt) >= c.replica_ts
    ),
    insert_rows AS (
      SELECT * FROM upserts u
      WHERE NOT EXISTS (
        SELECT 1 FROM \"${TABLE}\" l WHERE l.\"${PK}\" = u.\"${PK}\"
      )
    ),
    update_rows AS (
      SELECT * FROM upserts u
      WHERE EXISTS (
        SELECT 1 FROM \"${TABLE}\" l WHERE l.\"${PK}\" = u.\"${PK}\"
      )
    )
    INSERT INTO _neon_merge_log(table_name, pk, action, changed_at)
    SELECT '${TABLE}', t.\"${PK}\"::text, 'upsert', COALESCE(t.updatedAt, t.createdAt)
    FROM upserts t
    RETURNING id
  "
  MERGED=$(psql "$LOCAL_URL" -Atc "$QUERY" 2>/dev/null || true)
  if [[ -n "$MERGED" ]]; then
    echo "neon-merge: ${TABLE} merged ${MERGED}"
  fi
done
