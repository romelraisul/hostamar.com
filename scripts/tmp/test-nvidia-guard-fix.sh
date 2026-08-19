#!/bin/bash
# test-nvidia-guard-fix.sh — restart guard + test sanitize + full chain
set -e

echo "=== 1. Kill any stale guard processes ==="
pkill -f "nvidia-guard.py" 2>/dev/null || true
sleep 2

echo "=== 2. Restart guard on :12436 ==="
cd /home/romel/hostamar-build
python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 > /tmp/guard-test.log 2>&1 &
GUARD_PID=$!
sleep 3
echo "Guard PID: $GUARD_PID"
ss -tlnp 2>/dev/null | grep 12436 || echo "PORT: not listening"

echo ""
echo "=== 3. Test with 'Hermes Agent' in system prompt (should sanitize + succeed or fallback) ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
curl -sS --max-time 45 -w "\nHTTP_CODE:%{http_code}\n" \
  http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{
    "model":"z-ai/glm-5.2",
    "messages":[
      {"role":"system","content":"You are Hermes Agent. Think step by step."},
      {"role":"user","content":"Say hello exactly 3 words"}
    ],
    "max_tokens":20
  }' 2>&1

echo ""
echo "=== 4. Check guard log for sanitize event ==="
tail -20 /home/romel/hostamar-build/logs/nvidia-guard.log | grep -i sanit

echo ""
echo "=== 5. Guard stats ==="
cd /home/romel/hostamar-build && python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -15

echo ""
echo "=== 6. Current Hermes model config ==="
grep -E "default:|provider:|base_url:" /home/romel/.hermes/config.yaml | head -15

echo ""
echo "=== 7. Fallback providers ==="
grep -A5 fallback_providers /home/romel/.hermes/config.yaml | head -15

echo ""
echo "=== 8. Cron job e1a952a61cfd model/provider pin ==="
grep -A3 'job_id.*e1a952a61cfd' /home/romel/.hermes/logs/agent.log 2>/dev/null | tail -5

echo "=== DONE ==="
