# Monitoring radar - catch every break point, auto-fix what is safe

One script, one pass, 7 layers, ~60s. Green means every layer that can break the
live product was actually probed on the live URL / the live box - not that a file
exists.

    /home/romel/hostamar.com/ops/monitoring/radar.sh              # plain pass
    ops/monitoring/radar.sh --fix                                 # + restart dead containers
    ops/monitoring/radar.sh --deep                                # + billing/store suites (slow)
    ops/monitoring/radar.sh --tail /home/romel/logs/tail_radar.json
    ops/monitoring/radar.sh --quiet                               # log only

exit 0 = no FAIL. WARN and SKIP never fail the run - SKIP marks a check that
*this box* cannot perform (see Limitations), it is not a pass.

Output: `/home/romel/logs/radar.log` (append) + `/home/romel/logs/radar/daily/YYYY-MM-DD.md`.

## Installed timers (systemd --user, Linger=yes so they survive reboot)

| unit | when | what |
|---|---|---|
| `radar.timer` -> `radar.service` | every 15 min (OnBootSec=3min) | `radar.sh --fix` |
| `radar-deep.timer` -> `radar-deep.service` | daily 03:30 (+-5min) | `radar.sh --deep` (billing + store suites) |
| `tail-radar.service` | always | `env -u CLOUDFLARE_API_TOKEN wrangler tail hostamar-pages --format=json >> /home/romel/logs/tail_radar.json`, 6h then reconnects, rotates at 20k lines |

Units live in the repo at `ops/monitoring/*.{service,timer}` and are **symlinked**
into `~/.config/systemd/user/` (one source of truth - edit the repo file, not the symlink):

    ln -sf /home/romel/hostamar.com/ops/monitoring/{radar.service,radar.timer,radar-deep.service,radar-deep.timer,tail-radar.service} ~/.config/systemd/user/
    systemctl --user daemon-reload && systemctl --user enable --now radar.timer radar-deep.timer tail-radar.service

## What each layer covers

| layer | check | red when |
|---|---|---|
| L1 edge | 13 routes cache-busted, `og:image` on 6 pages, `/opengraph-image.png` | any route != 200; a page loses `og:image`; image != 200 image/png ~52438 B |
| L2 app | `/api/health` status+db, `/api/v1/models` 176, `/api/v1/free-models` 48, `/api/v1/good-models`, `/api/decision?pins=1` 6/6, unauth `/api/decision` 401 | models != 176 / free != 48; pins != 6; audit route open |
| L3 db | `jev-server.py --mirror-check` | log says anything but MATCH (jsonl != turso) |
| L4 fleet | 6 podman containers up, provisioner-native active, disk, GPU, uptime-kuma :3004 | a container is down (auto-fixed once, 3/hour cap); disk >= 90% FAIL / >= 80% WARN; GPU >= 95% WARN |
| L5 infra | `ssh.socket` active + listening 2222, `systemctl --failed` 0 (system+user), `decision-gate.sh --selftest` SELFTEST_PASS, WAF | ssh.socket dead or no :2222; any failed unit; gate != SELFTEST_PASS (WARN unless `--deep`) |
| L6 business | `/pricing` JSON-LD prices 990/1900/2900, `Product` JSON-LD on `/`, `FAQPage` on `/faq`, `/sitemap.xml` | a plan price disappears from JSON-LD; Product schema gone; sitemap != 200 |
| L7 worker | `tail_radar.json`: outcome/cpuTime census | `exceededCpu` (1102) > 0.5% of events FAIL, any kill WARN, cold >400ms reported |

Auto-fix scope is deliberately one thing: **restart a known container from the
fixed list** (`hostamar-tv-rtmp hostamar-minio hostamar-code-server
hostamar-openwebui hostamar-uptime puppy-linux`). Everything else is
diagnose-and-log. Rationale: blind restarts of the provisioner/systemd/tunnel
can break the one-poller rule and the 6 PIN invariants - the radar must not
cause an outage fixing one.

## Limitations (honest)

1. **AppSumo WAF cannot be checked or applied from this box.** Both Cloudflare
   credentials here (`CLOUDFLARE_API_TOKEN` = Zone:Read, and the wrangler OAuth
   login) are refused by `/firewall/access_rules/rules` with error `10000`
   (Authentication error = no Firewall:Edit). The radar prints SKIP for that
   line. The two rules must be added by hand: Cloudflare -> hostamar.com ->
   Security -> WAF -> Tools -> IP Access Rules -> Allow `74.220.48.0/24` and
   `74.220.56.0/24` (notes: AppSumo/Render LTD scanner). It is an *IP Access
   Rule*, not a WAF Skip rule - that is the documented way through Bot Fight
   Mode. `ops/appsumo-waf-allow.sh` does the same thing via the API and needs a
   token with Zone -> Firewall Services -> Edit.
2. **The radar runs on the box**, so it cannot report "the site is down" if the
   box itself is off. Point a free external monitor (UptimeRobot / BetterStack,
   5-min) at `https://hostamar.com/api/health` -> `{"status":"healthy"}` for that
   case. Setting that up needs a signup, so it is not automated here: click-by-click
   steps, the exact monitor config, free-tier limits and the WAF 403 gotcha are in
   `ops/external-probe-setup.md`. Status: manual backlog (tracked, not forgotten).
3. `radar.sh --deep` calls the live DB and the model gateway (billing/store
   suites). Keep it to the nightly timer on a day you want the proof.
4. Cold-start percentage is a small sample (124 events, 4 over 400ms here) - read
   it as a trend, not a number. The 40.39 MB bundle mass bounds it; further cold
   work is business cost, not a bug.

## Facts this work corrected (the old notes were wrong)

* `FAQPage` JSON-LD is **not** on `/` - it ships on `/faq` (app/faq/page.tsx) and
  `/generate` (app/generate/page.tsx). `Product` JSON-LD is on `/`. Both live.
* `/api/v1/free-models` returns `{timestamp, count, models}` - the list key is
  `models`, not `data` (that one is `/api/v1/models`: `{object, data, ...}`).
* `/pricing` renders prices as `৳` + an HTML comment (React text nodes), so
  `grep ৳990` cannot match; the machine-readable truth is `"price":"990"` in the
  page JSON-LD. Grep that.
* `wrangler tail` needs `env -u CLOUDFLARE_API_TOKEN` (the env var shadows the
  OAuth login and only has Zone:Read) **and** it pretty-prints multi-line JSON -
  parse with a stream decoder, not per line.
* `set -o pipefail` + `curl ... | grep -q pattern` is a false-negative trap:
  grep exits on first match, curl dies of SIGPIPE (141), the pipeline reports
  failure although the pattern matched. The radar runs `set -u` only.
* `/api/v1/good-models` is a no-op while `UPSTASH_REDIS_*` is unset on the
  Worker (returns a `no-redis` marker). It is WARN, not FAIL: nothing calls it.

## Runbook - when a line goes red

| red line | first action |
|---|---|
| L1 a route != 200 | `curl -sS -D- https://hostamar.com<route>`; if 503/1102 -> L7; if 5xx from the Worker, use the 4-step ship (see AGENTS.md) - do not `git push` |
| L1 `og:image` missing | page-level `metadata.openGraph` dropped `images` again - keep layout's `og:image`; check the page's `openGraph` block |
| L2 models != 176 | `/api/v1/models` source + KV `HOSTAMAR_CATALOG`; hourly `free-model-router-hourly` cron |
| L2 pins != 6 | `app/api/decision` PIN set - do not "fix" by editing the gate |
| L3 not MATCH | `python3 ~/hostamar-build/jev-server.py --mirror-check`; never delete the jsonl, it is the fallback copy |
| L4 container down | `podman start <name>` (or let `--fix` do it); check `podman logs <name>` for why |
| L5 gate != SELFTEST_PASS | `bash ops/decision-gate.sh --selftest`; the gate is a quality judge - a failing plan is not a code bug |
| L5 ssh | `systemctl --user restart ssh.socket`; the 2222 override exists because Windows sshd (ID 5724) owns `:22` in mirrored mode |
| L6 price/schema gone | page edit dropped the JSON-LD; Product is in `app/page.tsx`, FAQPage in `app/faq/page.tsx` |
| L7 exceededCpu > 0.5% | bundle mass 40.39 MB (handler.mjs + @libsql/client 19MB + jsdom 14MB + @prisma/client 8.2MB). Report, do not "optimise" billing paths |

## Honest limit: the radar cannot report this box being off

Every check above runs **on this box**. If Windows restarts, WSL does not come back, or the
tunnel dies, the radar is down with the site and reports nothing — a green run here is evidence
about this machine, never proof that `hostamar.com` is up. A `radar.timer` pass that simply
*does not happen* is indistinguishable from a healthy quiet period unless something **outside**
the box is watching.

Fix: an external probe on `https://hostamar.com/api/health` (already 200, nothing to build).
Manual, free-tier signup — steps in [`ops/external-probe-setup.md`](../ops/external-probe-setup.md).
Until that exists, treat "radar green" as one-sided evidence and say so.

Companion trap, same family: `radar.service` is a oneshot, and `radar.sh` exits 1 when it *finds*
problems. Without `SuccessExitStatus=1` in the unit, a reported FAIL marks the unit failed, and
the next pass counts that in its own `L5 systemd` check — the FAIL then never clears. That was
live on 2026-10-10 05:56 (`FAIL L5 systemd | system=0 user=1 failed`, the one unit being
`radar.service` itself). Fixed in `ops/monitoring/radar.service`; exit >=2 still fails.
