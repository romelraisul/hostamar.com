#!/bin/bash
# ---------------------------------------------------------------------------
# install-systemd.sh — install hostamar-healthcheck as a systemd timer
#
# Replaces the cron-based supervisor with systemd for faster recovery,
# better logging (journalctl), and crash-loop detection.
#
# Usage:
#   bash scripts/install-systemd.sh           # install & start
#   bash scripts/install-systemd.sh --remove  # stop & remove
# ---------------------------------------------------------------------------
set -euo pipefail

SERVICE="hostamar-healthcheck"
SRC_DIR="/home/romel/hostamar.com/scripts"

if [ "${1:-}" = "--remove" ]; then
  echo "==> Removing systemd timer + service..."
  sudo systemctl stop "$SERVICE.timer" 2>/dev/null || true
  sudo systemctl disable "$SERVICE.timer" 2>/dev/null || true
  sudo systemctl stop "$SERVICE.service" 2>/dev/null || true
  sudo systemctl disable "$SERVICE.service" 2>/dev/null || true
  sudo rm -f "/etc/systemd/system/$SERVICE.service" "/etc/systemd/system/$SERVICE.timer"
  sudo systemctl daemon-reload
  echo "Done. Cron fallback still runs every 2 minutes."
  exit 0
fi

echo "==> Installing systemd timer..."

# Copy unit files
sudo cp "$SRC_DIR/$SERVICE.service" /etc/systemd/system/
sudo cp "$SRC_DIR/$SERVICE.timer" /etc/systemd/system/
sudo chmod 644 "/etc/systemd/system/$SERVICE.service" "/etc/systemd/system/$SERVICE.timer"

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE.timer"
sudo systemctl start "$SERVICE.timer"

# Verify
echo ""
echo "==> Status:"
systemctl status "$SERVICE.timer" --no-pager 2>&1 | head -12
echo ""
echo "==> Logs (last 10 lines):"
journalctl -u "$SERVICE.service" --no-pager -n 10 2>&1 || echo "(no logs yet)"

echo ""
echo "✅ systemd timer installed. Runs every 2 minutes."
echo "   View logs:  journalctl -u $SERVICE.service -f"
echo "   Remove:     bash $0 --remove"
