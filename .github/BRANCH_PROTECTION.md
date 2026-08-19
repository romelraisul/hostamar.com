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

## Build gate is advisory (grounded deviation)

The `Build` step in `ai-review.yml` is **non-blocking** (`continue-on-error: true`).
Reason: `next build` is already a HARD gate in `hostamar-ci.yml` (the repo's main
CI). In `ai-review.yml` it is advisory because `main` currently has a
**pre-existing build break unrelated to any PR**: `ERR_REQUIRE_ESM` from
`@exodus/bytes` / `html-encoding-sniffer` while collecting page data for
`/api/admin/support/fix` (transitive ESM/CJS conflict in `node_modules`). Making
it hard here would block EVERY PR on an unrelated issue.

Fix the dependency conflict separately (pin/override `@exodus/bytes` or the
offending transitive dep), confirm `next build` is green on `main`, then flip
the `Build` step back to a hard gate in `ai-review.yml`.

## Secret scan exclusions (grounded)

`app/setup/` and `app/dev-tools/` are excluded from the client secret scan
because they are documentation/reference pages that list env-var NAMES by
design. Their secret VALUES are masked (`•••••••• (set via .env)`). The real
leak that prompted this (hardcoded Neon `DATABASE_URL` + `NEXTAUTH_SECRET` +
`QUEUE_SECRET` + S3 keys in `app/setup/page.tsx`) was fixed in PR #8 and the
values rotated.
