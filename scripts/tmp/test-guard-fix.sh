#!/bin/bash
set -e
# Restart guard + test sanitized request

pkill -9 -f "nvidia-guard.py" 2>/dev/null || true
sleep 1

# Flush old log
> /home/romel/hostamar-build/logs/nvidia-guard.log

# Start guard in background
cd /home/romel/hostamar-build
python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 &
GUARD_PID=$!
sleep 3

echo "=== Guard started: PID=$GUARD_PID ==="
ss -tlnp | grep 12436 || echo "NOT LISTENING"

# Test with system prompt containing "Hermes Agent"
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
echo ""
echo "=== Test with 'Hermes Agent' in system prompt ==="
curl -sS --max-time 45 http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{"model":"z-ai/glm-5.2","messages":[{"role":"system","content":"You are Hermes Agent"},{"role":"user","content":"Say hello in 3 words"}],"max_tokens":20}' 2>&1

echo ""
echo "=== Guard log ==="
tail -15 /home/romel/hostamar-build/logs/nvidia-guard.log
echo ""
echo "=== Kill guard ==="
kill $GUARD_PID 2>/dev/null || true
