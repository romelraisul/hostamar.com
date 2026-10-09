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

## Remaining-task closure (round 2, worker `cbad910e-35dc-4873-bab7-a93e89e53c61`)

Six open items from the reports, closed or stated honestly:

1. **High-cpuTime routes** — `/store` `@prisma/client/wasm` → `lib/turso-edge.ts` (one `COUNT(*)`);
   `/api/admin/status` probe timeout 8 s → 3 s + `private, max-age=60` (**not** `s-maxage`: the
   route is cookie-gated and prints DB internals, no safe public cache). Live tail, 300 s,
   125 invocations: **ok 124 / exceededCpu 1**, 0 error logs; `/store` ~1.1 s → **455 ms**.
   30/30 route sweep all 200; 150 further reps → 148 in class. Detail + the residual cold-bootstrap
   kill in `docs/1102_WORKER_LIMITS.md`.
   **Round 3 (worker `b692b295`) applied the cold-init lever** — `jsonwebtoken`/`bcryptjs` out of
   `lib/auth-utils.ts`'s module scope, now in **0/842** built route chunks. Live: 190/190 ok,
   0 exceededCpu, 0×503 / 89 client requests. **But the residual stays open**: the `>400 ms` cold
   class went 8.8% → 6.8% (z = 0.64, p = 0.52), so this is bundle-init bound, not lib bound. Evidence
   and the ranked next levers: `docs/COLD_INIT_ROUND3.md`.
2. **`hostamar-build` remote** — exists, local history pushed:
   `git ls-remote` → `df5d810b9c4d18b8d26001b77eeb0f5b1c5b4631 refs/heads/master`. Default branch is
   **`master`**; the old `origin/main` probe returned nothing because that branch never existed.
3. **Terraform gate** — judge context fixed, threshold untouched (60% rule intact). Live:
   benign r2 bucket → `no conf 0.61` → `GATE_RC=0`; vpc + `0.0.0.0/0` → `yes conf 0.786` →
   `GATE_RC=1 Prod Approval Required`. Both were 0.17–0.25 (escalate → block everything) before.
   The benign pass is thin (0.61 vs 0.60) — watch for flapping.
4. **KV catalog** — `free-model-router-hourly` enabled, last_status **ok 21:01**; remote KV read
   returns the 48-row `FREE_MODELS`; snapshots continuous 19/20/21:01, newest 48 rows.
5. **Dual-write receipts** — `jev-server.py --mirror-check` → `jsonl=124 turso=124 MATCH`; writer
   lives in `~/hostamar-build/jev-server.py`, byte-identical to the `ops/` copy, both now on the
   pushed remote.
6. **One-poller rule** — `hostamar-provisioner` container Exited (1) with `restart: "no"` and the
   rule in-file at `podman-compose.yml:61-68`; `hostamar-provisioner-native` active 7h,
   `NRestarts=0`. **Divergence:** `~/hostamar-deploy-reel/podman-compose.yml:61` still says
   `restart: unless-stopped` for the same container name — that is the VPS bundle where the
   container *is* the poller, left alone on purpose. Rule is per-host: never run both on one host.

Fleet, by source (not a single number): **5** running hostamar podman containers
(code-server, minio, openwebui, tv-rtmp, uptime) + **12** active `systemd --user` hostamar units
(camofox, camofox-tunnel, cloudflared, comfy-worker, embedding-router, interop-bridge, jev,
jev-model, litserve, next, ollama, provisioner-native); 6/6 PINs green through Cloudflare.

**Not green, for the record:** 6 fleet cron jobs have `last_status=error` on the model side —
`nvidia model deepseek-ai/deepseek-v4.1-flash is not live (probe timeout >12.0s)` / "every provider
in the fallback chain kept failing over" (atlas, bazaar, forge, vertex, scout, harbor,
fleet-heartbeat, channel). That is the nvidia-guard/failback chain, not these six items.
