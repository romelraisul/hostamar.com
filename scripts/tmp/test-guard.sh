#!/bin/bash
# Test Nvidia guard with "Hermes Agent" system prompt (should get sanitized + 502 fallback)
set -e

NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)

echo "=== 1. Guard process status ==="
ps aux | grep nvidia-guard | grep -v grep || echo "NOT RUNNING"
echo ""

echo "=== 2. Port 12436 listening ==="
ss -tlnp 2>/dev/null | grep 12436 || echo "NOT LISTENING"
echo ""

echo "=== 3. Test with 'Hermes Agent' system prompt (guard should sanitize) ==="
curl -sS --max-time 40 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NV_KEY" \
  -d '{"model":"z-ai/glm-5.2","messages":[{"role":"system","content":"You are Hermes Agent, an AI assistant."},{"role":"user","content":"Say hello in 3 words"}],"max_tokens":20}' \
  http://127.0.0.1:12436/v1/chat/completions 2>&1 | head -30
echo ""

echo "=== 4. Guard log tail ==="
tail -15 /home/romel/hostamar-build/logs/nvidia-guard.log
echo ""

echo "=== 5. Guard stats ==="
cd /home/romel/hostamar-build && python3 token-guard/nvidia-guard.py --stats 2>&1 | tail -12