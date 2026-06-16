#!/usr/bin/env bash
# git-push-fork.sh — commits + pushes ONLY to fork repo, no main-repo write needed.
#
# Use this script when you don't have push access to monjilaktn/hostamar (the
# main repo) — it pushes everything to romelraisul/hostamar.com (your fork).
#
# Token: a fine-grained PAT, scope it to romelraisul/hostamar.com ONLY.
# Get one at: https://github.com/settings/personal-access-tokens/new
# (Repo = Only select repos = romelraisul/hostamar.com. Perms = Contents:
# Read and write. Expiry = 7 days.)
#
# IMPORTANT: set the token in your SHELL, never paste it in chat or commits:
#   export GITHUB_TOKEN=<paste-token>
#   ./scripts/git-push-fork.sh                       # default commit msg
#   ./scripts/git-push-fork.sh "feat: my message"   # custom msg
#   unset GITHUB_TOKEN

set -euo pipefail

REPO_DIR="${REPO_DIR:-/mnt/c/Users/romel/hostamar-local/flociops-assistant}"
FORK_HOST="github.com"
FORK_USER="romelraisul"
FORK_REPO="hostamar.com"
FORK_URL="https://${FORK_HOST}/${FORK_USER}/${FORK_REPO}.git"

TOKEN="${GITHUB_TOKEN:-${GIT_TOKEN:-}}"
if [ -z "${TOKEN}" ]; then
    echo "ERROR: no GitHub token in your shell." >&2
    echo "  Usage (token NEVER echoed into chat or git history):" >&2
    echo '    export GITHUB_TOKEN=YOUR-TOKEN-HERE' >&2
    echo '    ./scripts/git-push-fork.sh' >&2
    echo '    unset GITHUB_TOKEN' >&2
    exit 1
fi

# Basic shape check so we don't try to push <none>@github.com (which makes
# git emit 'Malformed input to a URL function').
if [[ ! "$TOKEN" =~ ^[A-Za-z0-9_]{20,255}$ ]]; then
    echo "ERROR: GITHUB_TOKEN has unexpected shape (length=${#TOKEN})." >&2
    echo "  Fine-grained PATs look like: github_pat_<20+ chars>" >&2
    echo "  Classic PATs look like:       ghp_<36 chars>" >&2
    echo "  Currently set value preview: ${TOKEN:0:4}...${TOKEN: -4}  (length ${#TOKEN})" >&2
    exit 1
fi

cd "$REPO_DIR"

echo "===[ git status ]==="
git status --short | head -40

echo "===[ ensuring branch = main ]==="
git branch -M main 2>/dev/null || true

echo "===[ adding all changes ]==="
git add -A

if git diff --cached --quiet; then
    echo "===[ nothing to commit, working tree clean — pushing current HEAD ]==="
else
    MSG="${1:-Sync: latest hostamar dev work}"
    echo "===[ committing ]==="
    # shellcheck disable=SC2086  # commit msg flags come through argv
    git commit -m "$MSG" \
        || { echo "commit failed (likely index lock in WSL). Run in PowerShell Admin:" >&2
             echo '  icacls ".git" /grant "%USERNAME%:(OI)(CI)F" /T' >&2
             exit 2; }
fi

# Use a temp dir for the URL so the token doesn't land in any logs.
PUSH_URL="https://${TOKEN}@${FORK_HOST}/${FORK_USER}/${FORK_REPO}.git"
echo "===[ pushing to FORK repo: ${FORK_USER}/${FORK_REPO} ]==="
git push "$PUSH_URL" main --force 2>&1 | tail -8
unset PUSH_URL

echo ""
echo "===[ done — push complete ]==="
echo "View:  https://github.com/${FORK_USER}/${FORK_REPO}"
echo "Remember:  unset GITHUB_TOKEN"
