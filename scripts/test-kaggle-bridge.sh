#!/usr/bin/env bash
# test-kaggle-bridge.sh — quick smoke test for the free-GPU bridge.
#
# Use after you've started one of the notebooks and got a public URL.
# Set COLAB_VIDEO_URL or KAGGLE_VIDEO_URL in your shell, then run.

set -e

URL="${COLAB_VIDEO_URL:-${KAGGLE_VIDEO_URL:-}}"
if [ -z "$URL" ]; then
    echo "ERROR: set COLAB_VIDEO_URL or KAGGLE_VIDEO_URL in your shell env" >&2
    echo "  eg:  export COLAB_VIDEO_URL=https://1a2b-3c4d.ngrok-free.app" >&2
    exit 1
fi

echo "===== /health ====="
curl -s -m 10 "$URL/health" | head -c 500
echo ""
echo ""

echo "===== /generate (small test, 2s clip, expect 30-60s first run) ====="
T0=$(date +%s)
curl -s -m 120 -X POST "$URL/generate" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"a beautiful dhaka sunset cinematic","duration":2,"aspect_ratio":"16:9"}' \
    | python3 -c "
import json, sys
r = json.load(sys.stdin)
if 'videoBase64' in r:
    import base64
    data = base64.b64decode(r['videoBase64'])
    open('/tmp/bridge_test.mp4','wb').write(data)
    print(f\"✓ got {len(data)} bytes MP4\")
    print(f\"  saved to /tmp/bridge_test.mp4 — open with: xdg-open /tmp/bridge_test.mp4\")
    print(f\"  server reported elapsedSec={r.get('elapsedSec')}\")
else:
    print('✗ error response:', r)
    sys.exit(2)
"
echo ""
T1=$(date +%s)
echo "wall time: $((T1-T0)) seconds"
