#!/usr/bin/env bash
# restart-takeout-backup.sh — re-run Google Takeout → OneDrive transfer after cookies refreshed
# Context: previous run died at 2026-07-22 05:45 due to expired Google cookies (/tmp/cookies.txt deleted).
# Steps:
#   1. USER: open Edge browser, go to takeout.google.com, log in, click Export
#   2. Once started exporting, USER: save cookies to /tmp/cookies.txt (browser extension)
#   3. Then run this script — it will launch 8 sequential background transfers
set -uo pipefail

LOG=/home/romel/hostamar-build/logs/takeout-transfer.log
mkdir -p "$(dirname "$LOG")"

# Takeout URLs (8 parts, each ~50GB) — must be re-generated from takeout.google.com
# These URLs expire unless re-downloaded from the takeout site after authentication.
# Replace URLs below with fresh ones after re-generating the takeout.

URLS=(
  "REPLACE_WITH_FRESH_URL_PART_1"
  "REPLACE_WITH_FRESH_URL_PART_2"
  "REPLACE_WITH_FRESH_URL_PART_3"
  "REPLACE_WITH_FRESH_URL_PART_4"
  "REPLACE_WITH_FRESH_URL_PART_5"
  "REPLACE_WITH_FRESH_URL_PART_6"
  "REPLACE_WITH_FRESH_URL_PART_7"
  "REPLACE_WITH_FRESH_URL_PART_8"
)

# Validate cookies present
if [ ! -f /tmp/cookies.txt ]; then
  echo "ERROR: /tmp/cookies.txt not found. Refresh browser cookies from takeout.google.com"
  echo "       Use a browser extension like 'cookies.txt' (Chrome/Edge) to export logged-in session."
  exit 1
fi

# Validate URLs have been filled in
if [[ "${URLS[0]}" == REPLACE_* ]]; then
  echo "ERROR: URLs array still contains placeholders."
  echo "       Open takeout.google.com → find the active Export → copy each download URL"
  echo "       Replace REPLACE_WITH_FRESH_URL_PART_N entries in this script."
  exit 1
fi

echo "[$(date)] starting sequential takeout transfer — $(echo "${URLS[@]}" | wc -w) parts" >>"$LOG"

for i in "${!URLS[@]}"; do
  PART=$((i+1))
  URL="${URLS[$i]}"
  echo "[$(date)] Part ${PART} starting..." >>"$LOG"

  # Stream upload (no local disk)
  curl -sL -b /tmp/cookies.txt --max-time 86400 "$URL" 2>>"$LOG" \
    | rclone rcat "onedrive:GoogleTakeoutBackup/part-${PART}.tgz" 2>&1 >>"$LOG"

  RES=$?
  echo "[$(date)] Part ${PART} done — exit: $RES" >>"$LOG"
  rm -f /tmp/rclone-spool* 2>/dev/null
done

echo "[$(date)] All parts done. Verify with: rclone lsf onedrive:GoogleTakeoutBackup/" >>"$LOG"
echo "  Expected: 8 .tgz files, ~50GB each = ~400GB total" >>"$LOG"
