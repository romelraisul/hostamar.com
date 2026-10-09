#!/usr/bin/env bash
# PIN3 — Terraform PR approval gate. The Decision API decides whether a human must confirm.
# Blocks (exit 1) when the model says "yes" OR when it is not confident (escalate=true, the 60%
# rule) — an unconfident "no" is exactly the case that must not be automated.
#   exit 0 = automated, safe to apply
#   exit 1 = Prod Approval Required
#   exit 2 = Decision API unreachable -> fail CLOSED
# Usage: ops/decision-gate.sh <tfplan.json> [pr-title]   |   ops/decision-gate.sh --selftest
set -euo pipefail
API="${DECISION_API_URL:-https://hostamar.com/api/decision}"

# the whole decision logic, pure and offline-testable: block on yes OR on low confidence
verdict_exit() { if [ "${1:-}" = "yes" ] || [ "${2:-}" = "true" ]; then echo 1; else echo 0; fi; }

ask() { # $1=tf_diff  $2=module  $3=cost
  jq -nc --arg d "$1" --arg t "$2" --argjson c "${3:-0}" \
    '{question:"Does this change require human confirmation?",choices:["yes","no"],
      who:"github/terraform",context:{tf_diff:$d,target_module:$t,cost_delta:$c}}'
}

gate() { # $1=plan json  $2=title
  local diff cost resp choice conf esc
  diff=$(jq -r '.resource_changes[]?.address' "$1" 2>/dev/null | head -20 | paste -sd' ')
  cost=$(jq -r '[.resource_changes[]?.change.after|select(.!=null)]|length' "$1" 2>/dev/null || echo 0)
  resp=$(curl -sS -m 30 -X POST "$API" -H 'Content-Type: application/json' -d "$(ask "$diff" "$2" "$cost")") \
    || { echo "GATE: decision api unreachable -> FAIL CLOSED (approval required)"; return 2; }
  choice=$(jq -r '.choice' <<<"$resp"); conf=$(jq -r '.confidence' <<<"$resp"); esc=$(jq -r '.escalate' <<<"$resp")
  echo "GATE: decision=$choice confidence=$conf escalate=$esc module=$2"
  if [ "$(verdict_exit "$choice" "$esc")" = 1 ]; then
    echo "::error::Prod Approval Required — '$2' (decision=$choice conf=$conf). diff: ${diff:0:200}"
    return 1
  fi
  return 0
}

if [ "${1:-}" = "--selftest" ]; then
  fails=0
  # 1) the mapping, offline and deterministic
  chk() { [ "$(verdict_exit "$2" "$3")" = "$4" ] || { echo "  FAIL verdict_exit($2,$3) != $4 (got $(verdict_exit "$2" "$3"))"; fails=1; }; }
  echo "-- verdict_exit mapping"
  chk t yes false 1; chk t no false 0; chk t no true 1; chk t yes true 1
  # 2) end to end against the live API: must block, must never be exit 2 (unreachable)
  echo "-- live plan through the gate"
  t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
  printf '%s' '{"resource_changes":[{"address":"aws_vpc.main","change":{"after":{"cidr_block":"0.0.0.0/0"}}}]}' > "$t/vpc.json"
  out=$(gate "$t/vpc.json" "module/vpc") && rc=0 || rc=$?
  echo "$out"
  case "$rc" in
    1) : ;;                                   # blocked = correct fail-closed behaviour
    2) echo "  FAIL decision api unreachable"; fails=1 ;;
    0) echo "  FAIL vpc/0.0.0.0/0 was waved through"; fails=1 ;;
  esac
  [ "$fails" = 0 ] && { echo SELFTEST_PASS; exit 0; } || { echo SELFTEST_FAIL; exit 1; }
fi

[ $# -ge 1 ] || { echo "usage: $0 <tfplan.json> [pr-title] | --selftest"; exit 2; }
gate "$1" "${2:-unknown}"
