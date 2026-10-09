# Fleet verification — 2026-10-09

## PIN2-5 DB columns (Turso, the prod DB)
Prod is **sqlite/libsql on Turso**, not Postgres — the CLI cannot speak `libsql://`, so DDL went
through `turso db shell`. The brief's table names do not exist; mapped onto the real schema:

| Brief said | Real table | Columns added |
|---|---|---|
| `incoming_requests` | `HostingRequest` | `decision_queue`, `decision_confidence`, `needs_review`, `decision_judge1`, `decision_judge2`, `decision_agree`, `decision_receipt_id` |
| `terraform_prs` | `ApprovalQueue` | `decision_approval_required`, `decision_confidence`, `decision_tf_diff`, `decision_cost_delta` |
| `system_health` | `Incident` | `decision_priority`, `decision_confidence`, `decision_downtime`, `decision_reboot_history` |
| `traffic_logs` | `RateLimitEvent` | `decision_abusive`, `decision_abuse_score`, `decision_confidence` |
| (new) | `DecisionReceipt` | created (+2 indexes) |

`PRAGMA table_info` read back: 6/4/4/3 decision columns present, `DecisionReceipt` exists.
`prisma/schema.prisma` updated in the same commit (`@map` to the snake_case columns) so
`prisma generate`/future `db push` cannot silently drop them. Migration:
`prisma/migrations/20261009_decision_pins/migration.sql`.

Note: `prisma validate` fails on this repo for a **pre-existing** reason — `DATABASE_URL` is
`libsql://` and the CLI wants `file:`. `prisma generate` succeeds.

## PIN3 Terraform gate
`ops/decision-gate.sh` — POSTs the plan diff to the live Decision API; blocks (exit 1) on
`choice=yes` **or** `escalate=true` (the 60% rule — an unconfident "no" is what must not be
automated); exit 2 = API unreachable, fails closed. `--selftest` = offline mapping checks +
one live plan: `SELFTEST_PASS`.
`.github/workflows/terraform.yml` is `workflow_dispatch` only — there is no Terraform in this
repo and none anywhere under `~/`, so a `pull_request` trigger would have been dead CI. The
gate step is to be copied beside OPA + Infracost in the real infra repo.

## PIN6 receipts
`DecisionReceipt` table created but **0 rows** — live receipts still go to
`~/.local/state/hostamar/decision-receipts.jsonl` (86+ lines, appended per call). Nothing
writes the table yet; that is real remaining work, not a verified feature.

## Live checks
```
6 PINs via https://hostamar.com/api/decision   -> all 6 pass the decision contract
judges split (2nd judge) + probabilities       -> verified in the worker response
test-billing.mjs                               -> 14/14 PASS
test-store.mjs                                 -> 13/13 PASS
/dashboard/decisions                           200
/api/decision?pins=1                           200
/store /pricing /payment /api/health           200
/bangla-llm                                    200  (first probe returned 503 — transient cold start; 3/3 retries 200)
fleet                                          15 hostamar services running, 0 failed
hostamar-provisioner                           exited, restarts frozen 10218, policy=no
disk                                          550G used / 407G avail (58%)
gpu (RTX 5060)                                 7735 MiB used of 8151, 4% util
sockets                                        59 listening
```
