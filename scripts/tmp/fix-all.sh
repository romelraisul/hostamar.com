#!/bin/bash
# Fix Nvidia guard + check SSO button + hermes update status
set -e

echo "=== 1. Kill old guard ==="
pkill -f "nvidia-guard.py" 2>/dev/null || true
sleep 1
ss -tlnp 2>/dev/null | grep 12436 || echo "port free"

echo ""
echo "=== 2. Restart guard ==="
cd /home/romel/hostamar-build
nohup python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 > logs/nvidia-guard-restart.log 2>&1 &
GUARD_PID=$!
sleep 2
ss -tlnp 2>/dev/null | grep 12436 && echo "guard up on :12436"

echo ""
echo "=== 3. Test guard with 'Hermes Agent' in system prompt ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
curl -sS --max-time 60 http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{"model":"z-ai/glm-5.2","messages":[{"role":"system","content":"You are Hermes Agent"},{"role":"user","content":"Say hi"}],"max_tokens":10}' 2>&1 | head -5

echo ""
echo "=== 4. Guard stats ==="
python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -8

echo ""
echo "=== 5. Check SSO button on login page ==="
curl -sS "https://hostamar.com/login" 2>&1 | grep -i "sso\|google\|continue with" | head -3 || echo "no SSO button found in HTML"

echo ""
echo "=== 6. Check hermes update impact ==="
ls -la /home/romel/hostamar-build/token-guard/nvidia-guard.py 2>/dev/null
echo "---"
grep "nvidia-guard" /home/romel/.bashrc 2>/dev/null || echo "not in .bashrc"
echo "---"
grep "NVIDIA_BASE_URL" /home/romel/.hermes/.env 2>/dev/null || echo "not in .env"

echo ""
echo "=== 7. Hermes update check ==="
ls -la /home/romel/.hermes/hermes-agent/ 2>/dev/null | head -5
