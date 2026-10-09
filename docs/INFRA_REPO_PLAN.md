# Infra repo plan — where the PIN3 gate actually runs

The gate (`ops/decision-gate.sh`) had **no CI trigger**: it lived in hostamar.com, which has no
Terraform, and there was no repo containing `terraform/**`, so a `pull_request` workflow would
have been dead CI. That repo now exists.

## The repo

`https://github.com/romelraisul/hostamar-infra` (**private**) — local: `~/hostamar-infra`
commit `0e8ff7a`, branch `main`.

```
terraform/main.tf                        root: providers + module wiring
terraform/variables.tf                   region, allowed_ssh_cidrs, CF account/token
terraform/modules/vpc/{main.tf}          vpc + igw + ssh security group (allowed_ssh_cidrs)
terraform/modules/r2/{main.tf}           cloudflare_r2_bucket for artifacts
policy/terraform.rego                    OPA/conftest: deny = hard fail, warn = advisory
ops/decision-gate.sh                     the PIN3 gate (copy of hostamar.com's, --selftest PASS)
.github/workflows/terraform.yml          fmt/validate -> plan -> conftest -> infracost -> gate -> telegram -> apply
README.md                                contract + local usage + what is deliberately absent
```

`.gitignore` (`.env` ignored) was written **before** the first commit; `git ls-files` confirms
zero `.env` files in the repo. The directory already held an unrelated Postgres/Redis/Qdrant
compose stack (`docker-compose.yml`, `start.sh`, `stop.sh`, `.env.example`) — kept, and the
README says so; that `.env.example` was checked for real values before pushing (one 11-char
placeholder password, nothing else).

## Division of labour: OPA vs the gate

`conftest` fails the step on `deny`; the gate asks a human. If OPA denied everything risky, the
risky changes would die at conftest and **never reach the gate** (so never ping Telegram and
never produce a receipt). So the policy denies only objectively wrong/destructive changes
(deleting `aws_vpc`/`aws_internet_gateway`/`cloudflare_r2_bucket`, an empty `cidr_blocks`) and
warns on open ingress — which is what the gate is for.

## The gate contract (verified, offline + live)

```
ops/decision-gate.sh <tfplan.json> [pr-title]   # 0 = automated, 1 = Prod Approval Required, 2 = API unreachable
ops/decision-gate.sh --selftest                 # offline mapping checks + one live plan -> SELFTEST_PASS
```

Blocks on `choice=yes` **or** `escalate=true` (the 60% rule: an unconfident "no" is exactly what
must not be automated). Unreachable API → **exit 2, fails closed**.

Because the gate's POST *is* the audit path, the workflow does **not** need a separate
`/api/decision/receipts` step: that endpoint is cookie-gated and returns 401 from CI. Every gate
call appends to the jsonl log and mirrors a row into the `DecisionReceipt` table on Turso.

## Evidence (this machine, terraform 1.16.4)

```
terraform fmt -check -recursive     -> clean
terraform init -backend=false       -> providers installed
terraform validate                  -> Success! The configuration is valid.
terraform plan (dummy creds)        -> 5 resources: module.r2.cloudflare_r2_bucket.artifacts,
                                       vpc, igw, security group, ssh rule
gate, plan with -var allowed_ssh_cidrs=["0.0.0.0/0"]
                                    -> decision=no conf=0.229 escalate=true  rc=1
                                       "::error::Prod Approval Required" + 5-resource diff listed
gate, plan with allowed_ssh_cidrs=["203.0.113.7/32"]
                                    -> decision=no conf=0.248 escalate=true  rc=1
gate --selftest                     -> SELFTEST_PASS (rc=0), exit 2 on an unreachable API
```

Read the second line honestly: **today the gate blocks every terraform plan**, including a
correct one. `escalate = conf < 0.60` (`ops/jev-server.py:206`), and the judge scores a terraform
diff 0.17–0.25 — the same plan scored 0.63 on an earlier call, so the score drifts across the
threshold. Blocking an unconfident plan is the 60% rule doing its job (fail-closed on prod
infra), but it also means the workflow's `apply` step (gated on `rc == 0`) will not fire until a
plan is both low-risk *and* judged ≥60% confident. The `rc == 0` path is exercised only in
`--selftest`'s offline mapping today.

Two real bugs were found by running it instead of reading it: the module did not name its
provider source (`hashicorp/cloudflare` instead of `cloudflare/cloudflare` → init/validate
failed), and the Cloudflare provider rejects a short placeholder `api_token` (it reports a
*charset* error for a length problem) which silently kept the R2 bucket out of the plan.

## Still to do (deliberately absent)

* no remote state backend — plan-only CI; add an S3/R2 backend before a real `apply`
* no `terraform.yml` placeholder in hostamar.com: a workflow file with no `on:` is invalid and
  shows up as a red Actions error. The real CI is in hostamar-infra.
* repo secrets for the notify/apply steps: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
* a real apply needs real AWS + Cloudflare creds as secrets (plan runs on dummies by design)
