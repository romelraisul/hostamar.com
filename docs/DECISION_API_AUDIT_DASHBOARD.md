# Decision API — Jev open-source model + the 6 PIN audit/dashboard flow

State as of **2026-10-09**. Every number below was measured on this box; nothing
here is aspirational. Companion inventory: `docs/WSL_CLEAN_INVENTORY.md`.

## 1. What went live

| piece | what | where | verified |
|---|---|---|---|
| verdict model | **Jev-Style 0.8B Decision v3** (Q4_K_M GGUF, 529,296,864 B = **0.49 GiB**, 386M params) | `/home/romel/models/jev/Jev-Style-0.8B-Decision-v3-Q4_K_M.gguf` | file present, loads in the official runtime |
| scorer | official runtime + `jev-score` probe (single forward pass + linear readout, calibrated temperature **0.88**) | `hostamar-jev-model.service` → `:8085` | `/healthz` 200 |
| decision API | typed decisions, probabilities, 60% rule, two-judge, audit receipts | `hostamar-jev.service` → `:8083` | `/health` 200, receipts file live |
| public | same API over the tunnel | **https://decisions.hostamar.com** | `/health` 200 |
| same-origin | productised route (no tunnel needed by callers) | `/api/decision` | POST = verdict (static fallback if the box is off), GET = receipts, `GET ?pins=1` = PIN catalog |
| catalog | model list row | `local/jev-decision-0.8b`, type `decision` | 24 → **25** local, 175 → **176** total |
| client | one call shape + safe fallback for all six PINs | `lib/decision-middleware.ts` | used by the route |
| check | contract test over all 6 PINs | `scripts/test-decision-api.mjs` | **all 6 pass** |

Upstream: `chaoliangUNSW/Jev-Style-0.8B-Decision-v3-GGUF` (the `typesafe-ai/jev`
line of small calibrated decision models). Latency measured: **23-51 ms warm**,
0.26-2.75 s on the first call after idle (page-cache + graph warmup) — the raw
single-judge path, two-judge PINs add the second model's own time.

Confidence is not a softmax max: `confidence = (k·p_max − 1)/(k − 1)` over the
calibrated distribution, which is why `billing 0.925` and `medium 0.216` are on
the same scale. The contract test asserts `Σp = 1 ± 0.02` and that the top
probability is the returned choice.

## 2. The six PINs, with the verdicts this box actually returns

| PIN | who asks | question | choices | live verdict | behaviour |
|---|---|---|---|---|---|
| 1 | `dashboard/topbar` | Which model tier should handle this request? | fast, balanced, pro, flux, comfyui | **balanced** 0.25 → escalate | below 0.60 → route balanced + review badge |
| 2 | `inbox/router` | Which product queue owns this request? | hostamar-core, ai-store, browser-pro, billing, abuse, other | **billing 0.925** | ≥ 0.60 → auto-tag, no human |
| 3 | `ci/terraform` | Does this change require human confirmation? | yes, no | **yes** 0.41 → escalate | 0.0.0.0/0 + module/vpc gates to a human |
| 4 | `cron/health` | What is priority level? | low, medium, high, critical | **medium** 0.22 → escalate | sorts the System Health board |
| 5 | `gateway/browser` | Is this request abusive? | yes, no | **no** 0.19 → escalate | only a ≥ 0.80 "yes" blocks (403) |
| 6 | `dashboard/audit` | Human override or automated decision? | human_override, automated | **automated 0.84** | labels every receipt |

Reproduce: `node scripts/test-decision-api.mjs` (local) or
`BASE=https://hostamar.com/api/v1 node scripts/test-decision-api.mjs` (shipped).

## 3. Rules the code enforces

- **60% rule** — `escalate = confidence < 0.60`. Escalation returns the PIN's
  safe default (`routed_to`) and flags review; it never silently guesses.
- **Two-judge (PIN2 and any `judges: 2` call)** — judge 1 is Jev, judge 2 is a
  different family entirely (`prism-bonsai` 27B, `:18932`). `agree` is true only
  when both pick the same choice → auto-tag; disagreement → Needs Review queue
  (this is the "two independent opinions" signal; PIN1's first live run returned
  `judge1 balanced / judge2 fast → agree:false`, i.e. it correctly refused to
  auto-decide).
- **Fail-safe directions** — `approval_gate` falls back to **yes** (a human),
  `priority` to **high**, `abuse` to **no**. Unreachable home box ⇒ `degraded:
  true`, HTTP 200, a valid choice. The dashboard must never break because a
  free-tier PC slept.
- **Images** — image context goes straight to the local scorer; there is no
  OpenAI-gateway hop, so the "gateway can't carry an image" failure mode does
  not exist on this path.
- **Receipts** — every call appends a row (who proposed, question, choices,
  chosen, probabilities, confidence, judge1/2, agree, human_override, judge1_ms,
  latency_ms, ts) to `~/.local/state/hostamar/decision-receipts.jsonl`;
  `GET :8083/v1/decisions/receipts` reads them back. **14 rows** live.

## 4. Four-layer flow, now decision-centric

1. **Gateway** `ai.hostamar.com:11442` (`free_model_router.py`) — PIN 1 picks the
   tier; PIN 5 screens abuse before Cloudflare.
2. **Tunnel** `hostamar-prod-new` — routes `ai/comfy/browser/hostamar.com` +
   `embeddings.hostamar.com:8081` + **`decisions.hostamar.com:8083`** (verified
   200 through the tunnel).
3. **Compute** Windows ComfyUI RTX 5060 + WSL Podman Postgres/Redis + portproxy +
   Task Scheduler — PIN 4 scores and sorts service priority; the scorer and the
   wrapper both run in WSL (VRAM cost ~0, the 0.8B runs in system RAM).
4. **Frontend / Control plane** Next.js `hostamar.com` + the GitHub PR path
   (terraform plan → OPA → Infracost → **PIN 3** → Telegram approve → runner
   apply → **PIN 6** receipts). Weakest point is still solo: every queue risk is
   now a logged decision with a confidence, which is what PIN 6 exists to expose.

## 5. Findings from wiring it (worth keeping)

- `hostamar-build/logs/` is **root-owned** → a user service cannot write there.
  Receipts moved to `~/.local/state/hostamar/decision-receipts.jsonl`.
- A 27B second judge costs **~18 s** per decision (Qwen3.8-27B on an 8 GB card).
  judge 2 is therefore `prism-bonsai` (pq2, ~5 s) with its own budget
  (`JEV_JUDGE2_TIMEOUT=25`) so a slow second opinion can never stall the API.
- Cold vs warm is real: the first call after idle is 10-100× slower. Budget for
  one warmup call, don't tune on it.
- `local/openjev-verdict-2.0` is a **different** artifact (ONNX verdict scorer,
  1.5 GiB on disk) — it stays as its own row; Jev is listed separately.
- Shipping: `ops/ship-pages.sh` — build once, retry the wrangler deploy up to 6×.
  CF API uploads from this WSL host run 0.3-0.6 MB/s and fail "fetch failed"
  after the assets land; that is the network, not the bundle.

## 6. Order of work (0 Taka)

- **Day 1 — done:** scorer + wrapper + tunnel + same-origin route + PIN 1 shadow
  verdicts + catalog row.
- **Day 3:** wire PIN 3 into `.github/workflows/terraform.yml` right after the OPA
  step (test PRs: `module/r2` → no auto-apply, `module/vpc 0.0.0.0/0` → gate).
  The decision logic and its fail-safe are proven; the workflow hook is not yet
  committed.
- **Day 7:** PIN 2 + PIN 6 in the dashboard UI. The API, the two-judge signal and
  the receipts all exist and are tested; the Next.js dashboard components this
  project references (`TopBar.tsx`, `IncomingRequestsTable.tsx`,
  `TerraformPRCard.tsx`, `SystemHealth.tsx`) **do not exist in this repo yet** —
  that UI is the remaining work, not the decision layer.

## 7. DO NOT TOUCH

SSO 19 secrets; `ai.hostamar.com` catalog; `docs-content` 2.48 MB; `lib/brain/`
(does not exist); `LIGHTNING_API_TOKEN` (gated); `hostamar-local` (5affa5bd) and
`hostamar-next` (:3011); WSL mirrored mode; FreeLLMAPI :3002 / OmniRoute :20128;
embeddings 4 models + :8081 router; the 6 broken units (litserve,
provisioner-native, provisioner, podman-restart, hyperspace) — irreversible,
not to be disabled without say-so; `backups/stale-downloads/` (7.4 G).
