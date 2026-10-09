# AppSumo OpenGraph LTD scanner "Access blocked" — diagnosis + fix

Date: 2026-10-10. Zone: hostamar.com (Cloudflare, `2aef176c6f2000da2af593f4890ec298`).

## What was reported

AppSumo's OpenGraph scan of `https://hostamar.com/store` said:

> Access to this website is blocked. To allow our scanner through, add these IP
> ranges to your firewall: 74.220.48.0/24 and 74.220.56.0/24.

## What was actually measured

The block is **not reproducible from any vantage point** — including real
datacenter-hosted fetchers:

| Vantage point | Result |
|---|---|
| WSL (ISP IP) GET `/store` | 200, full OG tags |
| WSL as `AppSumoBot/1.0` GET/HEAD `/store`, `/`, `/pricing` | 200 |
| `AppSumoBot/1.0` over HTTP/1.1, `Accept-Encoding: identity` | 200 |
| `Accept: text/html` link-unfurler shape | 200 |
| empty UA / python-requests | 200 |
| **api.microlink.io** (datacenter OG unfurler) | success — title/description/`og:image` all parsed |
| **r.jina.ai** (datacenter fetch) | 200, page rendered |
| `/opengraph-image.png` | 200 `image/png`, cache 86400 |
| `/store?utm_source=appsumo`, `/store#x`, OPTIONS | 200 |

No `cf-mitigated`, no challenge header, no block page, no 403 anywhere.
All 13 public routes: **200, zero 503, zero 1102** (cache-busted probe).

So: the OG code is fine, the tags are live, and the edge is not refusing the
requests we can issue.

## What those IP ranges are

RDAP/ARIN: `74.220.48.0 - 74.220.63.255`, handle **RS-1125**, registrant
**Render** — not AppSumo. The scanner is a **datacenter client**, which is
exactly the traffic class Cloudflare's bot pipeline (Bot Fight Mode / managed
challenge / TLS-fingerprint heuristics) is built to challenge. That is the
residual hypothesis we cannot reproduce from our own IP: the block may be
per-request-shape (ASN reputation + TLS fingerprint), and Cloudflare does not
let a zone owner replay a challenge decision.

The "add these IP ranges to your firewall" text is AppSumo's standard blurb.

## Which instrument actually works (Cloudflare docs, verbatim)

`developers.cloudflare.com/bots/get-started/bot-fight-mode` → Limitations → Rules:

> Bot Fight Mode can still trigger if you have IP Access rules, but it **will not
> trigger if an IP Access rule matches the request first**.
> You **cannot bypass or skip Bot Fight Mode** using WAF custom rules or Page Rules.

Therefore:

- **IP Access Rule, action Allow, on the two ranges** — correct fix for BFM. ✔
- **WAF Custom Rule Skip / Security rule** — does *not* skip plain Bot Fight Mode
  (it only skips Super Bot Fight Mode, a paid-plan product). ✘

## Blocker: token scope (why this is not yet applied)

Adding an IP Access Rule needs **Zone → Firewall Services → Edit**
(and Zone → Zone Settings → Edit to read/toggle Bot Fight Mode).

The only Cloudflare token on this machine (`$CLOUDFLARE_API_TOKEN`) is
**Zone:Read**. Proven, not assumed:

| Endpoint | Result |
|---|---|
| `POST /zones/:z/firewall/access_rules/rules` (both ranges) | `10000 Authentication error` |
| `GET …/firewall/access_rules/rules` | `10000` |
| `GET /zones/:z/bot_management` | `10000` |
| `GET /zones/:z/rulesets/phases/http_request_firewall_custom/entrypoint` | `10000` |
| `GET /zones/:z/settings/browser_check` | `9109 Unauthorized` |
| `GET /zones/:z/settings/security_level` | `9109 Unauthorized` |
| `GET /zones?name=hostamar.com` | works (≈ Zone:Read) |

## Fix — two ways, both 1 minute

**A. Dashboard (no token needed)**
Cloudflare → hostamar.com → Security → WAF → Tools → **IP Access Rules** → Add:
- IP range `74.220.48.0/24`, action **Allow**, zone *hostamar.com* (repeat for `74.220.56.0/24`)

Then confirm why the scanner was blocked: **Security → Events**, filter the
Render ranges; the `Service` column names the culprit (Bot Fight Mode / Managed
Challenge / Browser Integrity Check). That is the only place the actual block
decision is visible.

**B. Give this machine a token with scope**
My Profile → API Tokens → edit existing (or create) → add
`Zone → Firewall Services → Edit` (+ `Zone → Zone Settings → Edit`) for
hostamar.com, export it, then:

```
bash /home/romel/hostamar.com/ops/appsumo-waf-allow.sh
```

The script POSTs both ranges idempotently and reads the rules back to verify
(exits non-zero unless ≥2 `74.220*` rules are present). It currently exits 1
with `10000` — that is the scope gap, not a script bug.

## Verification once applied

```
curl -s https://hostamar.com/store | grep -i "og:image"     # -> /opengraph-image.png
curl -sD - -o /dev/null -A "AppSumoBot/1.0" https://hostamar.com/store | head -1   # 200
```
Then re-run the AppSumo OpenGraph scan. If it passes with no rule added, the
original failure was transient / AppSumo-side — worth re-running *before*
touching the firewall.

## Status

- OG tags: **live**, 8 pages, `/store` 200, `og:image` 200 PNG — unchanged. ✔
- Routes: 13/13 **200**, 0×503, 0×1102 — unchanged. ✔
- IP allowlist: **not applied** — blocked on token scope (paths A/B above). ✘
- Nothing deployed, nothing changed on the Worker by this work.
