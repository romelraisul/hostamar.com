# Branch Protection — hostamar.com

This repo enforces a **Writer → Reviewer → Human gate** via:

- `.github/workflows/ai-review.yml` — static guardrails that must pass on every
  PR to `main` (forbidden-file block, secret-in-client scan, schema-drift check,
  `tsc`/`lint`/`build` gates, tenant-isolation advisory).
- `.github/CODEOWNERS` — every path requires review from `@RaisulMahmudRomel`.

## Required branch protection rule (apply in GitHub UI)

Apply these settings to the **main** branch (Settings → Branches → Add rule,
or run `node scripts/setup-branch-protection.ts`):

- [x] Require a pull request before merging
- [x] Require approvals: **1** (or bot approval only AFTER the green check)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging — select
      **`Static Guardrails`** (the `guard` job from ai-review.yml) and the
      relevant jobs from `hostamar-ci.yml`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings
- [x] Block force pushes (uncheck "Allow force pushes")
- [x] Block deletions of the branch

The GoalRunner / autonomous auto-merge path MUST gate on the green check and
must **never** force-push to `main`.

## Deviation from the canonical skill spec (grounded)

The upstream skill's forbidden-file list includes `tsconfig.tsbuildinfo`. This
repo already has `tsconfig.tsbuildinfo` committed (legacy artifact), so blocking
it would make every PR fail its own gate. Therefore `ai-review.yml` EXCLUDES
`tsconfig.tsbuildinfo` from the forbidden list and blocks only the genuinely
destructive files:

- `_reset.ts`
- `vcheck.sql`
- `rag_check.sql`
- `scripts/_reset.ts`

Action item: before tightening, remove the committed `tsconfig.tsbuildinfo`
from the repo and add it to `.gitignore`, then it can be re-added to the
forbidden list.

## Schema-drift grounding notes

`scripts/check-schema-drift.js` is grounded to this repo's real 30-model schema.
The canonical skill assumed `GLOBAL_MODELS = ['Goal','AutonomousTask','TaskRunLog']`
— **those models do not exist here**, so `GLOBAL_MODELS` is intentionally empty.
`organizationId` already exists on `Membership`, `SamlConnection`,
`OidcConnection`, `ScimToken` (the SSO/SCIM tenant boundary). User-data models
without `organizationId` currently emit an ADVISORY (non-blocking) warning until
a deliberate isolation decision is made.
