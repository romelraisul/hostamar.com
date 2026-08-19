#!/bin/bash
# fix-nvidia-guard.sh — restart guard with sanitize patch and test end-to-end

set -e
echo "=== Step 1: Kill old guard and restart with sanitize patch ==="
pkill -f "nvidia-guard.py" 2>/dev/null || true
sleep 2

# Restart with the sanitize patch (now in the script)
cd /home/romel/hostamar-build
nohup python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 > logs/nvidia-guard-sanitized.log 2>&1 &
echo "Guard PID: $!"
sleep 3

echo "=== Step 2: Verify port ==="
ss -tlnp | grep 12436 || echo "PORT NOT LISTENING!"

echo "=== Step 3: Test with 'Hermes Agent' in system prompt (should work now) ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)

curl -sS --max-time 45 http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{
    "model": "z-ai/glm-5.2",
    "messages": [
      {"role": "system", "content": "You are Hermes Agent, an AI coding assistant"},
      {"role": "user", "content": "Say hello in 3 words"}
    ],
    "max_tokens": 20
  }' 2>&1

echo ""
echo "=== Step 4: Guard stats ==="
python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -10

echo ""
echo "=== Step 5: Login page check ==="
curl -sS "https://hostamar.com/login" 2>&1 | grep -oi "sso\|continue with\|google\|signin" | head -10 || echo "No SSO text found in login page"
