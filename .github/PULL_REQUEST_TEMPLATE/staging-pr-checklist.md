# Staging PR checklist

Check all items before merging to `main`.

## General
- [ ] PR title follows `type(scope): description` format (e.g. `feat(game): add TicTacToe logic`)
- [ ] Target branch is `staging` (not `main` directly)
- [ ] CI canary workflow passes
- [ ] Staging CI migration + E2E passes
- [ ] No secrets or credentials in code or commit messages
- [ ] `git status --porcelain` is clean after rebase

## Code quality
- [ ] TypeScript compiles: `npx tsc --noEmit` (or `ignoreBuildErrors` noted)
- [ ] New files have a file header comment explaining purpose
- [ ] Error paths are handled (no uncaught promise rejections)
- [ ] Magic strings/numbers extracted to constants or config

## Database (if PR includes migration)
- [ ] Migration file is in `prisma/migrations/NNN_name/`
- [ ] Migration has both `UP` and rollback SQL (comment block)
- [ ] `npx prisma migrate deploy` passes on staging DB
- [ ] Column types and constraints are documented in the migration file
- [ ] NULL / NOT NULL decision justified in comment

## Testing
- [ ] Unit tests added for new logic (at least 2–3 per new function)
- [ ] Existing E2E still passes: `bash scripts/test-e2e-video.sh`
- [ ] Game PR: `bash scripts/test-e2e-game.sh` passes (once created)
- [ ] Dev IDE PR: sandbox smoke test passes (once created)

## Security
- [ ] Auth/ownership checks on all new endpoints
- [ ] Input validation on all user-facing parameters
- [ ] Rate limiting or resource limits considered (Dev IDE sandbox)
- [ ] No `eval()`, `exec()`, or unsafe deserialization in new code
- [ ] CORS scoped to staging/production origins, not `*`

## Monitoring
- [ ] New endpoints have health/logging at key decision points
- [ ] Error messages include enough context to debug without secrets
- [ ] Timeouts configured on external calls (WebSocket, sandbox)

## Before merge
- [ ] Branch rebased onto latest `staging`
- [ ] All checklist items checked or explicitly N/A with reason
- [ ] Reviewed by at least one other person (if team available)
