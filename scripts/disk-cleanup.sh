#!/usr/bin/env bash
# =========================================================
# C: Drive Cleanup — WSL cron script
# Runs: every 6 hours
# Cleans: Windows Temp, rclone spool, Docker waste
# =========================================================
LOG="/home/romel/hostamar-build/logs/disk-cleanup.log"

echo "[$(date)] === C: Cleanup starting ===" >> "$LOG"

# 1. Clean rclone spool files (Takeout transfer buffers)
SPOOL_BEFORE=$(du -sh /tmp 2>/dev/null | cut -f1)
rm -rf /tmp/rclone-spool* 2>/dev/null
echo "[$(date)] /tmp cleaned: $SPOOL_BEFORE → $(du -sh /tmp | cut -f1)" >> "$LOG"

# 2. Clean Windows Temp (from WSL)
if [ -d "/mnt/c/Windows/Temp" ]; then
  find /mnt/c/Windows/Temp -type f -atime +1 -delete 2>/dev/null
fi
if [ -d "/mnt/c/Users/romel.DESKTOP-9KA03CQ/AppData/Local/Temp" ]; then
  find "/mnt/c/Users/romel.DESKTOP-9KA03CQ/AppData/Local/Temp" -type f -atime +1 -delete 2>/dev/null
fi
echo "[$(date)] Windows Temp cleaned" >> "$LOG"

# 3. Docker/Podman prune
docker system prune -af --volumes 2>/dev/null && echo "[$(date)] Docker pruned" >> "$LOG"

# 4. Report C: space
C_FREE=$(df -h /mnt/c 2>/dev/null | tail -1 | awk '{print $5}')
echo "[$(date)] C: free: $C_FREE" >> "$LOG"
echo "[$(date)] === Cleanup done ===" >> "$LOG"

# Keep log trimmed
tail -100 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
