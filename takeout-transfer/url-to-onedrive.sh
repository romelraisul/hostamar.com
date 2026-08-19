#!/usr/bin/env bash
# Paste URL → OneDrive — streams directly, no local disk used.
# Usage:
#   1. Get the download URL for each Takeout part
#   2. Run: ./url-to-onedrive.sh PART_NUMBER "DOWNLOAD_URL"
# Example:
#   ./url-to-onedrive.sh 1 "https://takeout.google.com/..."

set -euo pipefail
LOG="/home/romel/hostamar-build/logs/takeout-transfer.log"
mkdir -p "$(dirname "$LOG")"

PART="${1:-}"
URL="${2:-}"

if [ -z "$PART" ] || [ -z "$URL" ]; then
    echo "Usage: $0 <part-number> <download-url>"
    echo "       $0 --multi  (interactive mode — paste multiple URLs)"
    exit 1
fi

if [ "$PART" = "--multi" ]; then
    echo "=== Takeout Transfer — Multi-URL Mode ==="
    echo "Paste each part URL (one per line). Ctrl+D when done."
    echo "----------------------------------------"
    i=1
    while read -r line; do
        [ -z "$line" ] && continue
        echo "Transferring part $i..."
        curl -sL --max-time 86400 "$line" | \
            rclone rcat "onedrive:GoogleTakeoutBackup/part-$i.tgz" \
            && echo "✅ Part $i done" \
            || echo "❌ Part $i failed"
        echo "----------------------------------------"
        i=$((i + 1))
    done
    echo "=== All done! $((i-1)) parts transferred ==="
    exit 0
fi

echo "[$(date)] Starting part $PART..." | tee -a "$LOG"
curl -sL --max-time 86400 "$URL" | \
    rclone rcat "onedrive:GoogleTakeoutBackup/part-$PART.tgz" 2>&1 | tee -a "$LOG"
echo "[$(date)] Part $PART complete" | tee -a "$LOG"
