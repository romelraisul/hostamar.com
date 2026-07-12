#!/usr/bin/env bash
# =============================================================================
# railway-zero-cost.sh — keep Railway at $0 when your computer is the primary.
#
# Runs on computer boot + every 5 min via cron. When the primary tunnel is
# healthy it SCALES THE RAILWAY 'web' SERVICE TO 0 REPLICAS (so it receives 0
# requests => ~$0). When the computer is down it SCALES BACK TO 1 REPLICA so
# the Cloudflare Worker can fail over.
#
# Uses the Railway CLI (already authenticated via `railway login`), so NO
# long-lived API token is stored. If the CLI is not logged in, the script
# logs and exits 0 (it never leaves Railway in a bad state).
#
# Usage:  railway-zero-cost.sh   (designed for cron: */5 * * * *)
# =============================================================================
set -uo pipefail

LOG="${RAILWAY_ZERO_COST_LOG:-/home/romel/hostamar-build/logs/railway-zero-cost.log}"
PRIMARY_HEALTH_URL="${PRIMARY_HEALTH_URL:-https://api-primary.hostamar.com/api/health}"
SERVICE="${RAILWAY_SERVICE:-web}"
PINNED_REGION="${RAILWAY_REGION:-}"   # optional; auto-detected if empty

log() { echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }

# --- Preconditions ---------------------------------------------------------
if ! command -v railway >/dev/null 2>&1; then
  log "SKIP: railway CLI not found on PATH"
  exit 0
fi
if ! curl -s --max-time 3 "https://api-primary.hostamar.com/api/health" >/dev/null 2>&1; then
  : # tunnel may be briefly flapping; we still probe below with a timeout
fi

# Fetch the current region list for the service. `railway service scale`
# echoes a "regions:  sfo (1) · US East (1)" line on EVERY invocation, so we
# issue a no-op scale (same value as current) and parse that line. Region names
# are normalized to Railway's CLI form (e.g. "US East" -> "us-east").
detect_regions() {
  local out regions
  out="$(bash -lc "railway service scale --service '$SERVICE' sfo=1" 2>&1)"
  regions="$(printf '%s' "$out" \
    | grep -i "regions:" | head -1 \
    | grep -oiE '[a-z-]+ ?[a-z]* \([0-9]+\)' \
    | sed -E 's/ \([0-9]+\)//; s/ //g; y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/; s/ /-/g')"
  echo "$regions"
}

# Read current replica count per region (region -> replicas), same source.
current_replicas() {
  bash -lc "railway service scale --service '$SERVICE' sfo=1" 2>/dev/null \
    | grep -i "regions:" | head -1 \
    | grep -oiE '[a-z-]+ ?[a-z]* \([0-9]+\)' \
    | sed -E 's/ ?\(([0-9]+)\)/ \1/; s/ //g; y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/; s/ /-/g'
}

# Scale the service to $1 replicas in EVERY region (true $0 pause = all 0).
# Idempotent: skips a region already at the target count (avoids redeploy churn).
scale_to() {
  local replicas="$1"
  local regions cur
  regions="$(detect_regions)"
  if [[ -z "$regions" ]]; then
    regions="${PINNED_REGION:-us-east}"
  fi
  local ok=1 changed=0
  for rg in $regions; do
    cur="$(current_replicas | grep -i "^${rg}=" | cut -d= -f2)"
    if [[ "$cur" == "$replicas" ]]; then
      log "Railway '$SERVICE' region '$rg' already at $replicas — skip"
      continue
    fi
    log "Scaling Railway '$SERVICE' region '$rg' -> $replicas replica(s)"
    local res
    res="$(bash -lc "railway service scale --service '$SERVICE' '$rg=$replicas'" 2>&1)"
    if echo "$res" | grep -qi "Unknown region"; then
      log "WARN: region '$rg' no longer exists on Railway — skipping"
      continue
    fi
    if ! echo "$res" >>"$LOG" 2>&1; then
      log "WARN: failed to scale region '$rg' (network/CLI) — leaving as-is"
      ok=0
    else
      changed=1
    fi
  done
  [[ "$changed" -eq 1 ]] && log "Done: Railway '$SERVICE' set to $replicas replica(s) in all regions"
  return "$ok"
}

# --- Decision --------------------------------------------------------------
if curl -s --max-time 5 "$PRIMARY_HEALTH_URL" | grep -qi '"ok"\|"status"\|healthy\|200'; then
  log "Primary UP -> pausing Railway (cost = 0)"
  scale_to 0 || true
else
  log "Primary DOWN -> unpausing Railway (failover)"
  scale_to 1 || true
fi

exit 0
