#!/usr/bin/env bash
# PIN3 — Terraform PR approval gate. The Decision API decides whether a human must confirm.
# Blocks (exit 1) when the model says "yes" OR when it is not confident (escalate=true, the 60%
# rule) — an unconfident "no" is exactly the case that must not be automated.
#   exit 0 = automated, safe to apply
#   exit 1 = Prod Approval Required
#   exit 2 = Decision API unreachable -> fail CLOSED
# Usage: ops/decision-gate.sh <tfplan.json> [pr-title]
#        ops/decision-gate.sh --tfplan=<plan.json> [--cost=0] [--pr-title="..."]
#        ops/decision-gate.sh --selftest
set -euo pipefail
API="${DECISION_API_URL:-https://hostamar.com/api/decision}"

# the whole decision logic, pure and offline-testable: block on yes OR on low confidence
verdict_exit() { if [ "${1:-}" = "yes" ] || [ "${2:-}" = "true" ]; then echo 1; else echo 0; fi; }

# Risk signals, not the raw diff. The judge is a 0.8B local model: handed a bare
# address list (or 40KB of tf JSON) it answers "no" at confidence 0.17-0.25, and the
# 60% rule then escalates EVERY plan — including the benign ones. Extract the class
# of change the gate is actually asking about and let it score that.
#   Network exposure / IAM / prod DB / any delete  -> yes, high confidence
#   additive + non-network (r2, dns, storage, ci)  -> no,  high confidence
risk_signals() { # $1 = plan json
  jq -r '
    def flags:
      [ (if (.change?.actions // []) | index("delete") then "DELETE" else empty end),
        (if tostring | test("0\\.0\\.0\\.0/0|::/0")    then "public-ingress" else empty end),
        (if tostring | test("aws_iam_|iam_policy")      then "IAM" else empty end),
        (if tostring | test("aws_db_instance|aws_rds|aurora|rds_cluster|neon|turso") then "DATABASE" else empty end),
        (if tostring | test("aws_security_group|aws_vpc|aws_subnet|aws_network_acl|aws_lb|aws_vpn|aws_nat") then "NETWORK" else empty end) ]
      | join("+");
    [ .resource_changes[]? | {a: .address, f: flags} | select(.f != "") | "\(.a)[\(.f)]" ]
    | if length == 0 then "none" else (join("; ") | .[0:400]) end' "$1" 2>/dev/null || echo "unreadable"
}

# everything changed, address(action) — compact, capped; the signals above carry the risk
change_list() { # $1 = plan json
  jq -r '[.resource_changes[]? | "\(.address)(\((.change?.actions // []) | join(",")))"]
         | if length == 0 then "no changes" else join(" ; ") end' "$1" 2>/dev/null | cut -c1-600
}

ask() { # $1=changes $2=module $3=cost $4=signals $5=title
  jq -nc --arg d "$1" --arg t "$2" --argjson c "${3:-0}" --arg s "$4" --arg p "$5" \
    '{question:"Does this change require human confirmation? Rule: answer yes with high confidence when the plan touches network exposure (vpc/security-group/0.0.0.0/0/load-balancer/iam/production database) or deletes anything; answer no with high confidence when every change is additive and non-network (r2 bucket, dns record, storage, docs, ci, monitoring). Score the risk class, not the diff size.",
      choices:["yes","no"], who:"github/terraform",
      context:{tf_diff:$d,target_module:$t,cost_delta:$c,risk_signals:$s,pr_title:$p}}'
}

gate() { # $1=plan json  $2=title  $3=real cost (optional)
  local diff cost signals resp choice conf esc
  diff=$(change_list "$1")
  signals=$(risk_signals "$1")
  cost="${3:-$(jq -r '[.resource_changes[]?.change.after|select(.!=null)]|length' "$1" 2>/dev/null || echo 0)}"
  resp=$(curl -sS -m 30 -X POST "$API" -H 'Content-Type: application/json' -d "$(ask "$diff" "$2" "$cost" "$signals" "$2")") \
    || { echo "GATE: decision api unreachable -> FAIL CLOSED (approval required)"; return 2; }
  choice=$(jq -r '.choice' <<<"$resp"); conf=$(jq -r '.confidence' <<<"$resp"); esc=$(jq -r '.escalate' <<<"$resp")
  echo "GATE: decision=$choice confidence=$conf escalate=$esc module=$2 risk=${signals:0:200}"
  if [ "$(verdict_exit "$choice" "$esc")" = 1 ]; then
    echo "::error::Prod Approval Required — '$2' (decision=$choice conf=$conf). risk=$signals diff: ${diff:0:200}"
    return 1
  fi
  return 0
}

# ---- args: positional (workflow) or --flags ----
TFPLAN="" TITLE="" COST="" SELFTEST=0
for a in "$@"; do
  case "$a" in
    --selftest)   SELFTEST=1 ;;
    --tfplan=*)   TFPLAN="${a#*=}" ;;
    --cost=*)     COST="${a#*=}" ;;
    --pr-title=*) TITLE="${a#*=}" ;;
    -*)           echo "unknown flag: $a" >&2; exit 2 ;;
    *)            if [ -z "$TFPLAN" ]; then TFPLAN="$a"; elif [ -z "$TITLE" ]; then TITLE="$a"; fi ;;
  esac
done

if [ "$SELFTEST" = 1 ]; then
  fails=0
  # 1) the mapping, offline and deterministic
  chk() { [ "$(verdict_exit "$2" "$3")" = "$4" ] || { echo "  FAIL verdict_exit($2,$3) != $4 (got $(verdict_exit "$2" "$3"))"; fails=1; }; }
  echo "-- verdict_exit mapping"
  chk t yes false 1; chk t no false 0; chk t no true 1; chk t yes true 1
  echo "-- risk_signals extraction"
  t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
  printf '%s' '{"resource_changes":[{"address":"module.r2.cloudflare_r2_bucket.test","change":{"actions":["create"]}}]}' > "$t/benign.json"
  printf '%s' '{"resource_changes":[{"address":"module.vpc.aws_security_group.open","change":{"actions":["create"],"after":{"ingress":[{"cidr_blocks":["0.0.0.0/0"]}]}}}]}' > "$t/risky.json"
  s=$(risk_signals "$t/benign.json"); echo "  benign -> $s"
  [ "$s" = "none" ] || { echo "  FAIL benign plan flagged: $s"; fails=1; }
  s=$(risk_signals "$t/risky.json"); echo "  risky  -> $s"
  case "$s" in *public-ingress*) : ;; *) echo "  FAIL 0.0.0.0/0 not flagged"; fails=1 ;; esac
  # 2) end to end against the live API — both directions matter, see the 60% rule
  echo "-- live: risky plan must block"
  out=$(gate "$t/risky.json" "module/vpc") && rc=0 || rc=$?
  echo "$out"
  case "$rc" in
    1) : ;;                                   # blocked = correct fail-closed behaviour
    2) echo "  FAIL decision api unreachable"; fails=1 ;;
    0) echo "  FAIL vpc/0.0.0.0/0 was waved through"; fails=1 ;;
  esac
  echo "-- live: benign plan must pass (judge problem, not gate problem)"
  out=$(gate "$t/benign.json" "Add r2 bucket") && rc=0 || rc=$?
  echo "$out"
  case "$rc" in
    0) : ;;
    1) echo "  FAIL benign r2 plan blocked — judge scores the diff unconfidently -> escalate"; fails=1 ;;
    2) echo "  FAIL decision api unreachable"; fails=1 ;;
  esac
  [ "$fails" = 0 ] && { echo SELFTEST_PASS; exit 0; } || { echo SELFTEST_FAIL; exit 1; }
fi

[ -n "$TFPLAN" ] || { echo "usage: $0 <tfplan.json> [pr-title] | --tfplan=<json> [--cost=N] [--pr-title=t] | --selftest"; exit 2; }
# piped plan (/dev/stdin, -): slurp once, it is read more than once below
case "$TFPLAN" in /dev/stdin|-|/dev/fd/*) _t=$(mktemp); cat > "$_t"; TFPLAN="$_t"; trap 'rm -f "$_t"' EXIT ;; esac
gate "$TFPLAN" "${TITLE:-unknown}" "$COST"
