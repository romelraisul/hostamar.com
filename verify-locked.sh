#!/bin/bash
# verify-locked.sh - audit /mnt/c/Users/User/hostamar-build/perma-locked.json
# against the live state. Run anytime (or auto via permanent.sh on boot).
# Exits 0 only when ALL locked items present; prints drift + non-zero otherwise.
#
# Ground-verified fixes 2026-07-18:
#   - 'jq' is NOT installed on this WSL box. The previous python fallback
#     crashed with `KeyError: '-r'` (it aliased jq to a 1-arg python snippet
#     then tried to swallow '-r' as JSON path, raising immediately on
#     every call). Replaced with a small, robust python3 helper that accepts
#     '-r' + a dotted/joined path expression + the file path.
#   - Augmentation (training history + key status) was placed AFTER the
#     `exit 0`/`exit 1` -> dead code, never printed. Moved BEFORE both exits
#     so it always runs (additive; original pass/fail summary unchanged).
set -u
ROOT=/mnt/c/Users/User/hostamar-build
REG="$ROOT/perma-locked.json"
LOG="$ROOT/permanent.log"
ts="$(date '+%Y-%m-%d %H:%M:%S')"

# ---- jq(-compatible) helper via python3 -----------------------------------
# Supports the two query shapes used here:
#   jq -r '.models[].alias'   file   -> one value per line
#   jq -r '.services[].port'  file
#   jq -r '.services[] | select(.name=="x") | .port'  file
jq() {
  local emit_raw=0 path="" field=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -r) emit_raw=1; shift ;;
      -r:*) shift ;;
      *) path="$1"; shift; break ;;
    esac
  done
  local file="$1"
  python3 - "$path" "$file" "$emit_raw" <<'PY'
import sys, json, re
expr, fname, _raw = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(fname))
# expr may be: '.models[].alias'   OR   '.services[] | select(.name=="x") | .port'
parts = [p.strip() for p in expr.split('|')]
# Walk: first part is the leading path e.g. '.services[]' or '.models[].alias'
def walk(obj, path):
    # path like '.services[].port' or '.models'
    if not path or path == '.':
        yield obj
        return
    # normalise leading dot
    p = path[1:] if path.startswith('.') else path
    # split first key
    if '[' in p:
        key, rest = p.split('[', 1)
        # rest like '].port' or '].name=="x")'
        after_bracket, rest = rest.split(']', 1)
        sub = data if key == '' else (obj.get(key) if isinstance(obj, dict) else None)
        if sub is None: return
        # select(...) filter only on services/models lists; ignore for first walk
        if isinstance(sub, list):
            for item in sub:
                if rest:
                    yield from walk(item, rest)
                else:
                    yield item
    else:
        key = p.split('.', 1)
        if len(key) == 1:
            v = obj.get(key[0]) if isinstance(obj, dict) else None
            if v is not None: yield v
        else:
            sub = obj.get(key[0]) if isinstance(obj, dict) else None
            if sub is None: return
            yield from walk(sub, '.' + key[1])

# Apply the leading path + filters. Simplify: handle the two real shapes.
target = data
# shape 1: '.models[].alias' or '.services[].port' (no '|')
if '|' not in expr:
    # strip leading dot
    e = expr[1:] if expr.startswith('.') else expr
    head_key, remainder = e.split('.', 1) if '.' in e else (e, '')
    head_key = head_key.replace('[]', '')
    if head_key in target and isinstance(target[head_key], list):
        for item in target[head_key]:
            if not remainder:
                print(json.dumps(item) if isinstance(item, (dict,list)) else item)
            elif remainder in item:
                v = item[remainder]
                print(v if not isinstance(v,(dict,list)) else json.dumps(v))
else:
    # shape 2: '.services[] | select(.name=="x") | .port'
    left, right = [p.strip() for p in expr.split('|', 1)]
    right_field = right.split('==')[0].split('.')[-1] if 'select' not in right else right.rsplit('.',1)[-1]
    # crude select on name
    m = re.search(r'select\(\.(\w+)\s*==\s*"([^"]+)"\)', expr)
    if m:
        fld, want = m.group(1), m.group(2)
        list_key = left.replace('[]','').lstrip('.')
        for item in target.get(list_key, []) if isinstance(target, dict) else []:
            if item.get(fld) == want and right_field in item:
                print(item[right_field])
                sys.exit(0)
PY
}

ok=0
fail=0
drift=""
echo "=== lock-verify $ts ==="

# 1) Each Ollama model
# Use prefix-match (grep -q) NOT exact (grep -qx): ollama tags aliases with
# auto :latest tail and perma-locked.json deliberately lists alias as
# 'qwen3.6' so the prefix must match 'qwen3.6:latest' & 'qwen3.6:27b'.
for alias in $(jq -r '.models[].alias' "$REG"); do
  # alias may be 'qwen3.6:27b' (exact tag) or 'qwen3.6' (prefix). Build a
  # pattern that matches both "<alias>" and "<alias>:latest".
  pat="^${alias}(\$|:latest\$|:latest )"
  if ollama list 2>/dev/null | awk '{print $1}' | grep -qE "$pat"; then
    echo "  [PASS] ollama model $alias"
    ok=$((ok+1))
  else
    echo "  [DRIFT] ollama model $alias MISSING"
    drift="$drift\n  - model: $alias"
    fail=$((fail+1))
  fi
done

# 2) Each service
for name in $(jq -r '.services[].name' "$REG"); do
  port=$(jq -r ".services[] | select(.name==\"$name\") | .port" "$REG")
  if docker ps --format '{{.Names}}' | grep -qx "$name"; then
    if [ "$port" != "null" ] && [ -n "$port" ]; then
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "http://localhost:$port/" || echo 000)
      if [ "$code" = "200" ]; then
        echo "  [PASS] service $name (port $port)"
        ok=$((ok+1))
      elif [ "$code" = "404" ]; then
        echo "  [PASS] service $name up (port $port, /->404 ok)"
        ok=$((ok+1))
      else
        echo "  [DRIFT] service $name up but port $port HTTP=$code"
        drift="$drift\n  - service: $name port $port HTTP=$code"
        fail=$((fail+1))
      fi
    else
      echo "  [PASS] service $name (no port check)"
      ok=$((ok+1))
    fi
  else
    echo "  [DRIFT] service $name NOT RUNNING"
    drift="$drift\n  - service: $name"
    fail=$((fail+1))
  fi
done

total=$((ok+fail))
echo "=== summary: $ok pass / $fail fail / $total total ==="

# --- Augmented: training history + key status (always runs, additive) ----
echo ""
echo "=== TRAINING HISTORY LAST 3 ==="
if [ -f "$ROOT/training/training-history.jsonl" ]; then
  tail -3 "$ROOT/training/training-history.jsonl" 2>/dev/null || echo "(unreadable)"
else
  echo "(no training yet - run bash training/train-before-task.sh \"test\")"
fi
echo "=== KILOCODE KEY STATUS ==="
if [ -n "${KILOCODE_API_KEY_1:-}" ] && [ "${KILOCODE_API_KEY_1:-}" != "placeholder" ] && [ "${KILOCODE_API_KEY_1:-}" != "" ]; then
  echo "has key - online training possible"
else
  echo "no key - will use offline qwen3.6:27b teacher"
fi

if [ "$fail" -gt 0 ]; then
  printf "drift:%b\n" "$drift" >> "$LOG"
  echo "[$ts][verify] FAIL $fail/$total" >> "$LOG"
  exit 1
fi
echo "[$ts][verify] PASS $ok/$total" >> "$LOG"
exit 0
