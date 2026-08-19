#!/bin/bash
# Restart nvidia-guard with sanitize patch and run full verification

echo "=== Step 1: Kill any existing guard processes ==="
pkill -9 -f "nvidia-guard.py" 2>/dev/null
sleep 1
ss -tlnp 2>/dev/null | grep 12436 && echo "STILL RUNNING" || echo "PORT FREE"

echo ""
echo "=== Step 2: Start guard on port 12436 ==="
cd /home/romel/hostamar-build
python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 &
GUARD_PID=$!
sleep 2
echo "Guard PID: $GUARD_PID"
ss -tlnp 2>/dev/null | grep 12436 || echo "FAILED TO START"

echo ""
echo "=== Step 3: Test with sanitized system prompt ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
curl -sS --max-time 40 -w "\nHTTP_CODE: %{http_code}\n" -D - \
  http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{
    "model": "z-ai/glm-5.2",
    "messages": [
      {"role": "system", "content": "You are Hermes Agent, a helpful AI assistant."},
      {"role": "user", "content": "Say hello in exactly 3 words."}
    ],
    "max_tokens": 20
  }' 2>&1

echo ""
echo ""
echo "=== Step 4: Check guard logs for sanitize ==="
tail -5 /home/romel/hostamar-build/logs/nvidia-guard.log | grep -i sanitize

echo ""
echo "=== Step 5: Guard stats ==="
cd /home/romel/hostamar-build && python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -12

echo ""
echo "=== Step 6: Verify login page renders correctly ==="
curl -sS "https://hostamar.com/login" 2>&1 | grep -oP 'class="[^"]*"[^>]*>.*?</button>' | head -3
curl -sS "https://hostamar.com/login" 2>&1 | python3 -c "
import sys, re
html = sys.stdin.read()
# Check for SSO button
has_sso = 'Continue with' in html or 'sso' in html.lower()
has_email = 'email' in html.lower() and 'type=\"email\"' in html.lower()
has_pass = 'type=\"password\"' in html.lower()
print(f'SSO button: {\"YES\" if has_sso else \"NO\"}')
print(f'Email field: {\"YES\" if has_email else \"NO\"}')
print(f'Password field: {\"YES\" if has_pass else \"NO\"}')
"