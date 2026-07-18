#!/usr/bin/env bash
# entrypoint-litellm.sh — wraps litellm startup so the hostamar token guard
# is registered BEFORE the proxy binds. This avoids the fragile `callbacks:`
# dotted-path resolution inside LiteLLM's config loader.
set -e
cd /tmp/guard
export PYTHONPATH=/tmp/guard:/tmp:${PYTHONPATH:-}
# Preflight: confirm the guard imports + DB is writable
python3 - <<'PY'
import sys
sys.path.insert(0, '/tmp/guard')
import guard_callback as g
assert hasattr(g, 'guard_callback'), "guard_callback instance missing"
assert g._GUARD is not None, "TokenGuard not initialized"
print(f"[entrypoint] guard OK: {type(g._GUARD).__name__} | provider hints wired")
PY
echo "[entrypoint] launching litellm proxy with config /tmp/cfg.yaml on :4000"
exec litellm --config /tmp/cfg.yaml --port 4000 "$@"
