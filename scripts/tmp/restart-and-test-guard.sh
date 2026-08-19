#!/bin/bash
# restart-and-test-guard.sh

# Kill any existing guard
pkill -f "nvidia-guard.py" 2>/dev/null
sleep 1

# Clean up log
> /home/romel/hostamar-build/logs/nvidia-guard.log

# Start fresh
python3 /home/romel/hostamar-build/token-guard/nvidia-guard.py --listen 127.0.0.1:12436 &

sleep 2

# Test with a system prompt containing the trigger phrase
echo "=== Test 1: With 'Hermes Agent' in system prompt (should sanitize to 'Hermes framework') ==="
NV_KEY=$(grep "^NVIDIA_API_KEY=" /home/romel/.hermes/.env | tail -1 | cut -d= -f2-)
curl -sS --max-time 40 http://127.0.0.1:12436/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $NV_KEY" -d '{"model":"z-ai/glm-5.2","messages":[{"role":"system","content":"You are Hermes Agent"},{"role":"user","content":"Say hello in 3 words"}],"max_tokens":20}' 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('RESP:', d.get('choices',[{}])[0].get('message',{}).get('content','ERROR: '+json.dumps(d)))" 2>&1

echo ""
echo "=== Test 2: Without 'Hermes Agent' (control) ==="
curl -sS --max-time 40 http://127.0.0.1:12436/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer $NV_KEY" -d '{"model":"z-ai/glm-5.2","messages":[{"role":"system","content":"You are Hermes framework"},{"role":"user","content":"Say hello in 3 words"}],"max_tokens":20}' 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print('RESP:', d.get('choices',[{}])[0].get('message',{}).get('content','ERROR: '+json.dumps(d)))" 2>&1

echo ""
echo "=== Guard stats ==="
python3 /home/romel/hostamar-build/token-guard/nvidia-guard.py --stats 2>&1 | tail -10
