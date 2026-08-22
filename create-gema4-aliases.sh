#!/bin/bash
# create-gema4-aliases.sh - run AFTER gemma3:12b + codegemma:7b are pulled.
# Creates permanent Ollama aliases and restarts litellm-play to load them.
set -u
BUILD=/mnt/c/Users/User/hostamar-build
ollama list 2>/dev/null | grep -q "gema4:12b"      || { ollama list 2>/dev/null | grep -q "gemma3:12b"    && ollama cp gemma3:12b gema4:12b; }
ollama list 2>/dev/null | grep -q "gema4-code:12b" || { ollama list 2>/dev/null | grep -q "codegemma:7b"  && ollama cp codegemma:7b gema4-code:12b; }
ollama list 2>/dev/null | grep -q "gemma4-12b-code" || { ollama list 2>/dev/null | grep -q "gemma3:12b"  && ollama cp gemma3:12b gemma4-12b-code; }
echo "=== aliases ==="; ollama list 2>/dev/null | grep gema4
# Restart litellm-play so the new model_list (gema4 entries) is loaded.
docker rm -f litellm-play >/dev/null 2>&1
docker run -d --name litellm-play \
  -p 4000:4000 \
  -v "$BUILD/litellm-config.final.yaml:/tmp/cfg.yaml:ro" \
  -v "$BUILD/token_guard_per_sec.py:/tmp/token_guard_per_sec.py:ro" \
  -e PYTHONPATH=/tmp -e NVIDIA_API_KEY=placeholder -e KILOCODE_API_KEY=placeholder \
  -e KILOCODE_API_KEY_1=placeholder -e KILOCODE_API_KEY_2=placeholder \
  --add-host host.docker.internal:host-gateway \
  ghcr.io/berriai/litellm:main-latest \
  --config /tmp/cfg.yaml --port 4000 --detailed_debug
sleep 10
echo "=== verify gema4 in /v1/models ==="
curl -s http://localhost:4000/v1/models | python3 -c "import sys,json;d=json.load(sys.stdin);print([m['id'] for m in d['data'] if 'gema4' in m['id']])"
