# Wazuh L7 Monitoring Scaffold (hostamar.com)

Single-node Wazuh 4.9.2 stack for hostamar.com L7 security monitoring, matching
the official `wazuh/wazuh` single-node Docker distribution pattern: one manager,
one indexer, one dashboard, custom L7 rules, and app-side telemetry shipping.

## Layout

```
infra/wazuh/
├── docker-compose.yml            # manager + indexer + dashboard (loopback-bound)
├── rules/hostamar_l7_rules.xml   # custom rules 100400-100499
├── filebeat/wazuh-logging-template.yml  # log collector template for app logs
├── agent-enrollment.sh           # per-OS enrollment reference
└── README.md
```

## Bring-up

```bash
cd infra/wazuh
cp .env.example .env   # set WAZUH_API_PASSWORD / INDEXER_PASSWORD first
docker compose up -d
```

The Next.js security digest (`/api/admin/security`, rendered at `/admin/security`)
pings the indexer :9200 and manager API :55000 and shows pipeline up/down live.
Loopback-only binding means zero exposure until you deliberately front it with a
tunnel or reverse proxy.

## L7 telemetry source

The Next.js app emits JSON log lines (`event_kind: http_request` /
`rate_limit_trip`) to `/var/log/hostamar/app-requests.log`; the Filebeat-style
collector template in `filebeat/` ships them to the manager on tcp/1514, where
`rules/hostamar_l7_rules.xml` decodes and correlates them:

| Rule | Level | Meaning |
|------|-------|---------|
| 100401 | 0 | Next.js HTTP request event (base decoder) |
| 100410 | 5 | Auth endpoint 401/403 |
| 100411 | 10 | Credential stuffing: 10+ auth failures / IP / 120s |
| 100420 | 6 | Admin surface 40x probe |
| 100421 | 12 | Admin scan burst: 20+ admin 40x / IP / 300s |
| 100430 | 4 | 4xx on commerce endpoints |
| 100440 | 6 | App rate limiter tripped |

## Credentials

All passwords are compose env with placeholder defaults — set real ones in
`.env` before first `docker compose up -d` (manager API, indexer `admin`,
dashboard `kibanaserver`). Loopback-only ports keep placeholders safe locally.
Generate certs via `wazuh-certs-tool.sh` into `etc/ssl/` before enable TLS.
