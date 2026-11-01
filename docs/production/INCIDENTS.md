# INCIDENTS — postmortems: VM restart loop, Infisical outage, teldrive crash loop, Win→WSL TCP block.

## 1. VM restart loop (35s–6.7min cycles)

- **Symptom:** the Windows-hosted VM restarted every 35 seconds to 6.7 minutes.
- **Root cause:** the VM/session was being torn down as idle/unhealthy — logind saw no
  activity and the VM self-recycled; a crash mid-cycle corrupted the boot path so it
  looped instead of staying up.
- **Fix:** dbus-monitor logind keepalive trap — a systemd unit runs `dbus-monitor`
  against logind so the session never reads idle, plus a `systemctl poweroff` wrapper
  trap: if the VM wedges, it powers off cleanly and is restarted from the Windows side
  rather than crash-looping.
- **Prevention:** verify the trap unit after every VM/WSL restart (unit active,
  dbus-monitor alive). Full recovery procedure: RUNBOOK.md.

## 2. Infisical down (secret store outage)

- **Symptom:** Infisical on :8089 unreachable; secret reads failing across the fleet.
- **Root cause (two stacked failures):** (a) the docker **hostamar-postgres** container
  had **stolen host port 5432**, so Infisical's DB connection landed on the wrong
  instance; (b) an **encryption-key-label mismatch (e3044 vs d66cc)** proved the wrong
  database was being consulted — the service was looking at a DB that didn't hold its
  keys rather than the podman postgres-15432 instance.
- **Fix:** restored Infisical on the podman stack — start **redis-infisical**, then
  **postgres-15432** (host port 15432), then **infisical**; health confirmed on
  127.0.0.1:8089.
- **Prevention:** docker hostamar-postgres owns 5432; podman postgres-15432 owns 15432.
  They are different instances with different payloads — never "unify" them by pointing
  Infisical at 5432.

## 3. teldrive crash loop

- **Symptom:** teldrive container crash-looping on start.
- **Root cause:** compose wired the DB host as `host.docker.internal`, which is
  **unreachable from a foreign docker network** — the container couldn't resolve/reach
  its DB, so it exited and restarted forever.
- **Fix:** compose networks corrected (dedicated **teldrive-net**) and DB host changed to
  the compose service name **teldrive-db:5432**. `cd ~/teldrive && docker compose up -d`
  now starts clean.
- **Prevention:** inside a compose project, always address services by service name on
  the compose network; host.docker.internal is only valid with `extra_hosts:
  host-gateway` on the default bridge — don't assume it in foreign networks.

## 4. Windows→WSL TCP blocked under NAT

- **Symptom:** services on WSL (e.g. the phone QR gateway on :18789) were not reachable
  from Windows/LAN despite listening locally.
- **Root cause:** WSL2 NAT isolates the WSL network; LAN clients (and the phone) can't
  reach WSL-bound ports directly.
- **Options evaluated:** WSL **mirrored networking mode was REJECTED** — it breaks docker
  egress on this host. Chosen fix: **Windows portproxy** `netsh interface portproxy add
  v4tov4 listenaddress=0.0.0.0 listenport=18789 connectaddress=127.0.0.1
  connectport=18789`, forwarding to WSL via localhostForwarding; gateway URL is the
  Windows LAN IP **http://192.168.10.70:18789** (not localhost, not a WSL IP).
- **Prevention:** for any new WSL service that LAN devices need, add a portproxy rule +
  document the Windows LAN IP; never flip networking modes to "fix" reachability.

## Cross-incident rules

- Root cause before symptom-patching; each fix above changed the mechanism, not just the
  error message.
- After any infra fix: re-run the full probe set (TESTING.md) and append the outcome to
  the QUILL daily report + CHANGELOG.md.
