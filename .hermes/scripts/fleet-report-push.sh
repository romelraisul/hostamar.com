#!/bin/bash
# Push a Channel shift report to hostamar.com/api/admin/fleet
# Usage: fleet-report-push.sh <job-id> <employee-name> <verdict> <finished> <couldnt> <needsYou>

JOB_ID=$1
EMP_NAME=$2
VERDICT=$3
FINISHED=$4
COULDNT=$5
NEEDSYOU=$6

# Load secrets from fleet.env using absolute path
ENV_FILE=/home/romel/.hermes/scripts/fleet.env
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found" >&2
    exit 1
fi

FLEET_SECRET=$(grep "^FLEET_REPORT_SECRET=" "$ENV_FILE" | cut -d'=' -f2)
if [ -z "$FLEET_SECRET" ]; then
    echo "ERROR: FLEET_REPORT_SECRET not found in $ENV_FILE" >&2
    exit 1
fi

# Build JSON payload
JSON=$(jq -n --arg job_id "$JOB_ID" --arg employee "$EMP_NAME" \
    --arg verdict "$VERDICT" --arg finished "$FINISHED" \
    --arg couldnt "$COULDNT" --arg needsYou "$NEEDSYOU" \
    '{job_id: $job_id, employee: $employee, verdict: $verdict, finished: $finished, couldnt: $couldnt, needsYou: $needsYou}')

# Send to Fleet API
API_URL="https://hostamar.com/api/admin/fleet"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/fleet_response.json -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FLEET_SECRET" \
    -d "$JSON")

if [ "$RESPONSE" = "200" ]; then
    echo "SUCCESS: Fleet report pushed (HTTP $RESPONSE)"
    cat /tmp/fleet_response.json | jq .
else
    echo "ERROR: Fleet API returned HTTP $RESPONSE"
    cat /tmp/fleet_response.json
    exit 1
fi
