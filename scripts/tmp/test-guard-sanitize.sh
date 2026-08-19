#!/bin/bash
set -e
# Restart nvidia-guard with the sanitize patch
pkill -f "nvidia-guard.py.*12436" 2>/dev/null || true
sleep 1
cd /home/romel/hostamar-build
nohup python3 token-guard/nvidia-guard.py --listen 127.0.0.1:12436 >> logs/nvidia-guard.log 2>&1 &
sleep 2
ss -tlnp | grep 12436 || echo "PORT NOT LISTENING"
# Test with a system prompt that contains the trigger phrase
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
echo "{\"model\":\"z-ai/glm-5.2\",\"messages\":[{\"role\":\"system\",\"content\":\"Hermes Agent\"},{\"role\":\"user\",\"content\":\"Say hello\"}],\"max_tokens\":10}" | \
curl -sS --max-time 40 -w "\nHTTP_CODE:%{http_code}\n" -D - http://127.0.0.1:12436/v1/chat/completions \
  -H "Content-Type: application/json" -H "Authorization: Bearer $NV_KEY" -d @- 2>&1 | tail -20
echo "=== stats ==="
python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -10