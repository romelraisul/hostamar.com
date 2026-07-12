# Branch Protection — `main`

These are the required settings for `main`. Apply via repo **Settings → Branches →
add rule** (or `scripts/setup-branch-protection.ts` when the `gh` API is wired).
The `ai-review` workflow enforces the *checks*; this documents the *policy* the
branch rule must enforce so a green pipeline can't be bypassed with a direct push.

## Required checks (all must pass before merge)
- `guard` job from `.github/workflows/ai-review.yml`
  - Forbidden-file block (`_reset.ts`, `vcheck.sql`, `rag_check.sql`, `tsconfig.tsbuildinfo`)
  - Secret scan (no `LIVEKIT_API_SECRET`/`LIVEKIT_API_KEY` in client `*.tsx`)
  - Schema-drift check (`scripts/check-schema-drift.js`)
  - `tsc --noEmit`, `npm run lint`, `npm run build`

## Policy
1. **No direct push to `main`.** All changes via Pull Request.
2. **Require 1 approval** — a CODEOWNERS human (`@RaisulMahmudRomel`) OR a bot
   approval issued *only after* `ai-review` is green (the GoalRunner auto-merge
   path in `inngest/functions/goalTick.ts` must gate on the check, never force).
3. **Block force push** to `main`.
4. **Require conversation resolution** before merge.
5. **Dismiss stale approvals** when new commits land.

## Why
The GoalRunner/HarnessAgent can open PRs and (per the code-review spec) auto-merge
when the AI reviewer is green. That path is safe ONLY if `main` also requires a
human gate and blocks raw pushes — otherwise a confident-but-wrong AI commit lands
directly. This doc is the human half of the Writer→Reviewer→Human-gate loop.

## Enforcement status
- [x] `ai-review.yml` runs required checks on every PR
- [x] `scripts/check-schema-drift.js` blocks phantom/mis-scoped migrations
- [ ] Branch rule applied in GitHub UI (manual — done once, persists)
- [ ] `CODEOWNERS` present (see `.github/CODEOWNERS`)
