#!/bin/bash
# LongCat isolated browser - 127.0.0.1:8082 - no login, per-request isolated context
# Each customer gets fresh newContext() so sessions never mix (no storageState)
set -e
if ss -tln 2>/dev/null | grep -q ":8082 "; then echo "longcat 8082 already up"; exit 0; fi
python3 /mnt/c/Users/User/hostamar-ai-gateway/longcat_server.py > /tmp/longcat.log 2>&1 &
sleep 3
curl -s http://127.0.0.1:8082/health | head -c 100 && echo " longcat ready"
