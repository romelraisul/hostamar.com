#!/bin/bash
# hostamar-functions.sh — compatibility shim
# Permanent architecture: source the canonical failover script so helpers stay in one place.

# Resolve repo root from this file's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${REPO_DIR}/scripts/hostamar-failover.sh" ]]; then
    # shellcheck disable=SC1090
    source "${REPO_DIR}/scripts/hostamar-failover.sh"
fi
