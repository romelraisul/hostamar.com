# 3 honest gaps — fixed and verified — 2026-10-09

All three were real. None was fixed by prose. Every claim below has the command output that
produced it.

## Gap 1 — DecisionReceipt table empty (0 rows) → 113 rows, live dual-write

**Where it actually needed fixing:** the live decision service is
`/home/romel/hostamar-build/jev-server.py` (`WorkingDirectory=/home/romel/hostamar-build` in
`hostamar-jev.service`) — **not** `hostamar.com/ops/jev-server.py`, which had diverged by 168
lines and still said "receipts are an append-only JSONL file, not a DB table". Grepping the
`hostamar.com` tree for the writer therefore found nothing; the writer was in the other repo.

The live service already had the mirror and it works:

```
turso_cfg()      DATABASE_URL (env, else ~/hostamar.com/.env) -> https://<host>/v2/pipeline
turso_exec()     stdlib urllib POST, libsql HTTP pipeline v2   (no new dependency)
receipt_stmt()   INSERT OR IGNORE INTO "DecisionReceipt" (18 cols), idempotent on id
log_receipt+     the JSONL stays the write-through log; the mirror is best-effort and never
mirror_receipt   fails a decision (an audit outage must not break /store)
GET /receipts    read_receipts_db() first  -> {"source":"turso"}; exception -> jsonl fallback
--backfill       mirror the whole jsonl into the table (idempotent)
--mirror-check   assert jsonl lines == Turso rows
```

**Evidence**

```
$ curl -s -X POST https://hostamar.com/api/decision -d {...}
  before: jsonl=112 db=112     after: jsonl=113 db=113        <- one live call, both +1
$ curl -s "http://127.0.0.1:8083/v1/decisions/receipts?limit=2"
  source: turso | count: 2   1791538072876 pro conf 0.585 escalate True 2026-10-09T15:27:53+0600
$ python3 jev-server.py --selftest     -> selftest ok      (rc=0)
$ python3 jev-server.py --mirror-check -> jsonl=113 turso=113 MATCH
```

So the dashboard's audit tab reads the **table** (its `/api/decision` GET proxies this endpoint),
and a Turso outage degrades to the file instead of an empty audit trail.

**Fixed here:** the live service was **uncommitted** (`M jev-server.py`) — the code that answers
every decision was not in any commit. Committed to hostamar-build as `df5d810`; the stale
`hostamar.com/ops/jev-server.py` copy was replaced with the live file (byte-identical,
`--selftest` ok) so the pushed repo carries the real service.

**Honest leftovers:** `prisma/schema.prisma` + `prisma/migrations/20261009_decision_receipts_real_shape/`
describe the real 18-column shape (the brief's `created_at`/`who_proposed`-as-they-guessed columns
do not exist — the table has `id` (epoch ms) and `ts`). `hostamar-build`'s GitHub remote
**404s** (`Repository not found`) and it is 10 commits ahead of its local `origin/main` ref — the
service's source survives only locally, plus the identical copy now in hostamar.com. Create the
remote, or accept hostamar.com as the backup.

## Gap 2 — provisioner Prisma ESM import → unit runs, 0 restarts

Root cause: with `"type":"module"`, `import { PrismaClient } from "@prisma/client"` throws
`Named export 'PrismaClient' not found` — Prisma's client is CJS, so the named ESM import is
illegal. Fixed in `apps/provisioner/worker.mjs` (the file the container also mounts):

```js
import prismaPkg from "@prisma/client"; const { PrismaClient } = prismaPkg;
import { PrismaLibSQL } from "@prisma/adapter-libsql";   // libsql:// has no native driver here
```

**Evidence** — reproduced under systemd's own `EnvironmentFile` parsing (not a hand-exported
shell), because that was the one thing that could still differ from my shell:

```
$ systemd-run --user --unit=provisioner-diag --property=EnvironmentFile=/home/romel/hostamar.com/.env \
    node diag2.mjs
  env DATABASE_URL: no surrounding quotes (systemd strips them), token_len 348
  libsql/web                -> 103 rows
  prisma+libsql hostingRequest.count() -> 0        <- the exact worker path, no error
$ systemctl --user show hostamar-provisioner-native -p NRestarts   -> 0   (51 min up)
$ journalctl --user -u hostamar-provisioner-native | grep -c 'tick error'  -> 2
  both at 14:39:45 and 14:40:55 -> 2 transient "fetch failed" in ~300 ticks (10s poll);
  each is caught, the loop continues (correct: the tick must not kill the daemon)
$ 3 live ticks -> queued=0 in 1649/328/326 ms
```

The 10218-restart crash loop is gone: the daemon is up, NRestarts=0, and the queue reads work.

**One provisioner, deliberately:** the container stays `Exited(1)` with `restart: "no"`. Two
pollers on the same queue would provision the same request twice — and the container's
`command:` installs only `@prisma/client`, so it could not run the fixed worker anyway. The
reason is now written in `podman-compose.yml` next to the flag and in `docs/DISABLED_SERVICES.md`.

## Gap 3 — gate had no infra repo → `hostamar-infra` created, pushed, gate live

`https://github.com/romelraisul/hostamar-infra` (private), `0e8ff7a`, `origin/main == HEAD`
(pushed, 0 unpushed commits). 14 tracked files; no `.env` tracked. Full detail:
`docs/INFRA_REPO_PLAN.md` in hostamar.com.

```
$ bash ops/decision-gate.sh --selftest          -> SELFTEST_PASS (rc=0)
$ # plan, allowed_ssh_cidrs=["0.0.0.0/0"]
$ bash ops/decision-gate.sh /tmp/tfplan_open.json "open SSH ingress 0.0.0.0/0"
  GATE: decision=no confidence=0.229 escalate=true
  ::error::Prod Approval Required + 5-resource diff     GATE_RC=1
$ # plan, allowed_ssh_cidrs=["203.0.113.7/32"]
  GATE: decision=no confidence=0.248 escalate=true      GATE_RC=1
```

Read that second case honestly: **today the gate blocks every terraform plan**, including a
correct one, because `escalate = conf < 0.60` (`ops/jev-server.py:206`) and the judge scores a
terraform diff ~0.17–0.25 (the same plan scored 0.63 on an earlier call — the score drifts across
the threshold). Fail-closed on prod infra is the 60% rule working, but the workflow's `apply`
step (gated on `rc == 0`) will not fire until a plan is *and*-judged ≥60% confident. The `rc == 0`
path is exercised only in `--selftest`'s offline mapping today. That is a property of the judge,
not of the gate — do not "fix" it by lowering the threshold.

## Fleet after the fixes

```
hostamar services running   16   (was 15 — the provisioner unit is up)   failed 0
test-billing 14/14 PASS     test-store 13/13 PASS
6/6 PINs through Cloudflare -> all pass the decision contract, exit 0
  ok model_tier balanced conf=0.253 escalate=true agree=false judge1_ms=597
  ok product_queue billing conf=0.925 escalate=false judge1_ms=415
  ok approval_gate yes conf=0.407 escalate=true judge1_ms=30
  ok priority medium conf=0.216 escalate=true judge1_ms=36
  ok abuse no conf=0.189 escalate=true judge1_ms=226
  ok audit_actor automated conf=0.836 escalate=false judge1_ms=48
/api/v1/models 176   (/dashboard/decisions /api/decision?pins=1 /store /pricing /api/health all 200)
prism :18932 POST 200      disk 551G used / 406G avail (58%)     GPU 7745/8151 MiB, 3%
```

## Not touched

model files (no deletion, no restructure), SSO secrets, hostamar-litserve (healthy, left
running), hostamar-vps 5-container stack, FreeLLMAPI :3002, OmniRoute :20128, backups/
stale-downloads 7.4G, the pre-existing staged OG/SEO change set in hostamar.com (left exactly
as found — it is somebody's in-flight work, not mine to commit under this message).
