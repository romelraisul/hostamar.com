#!/bin/bash
# Hostamar daily analytics — revenue, signups, video counts
set -e

DB_URL="postgresql://neondb_owner:luambAtuJXneMJgZm4V94HR5@ep-empty-firefly-apkx8hzh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
S3_ENDPOINT="http://192.168.1.2:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
LOG="/tmp/hostamar-analytics-$(date +%Y-%m-%d).json"

echo "{" > "$LOG"

# Total users/signups today
TODAY_USER=$(psql "$DB_URL" -t -c "SELECT count(*) FROM \"Customer\" WHERE \"createdAt\" >= CURRENT_DATE;" 2>/dev/null | tr -d ' ')
echo "\"signups_today\": ${TODAY_USER:-0}," >> "$LOG"

# Total users all time
ALL_USER=$(psql "$DB_URL" -t -c "SELECT count(*) FROM \"Customer\";" 2>/dev/null | tr -d ' ')
echo "\"total_users\": ${ALL_USER:-0}," >> "$LOG"

# Revenue today (from approved transactions)
TODAY_REV=$(psql "$DB_URL" -t -c "SELECT COALESCE(sum(amount),0) FROM \"Transaction\" WHERE \"createdAt\" >= CURRENT_DATE AND status = 'completed';" 2>/dev/null | tr -d ' ')
echo "\"revenue_today_bdt\": ${TODAY_REV:-0}.00," >> "$LOG"

# Revenue all time
ALL_REV=$(psql "$DB_URL" -t -c "SELECT COALESCE(sum(amount),0) FROM \"Transaction\" WHERE status = 'completed';" 2>/dev/null | tr -d ' ')
echo "\"revenue_total_bdt\": ${ALL_REV:-0}.00," >> "$LOG"

# Videos created today
TODAY_VID=$(psql "$DB_URL" -t -c "SELECT count(*) FROM \"Video\" WHERE \"createdAt\" >= CURRENT_DATE;" 2>/dev/null | tr -d ' ')
echo "\"videos_today\": ${TODAY_VID:-0}," >> "$LOG"

# Videos all time
ALL_VID=$(psql "$DB_URL" -t -c "SELECT count(*) FROM \"Video\";" 2>/dev/null | tr -d ' ')
echo "\"videos_total\": ${ALL_VID:-0}," >> "$LOG"

# Queue pending
QUEUE=$(psql "$DB_URL" -t -c "SELECT count(*) FROM \"VideoQueue\" WHERE status = 'queued';" 2>/dev/null | tr -d ' ')
echo "\"queue_pending\": ${QUEUE:-0}," >> "$LOG"

# Credits given today
CREDITS=$(psql "$DB_URL" -t -c "SELECT COALESCE(sum(credits),0) FROM \"Customer\" WHERE \"updatedAt\" >= CURRENT_DATE;" 2>/dev/null | tr -d ' ')
echo "\"credits_used_today\": ${CREDITS:-0}" >> "$LOG"

echo "}" >> "$LOG"

# Upload to MinIO
curl -s -X PUT "$S3_ENDPOINT/hostamar/analytics/$(date +%Y-%m-%d).json" \
  --user "$S3_ACCESS_KEY:$S3_SECRET_KEY" \
  --data-binary @"$LOG" >/dev/null 2>&1

echo "Analytics saved to MinIO"
cat "$LOG"
