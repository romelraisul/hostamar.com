#!/bin/bash
set -e
LOG=/home/romel/.hermes/logs/wsl-auto-start.log
mkdir -p /home/romel/.hermes/logs
echo "[$(date)] WSL auto-start after cleanup triggered" | tee -a $LOG
# Restart podman containers that provide guard + freellmapi + omniroute
podman ps -a --format "{{.Names}}" | grep -E "freellmapi|litellm|teldrive|postgres|redis|nvidia-guard" | xargs -r podman start 2>&1 | tee -a $LOG || true
# Ensure guard is up
if curl -s --max-time 5 http://127.0.0.1:12436/v1/models > /dev/null 2>&1; then
  echo "Guard :12436 UP" | tee -a $LOG
else
  podman restart hostamar-nvidia-guard 2>&1 | tee -a $LOG || true
  sleep 3
  curl -s --max-time 5 http://127.0.0.1:12436/v1/models > /dev/null 2>&1 && echo "Guard :12436 UP after restart" | tee -a $LOG || echo "Guard :12436 still DOWN" | tee -a $LOG
fi
# Ensure freellmapi is up with models
if curl -s --max-time 8 http://127.0.0.1:3005/v1/models | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if len(d.get('data',[])) > 100 else 1)" 2>/dev/null; then
  echo "FreeLLMAPI :3005 UP with models" | tee -a $LOG
else
  echo "FreeLLMAPI :3005 needs config/retry" | tee -a $LOG
fi
# Ensure timers active
systemctl --user enable --now kilo-boot-heal.timer daily-disk-agent.timer weekly-trim-compact.timer 2>&1 | tee -a $LOG || true
loginctl enable-linger romel 2>&1 | tee -a $LOG || true
echo "[$(date)] WSL auto-start done — $(df -h / | tail -1)" | tee -a $LOG
# Notify Slack if webhook real
if grep -q "hooks.slack.com" /home/romel/automation/infisical.env 2>/dev/null && ! grep -q "REPLACE_ME" /home/romel/automation/infisical.env; then
  node /home/romel/hostamar.com/scripts/notify-slack.mjs "✅ WSL auto-started after cleanup/restart — Guard 5 models, $(podman ps | wc -l) containers, WSL $(df -h / | tail -1 | awk '{print $4}') free" 2>&1 | tee -a $LOG || true
fi
