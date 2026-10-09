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
repo, so a `pull_request` trigger would have been dead CI. The real one now exists:
**`github.com/romelraisul/hostamar-infra`** (private, `0e8ff7a`, pushed) carries terraform
(vpc/r2), `policy/terraform.rego` (conftest), Infracost and this gate in
`.github/workflows/terraform.yml`, triggered on `pull_request` for `terraform/**`. See
`docs/INFRA_REPO_PLAN.md`.

## PIN6 receipts
`DecisionReceipt` is **populated and live**. The service writes the JSONL log (`logged`) and then
mirrors the same receipt into Turso (`turso`) — `INSERT OR IGNORE`, idempotent on `id` — and the
audit endpoint reads the **table** first, with the file as fallback:

```
POST https://hostamar.com/api/decision   -> jsonl 112 -> 113 and Turso 112 -> 113 on one call
GET  /v1/decisions/receipts              -> {"source":"turso", ...}
python3 jev-server.py --mirror-check     -> jsonl=113 turso=113 MATCH
python3 jev-server.py --selftest         -> selftest ok
```

The writer lives in the **live** service `~/hostamar-build/jev-server.py` (that is what
`hostamar-jev.service` runs), not in the `ops/` copy — which is now synced byte-identical to it.
An earlier guess at the columns (`created_at`, …) was wrong: the real table has 18 columns with
`id` (epoch ms) and `ts`; `prisma/migrations/20261009_decision_receipts_real_shape/` is the DDL.

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
fleet                                          16 hostamar services running, 0 failed
hostamar-provisioner (container)               exited, restarts frozen 10218, policy=no (by design)
hostamar-provisioner-native                    active, NRestarts=0 — the one live provisioner
/api/v1/models                                 176 rows (70 nvidia, 36 openrouter, 25 local, 23 kilo, 16 opencode, 4 hostamar)
prism-bonsai :18932                            POST /v1/chat/completions 200
disk                                           551G used / 406G avail (58%)
gpu (RTX 5060)                                 7745 MiB used of 8151, 3% util
sockets                                        59 listening
```
