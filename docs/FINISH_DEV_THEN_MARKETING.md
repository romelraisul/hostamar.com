# Finish development, then marketing - state of play (2026-10-10)

Two legs, both measured live. Nothing below is a plan; each line has a command behind it.

## Dev leg - green

`ops/monitoring/radar.sh` (one pass, 7 layers, ~60s): **FAIL=0, WARN=1, SKIP=1**.

* 13/13 customer routes 200 (cache-busted), `og:image` on 6 pages + the static card
  200 `image/png` 52,438 B
* `/api/health` healthy/connected; catalog 176 models, 48 free; 6/6 decision PINs;
  decision audit route returns 401 unauthenticated
* DecisionReceipt dual-write **jsonl 134 = turso 134 MATCH**
* fleet: 6 containers up + `hostamar-provisioner-native` active (the `Exited
  restart:no` container is the deliberate one-poller); disk 58%, GPU 46%;
  Uptime-Kuma answering on :3004
* `ssh.socket` active on 2222; `systemctl --failed` = 0 (system + user);
  `decision-gate.sh --selftest` SELFTEST_PASS
* pricing JSON-LD 4 plans (0 / 990 / 1900 / 2900); `Product` schema on `/`,
  `FAQPage` on `/faq`; sitemap 200
* Worker tail ledger: 124 events, ok 124, **exceededCpu 0**, max 729 ms, mean
  121 ms, cold >400 ms = 3% (small sample; the 40.39 MB bundle mass is the ceiling)

The two non-green lines are not failures: `good-models` is a no-op without
`UPSTASH_REDIS_*` (nothing calls it), and the AppSumo WAF line is SKIP because
**no credential on this box can edit Cloudflare firewall rules** (error `10000`) -
that one needs the dashboard (details in `docs/MONITORING_RADAR.md`).

Full inventory + per-layer evidence: `docs/FULL_CODEBASE_RADAR_AUDIT.md`.

## Monitoring leg - delivered

* `ops/monitoring/radar.sh` + `radar.{service,timer}`, `radar-deep.{service,timer}`,
  `tail-radar.service`, symlinked into `~/.config/systemd/user/` (Linger=yes, so a
  15-min pass and a nightly deep pass survive reboot)
* persistent `wrangler tail` ledger with its own unit and rotation
* auto-fix scope is one thing only - restart a container from the fixed 6-name list,
  max 3/hour. Everything else diagnoses and logs, because a blind restart of the
  provisioner or a systemd unit can break the one-poller rule or the PIN invariants.
* every layer, its threshold, its runbook and its honest limits:
  `docs/MONITORING_RADAR.md`

Not built on purpose: no new Worker routes for health/monitoring (a Worker cannot
see podman, systemd, ssh, disk or GPU - the layers that actually break - and each
ship is a 40 MB OpenNext deploy on a link that dies about half the time), and no
in-app dashboard (Uptime-Kuma :3004 already is one).

## Marketing leg - unblocked

**The asset library was priced against a plan set that no longer exists.** 55 files
advertised Starter ৳2,000 / Pro ৳3,500 / Business ৳6,000, and **zero** files carried
the live set (৳990 / ৳1,900 / ৳2,900). Posting any of it would have quoted wrong
prices against a live page that cross-checks instantly.

* `scripts/fix-marketing-pricing.py` - byte-level, currency-anchored, idempotent,
  backs up outside the repo. Applied: 55 files / 121 tokens. Verify:
  `VERIFY stale prices left: 0 file(s)`; a re-run reports `0 files would change`.
* `marketing-output/APPSUMO_LISTING.md` - the listing pack: title options (50/58
  chars), paste-ready short + long description, plan+USD table at the site's own
  peg (৳126.24), lifetime-code structure with the credit-fairness math, screenshot
  list mapped to real routes, reviewer FAQ, submission checklist.
* `marketing-output/PRICE_CORRECTION.md` - what changed, plus the five claims a
  price swap cannot fix (the dead "50% OFF beta" promo in 25 files, video-quota
  copy where the live product meters credits, the "Enterprise" name, the ৳5,000
  Bangla-LLM plan and ৳0 free tier advertised nowhere, and one "offer price" line
  now above list).

The Facebook / WhatsApp / YouTube / email assets themselves already exist (76 files
+ `FACEBOOK-LAUNCH-PACK.md`) - they were not rewritten, only realigned in price.

## Blocked on the owner (nobody else can do these)

1. Cloudflare dashboard: IP Access Rules **Allow** `74.220.48.0/24` +
   `74.220.56.0/24` (AppSumo/Render scanner). Not automatable here - both tokens
   lack Firewall:Edit.
2. AppSumo seller account + submit `https://hostamar.com/store`.
3. Screenshots from a logged-in session (dashboard, credit ledger, video render,
   bKash checkout) and the 60 s demo video.
4. The five copy decisions in `PRICE_CORRECTION.md`.
5. Optional: `/store`'s `og:title` is Bangla ("Hostamar Store - AI সার্ভিস,
   1cr=1TK"). Fine for BD, odd for a global AppSumo reviewer page - a copy decision,
   so it was left alone.

## Untouched

Deployed Worker `hostamar-pages`, SSO secrets, model weights, `docs-content`,
`backups/stale-downloads`, the one-poller provisioner, legal pages, existing SEO
schema, `NEXTAUTH_URL`, Vercel quota (0/100 used before this commit; the 1-push=1-deploy
rule was respected).
