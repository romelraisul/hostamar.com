#!/usr/bin/env bash
# =============================================================================
# review-local.sh — run the AI Code Review guardrails locally, mirroring
# .github/workflows/ai-review.yml (the static layer, no LLM tokens).
#
# Usage:  bash scripts/review-local.sh
#         bash scripts/review-local.sh <base-ref>   # default: origin/main
#
# Exits non-zero on any blocking violation, so it can gate a pre-push hook.
# =============================================================================
set -uo pipefail
BASE="${1:-origin/main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== AI Code Review (local) against base: $BASE =="

# 1. Forbidden-file block --------------------------------------------------
FORBIDDEN=("_reset.ts" "vcheck.sql" "rag_check.sql" "scripts/_reset.ts")
VIOL=()
seen=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="${f##*/}"
  matched=""
  for bad in "${FORBIDDEN[@]}"; do
    if [ "$f" = "$bad" ] || [ "$base" = "$bad" ]; then matched="$f"; break; fi
  done
  if [ -n "$matched" ]; then
    if [[ ! " ${seen[*]} " =~ " ${matched} " ]]; then VIOL+=("$matched"); seen+=("$matched"); fi
  fi
done < <(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only HEAD~1...HEAD 2>/dev/null || true)
if [ "${#VIOL[@]}" -gt 0 ]; then
  echo "::error:: Forbidden file(s) in diff:"; printf '  - %s\n' "${VIOL[@]}"; exit 1
fi
echo "OK: no forbidden files"

# 2. Secret-in-client scan -------------------------------------------------
PATTERN='(LIVEKIT_[A-Z_]+|NEXTAUTH_SECRET|DATABASE_URL|STRIPE_[A-Z_]+|[A-Z_]+_SECRET|[A-Z_]+_API_KEY|[A-Z_]+_PRIVATE_KEY|PRIVATE_KEY)'
HITS="$(grep -rEn "$PATTERN" --include='*.tsx' --include='*.jsx' app components 2>/dev/null | grep -vE 'route\.tsx?$|/lib/|/server/|server-only|NEXT_PUBLIC_|/dev-tools/' || true)"
if [ -n "$HITS" ]; then
  echo "::error:: Possible secret/credential reaching client code:"; echo "$HITS"; exit 1
fi
echo "OK: no secrets in client components"

# 3. Schema-drift check ----------------------------------------------------
node scripts/check-schema-drift.js || exit 1

# 4. Gates -----------------------------------------------------------------
echo "== tsc =="; npm run typecheck || exit 1
echo "== lint =="; npm run lint || exit 1
echo "== build =="; npm run build || exit 1

echo "== ALL LOCAL GUARDRAILS PASSED =="
