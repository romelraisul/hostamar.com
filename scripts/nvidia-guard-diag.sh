#!/bin/bash
# Full diagnostic: guard restart, test, login page check

echo "=== 1. Restart nvidia-guard on :12436 ==="
pkill -f "nvidia-guard.py" 2>/dev/null || true
sleep 1

cd /home/romel/hostamar-build
python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 &
GUARD_PID=$!
sleep 2

echo "Guard PID: $GUARD_PID"
ss -tlnp | grep 12436

echo ""
echo "=== 2. Test guard with Hermes Agent phrase (should now sanitize) ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)

curl -sS --max-time 40 http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{
    "model": "z-ai/glm-5.2",
    "messages": [
      {"role": "system", "content": "You are Hermes Agent, a helpful coding assistant."},
      {"role": "user", "content": "Say hello in 3 words"}
    ],
    "max_tokens": 20
  }' 2>&1 | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'choices' in d:
        print('SUCCESS:', d['choices'][0]['message']['content'])
    else:
        print('ERROR:', json.dumps(d, indent=2)[:500])
except Exception as e:
    print('PARSE ERROR:', e)
    print(sys.stdin.read()[:500])
"

echo ""
echo "=== 3. Guard stats ==="
python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -15

echo ""
echo "=== 4. Check login page SSO button ==="
curl -sS "https://hostamar.com/login" 2>&1 | grep -iE "sso|google|continue with|sign in with" | head -5

echo ""
echo "=== 5. Check Hermes config ==="
grep -A5 "fallback_providers" ~/.hermes/config.yaml | head -8
