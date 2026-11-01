# OPERATIONS — daily ops loop: shift health checks, QUILL reports, fleet heartbeat, VM stability trap, phone QR gateway.

## Shift health checks (run every session start)

1. **Endpoints (4x200):** `/tv`, `/api/tv`, `/api/tv/live`, `/models.json` all HTTP 200.
   `/api/tv` must read count 362, source `b2-cache`, `b2_only true`; `/models.json` must
   read version 40 / total 152. FAIL → TESTING.md → RUNBOOK.md.
2. **Channel health:** TV channel `hls_http` returns 200 (HLS manifest reachable).
3. **Edge cache:** `edge_cache` state is HIT (f005 worker Cache API, 5min TTL). A MISS
   storm means the edge cache was purged or the worker is failing over.
4. **Container fleet:** podman containers (infisical, postgres-15432, redis-infisical,
   forgejo, hostamar-tv-rtmp, openwebui, code-server, uptime, minio, puppy-linux) and
   docker containers (11: teldrive, teldrive-db, litellm-play, freellmapi, host-hls2,
   cloudflare-tunnel, redis-foundation, medusa-wsl, coolify-wsl, openobserve-wsl,
   hostamar-postgres) are Up. Any restart-loop → INCIDENTS.md.
5. **Unit counts:** systemd user + system units running as expected (gateway, tunnels);
   compare against the last QUILL report rather than a memorized number.

## QUILL daily reports

- The QUILL cron produces the daily ops report (fleet state, endpoint probes, incidents).
- A shift that fixes anything appends the outcome to the daily report — the report is the
  continuity record between shifts, not a chat scroll-back.

## Fleet heartbeat

- Heartbeat = periodic probe set: guard models (curl 127.0.0.1:12436/v1/models → 6
  models; on failure the kilo.ai fallback with 384 models serves), container Up states,
  tunnel connected (hostamar-primary → omni :20128), uptime container green.
- The host is NOT always-on by policy: expect offline windows; the api-router falls back
  to alwaysdata and returns 202 "PC offline, your request is queued" — that is correct
  behavior, not an incident.

## VM stability trap (dbus-monitor logind keepalive)

- The Windows-hosted VM was observed restart-looping (35s–6.7min cycles). Root cause and
  fix are in INCIDENTS.md; the durable fix is a **dbus-monitor logind keepalive trap**:
  a systemd unit runs `dbus-monitor` against logind so the session never appears idle,
  with a `systemctl poweroff` wrapper trap so a stuck VM shuts down cleanly and is
  restarted from the Windows side instead of corrupting itself mid-loop.
- Verify the trap after every WSL/VM restart: unit active, dbus-monitor process alive.

## Phone QR gateway

- QR gateway URL: `http://192.168.10.70:18789` — the Windows LAN IP, NOT localhost.
- Delivered via Windows portproxy: `netsh interface portproxy add v4tov4
  listenaddress=0.0.0.0 listenport=18789 connectaddress=127.0.0.1 connectport=18789`,
  which relies on WSL `localhostForwarding` to reach the WSL-side service.
- Mirrored networking mode was REJECTED as a fix (it breaks docker egress) — see
  INCIDENTS.md. Do not "simplify" this by switching WSL networking modes.
- Shift check: from the phone/another LAN device, GET the gateway URL → 200.

## Ops rules

- Never leave a shift with a red 4x200 probe unreported.
- Fix at root cause first (INCIDENTS.md), then write the runbook entry if the fix is
  repeatable (RUNBOOK.md), then note it in the daily QUILL report.
- Free-tier discipline: don't burn Vercel deploy quota with repeated pushes — check
  `scripts/check-vercel-quota.sh` before stacked deploys.
