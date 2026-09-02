# setup_pc_cloud_autostart.sh — V31 PC-as-Cloud.
# Registers a Windows Task Scheduler entry so the full stack auto-starts at
# logon. WSL→schtasks is often denied (needs elevation) — the script detects
# that and prints the one-line command to run in an ADMIN PowerShell instead.
# Idempotent — /F overwrites the same task name.

TASK_NAME="Hostamar PC Cloud Start"
BAT="C:\\Users\\User\\hostamar\\scripts\\pc-cloud-start.bat"

echo "[pc-cloud] Registering '$TASK_NAME' (logon)..."
OUT=$(/mnt/c/Windows/System32/schtasks.exe /Create /F /TN "$TASK_NAME" /SC ONLOGON /TR "$BAT" /RL HIGHEST 2>&1 | tail -1)

if echo "$OUT" | grep -qi "denied\|error"; then
  echo "[pc-cloud] WSL lacks elevation for Task Scheduler. Run this ONCE in an ADMIN PowerShell:"
  echo ""
  echo "  schtasks /Create /F /TN \"$TASK_NAME\" /SC ONLOGON /TR \"$BAT\" /RL HIGHEST"
  echo ""
  echo "[pc-cloud] (Start Menu → search 'PowerShell' → Run as administrator)"
else
  echo "[pc-cloud] OK registered:"
  /mnt/c/Windows/System32/schtasks.exe /Query /TN "$TASK_NAME" 2>&1 | grep -E "TaskName|Status|Next Run" | head -3
fi
echo "[pc-cloud] Manual control: scripts/pc-cloud-start.bat | scripts/pc-cloud-stop.bat"
