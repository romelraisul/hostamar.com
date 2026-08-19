#!/bin/bash
# Update NVIDIA_BASE_URL to point through the guard proxy
set -e
ENV_FILE="/home/romel/.hermes/.env"
NEW_URL="http://127.0.0.1:12436/v1"

# Replace the existing NVIDIA_BASE_URL line
if grep -q "^NVIDIA_BASE_URL=" "$ENV_FILE"; then
    # Use a temp file to avoid sed -i issues on cross-fs mount
    sed "s|^NVIDIA_BASE_URL=.*|NVIDIA_BASE_URL=${NEW_URL}|" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    echo "UPDATED: NVIDIA_BASE_URL -> ${NEW_URL}"
else
    echo "NVIDIA_BASE_URL=${NEW_URL}" >> "$ENV_FILE"
    echo "APPENDED: NVIDIA_BASE_URL -> ${NEW_URL}"
fi

# Verify
grep "^NVIDIA_BASE_URL=" "$ENV_FILE"
