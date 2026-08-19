#!/bin/bash
# Kill old guard, restart with sanitize patch, test end-to-end
set -e

echo "=== 1. Kill old guard ==="
pkill -9 -f "nvidia-guard.py" 2>/dev/null || true
sleep 1
ss -tlnp 2>/dev/null | grep 12436 || echo "Port 12436 free"

echo ""
echo "=== 2. Start guard on :12436 with sanitize patch ==="
cd /home/romel/hostamar-build
python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 &
GUARD_PID=$!
echo "Guard started: PID=$GUARD_PID"
sleep 3

echo ""
echo "=== 3. Test with Hermes Agent phrase (should sanitize) ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
curl -sS --max-time 45 -w "\nHTTP_CODE: %{http_code}\n" -D - \
  http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{
    "model": "z-ai/glm-5.2",
    "messages": [
      {"role": "system", "content": "You are Hermes Agent, a helpful assistant."},
      {"role": "user", "content": "Say hello in 3 words"}
    ],
    "max_tokens": 20
  }' 2>&1 | head -30

echo ""
echo "=== 4. Guard log (look for SANITIZED) ==="
tail -5 /home/romel/hostamar-build/logs/nvidia-guard.log

echo ""
echo "=== 5. Guard stats ==="
cd /home/romel/hostamar-build && python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -12

echo ""
echo "=== 6. Login page SSO check ==="
curl -sS "https://hostamar.com/login" 2>/dev/null | grep -iE "sso|google|oauth|continue with" | head -5 || echo "No SSO button found in login page"

echo ""
echo "=== 7. Hermes config check ==="
hermes config get fallback_providers 2>&1 | head -5
hermes config get compression.threshold 2>&1
hermes config get compression.target_ratio 2>&1

echo ""
echo "=== DONE ==="
