#!/usr/bin/env bash
# git-push-all.sh — commits everything dirty + pushes to BOTH hostamar repos.
#
# Usage:  ./git-push-all.sh [github_token]
#         GITHUB_TOKEN=ghp_xxx ./git-push-all.sh
#
# Token: must be a classic PAT with `repo` scope. Get one at
# https://github.com/settings/tokens (Settings → Developer settings → Personal
# access tokens → Tokens (classic) → Generate new token).

set -euo pipefail

REPO_DIR="${REPO_DIR:-/mnt/c/Users/romel/hostamar-local/flociops-assistant}"
MAIN_REPO="https://github.com/monjilaktn/hostamar.git"
FORK_REPO="https://github.com/romelraisul/hostamar.com.git"

TOKEN="${1:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
    echo "ERROR: no GitHub token. Pass as arg or set GITHUB_TOKEN env var." >&2
    echo "  ./git-push-all.sh ghp_xxxxxxxxxxxxxxxx" >&2
    exit 1
fi

cd "$REPO_DIR"

echo "===[ git status ]==="
git status --short | head -40

echo "===[ adding all changes ]==="
git add -A

# Only commit if there's something to commit
if git diff --cached --quiet; then
    echo "===[ nothing to commit, working tree clean or already staged ]==="
else
    echo "===[ committing ]==="
    git commit -m "Sync: Docker files, GPU worker refactor, worker callback endpoint" \
        || { echo "commit failed (likely index lock in WSL). Try:" >&2
             echo "  icacls '.git' '/grant' \"%USERNAME%:(OI)(CI)F' /T" >&2
             echo "from PowerShell Admin, then re-run." >&2
             exit 2; }
fi

echo "===[ ensuring branch = main ]==="
git branch -M main 2>/dev/null || true

echo "===[ pushing to MAIN repo: monjilaktn/hostamar ]==="
git push "https://${TOKEN}@github.com/monjilaktn/hostamar.git" main --force 2>&1 | tail -5

echo "===[ pushing to FORK repo: romelraisul/hostamar.com ]==="
git push "https://${TOKEN}@github.com/romelraisul/hostamar.com.git" main --force 2>&1 | tail -5

echo "===[ done — both pushes complete ]==="
echo "Main:  https://github.com/monjilaktn/hostamar"
echo "Fork:  https://github.com/romelraisul/hostamar.com"
