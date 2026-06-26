# PR: Consolidate cloudflared systemd units under packaging/systemd

## Summary
- Moved cloudflared systemd unit files from `ops/systemd` to `packaging/systemd`.
- Added operational runbook and docker-compose fragment for cloudflared.
- Added CI lint workflow to validate cloudflared config on PRs.

## Changes
- **Deleted**: `ops/systemd/cloudflared.service`
- **Deleted**: `ops/systemd/cloudflared-healthcheck.service`
- **Deleted**: `ops/systemd/cloudflared-healthcheck.timer`
- **Kept / added canonical units**: `packaging/systemd/cloudflared.service`, `packaging/systemd/cloudflared-healthcheck.service`, `packaging/systemd/cloudflared-healthcheck.timer`
- **Added**: `ops/cloudflared/README.ownership.md` — host-to-container UID/GID mapping guidance
- **Added**: `ops/cloudflared/docker-compose.cloudflared.yml` — compose fragment with healthcheck
- **Added**: `.github/workflows/cloudflared-lint.yml` — CI lint for config hostnames and target service

## Why
Avoid duplication and confusion about the authoritative unit file location. `packaging/systemd` is intended for deployable unit files; `ops/` holds runtime configs and runbooks.

## Test plan
- [ ] Confirm `ops/systemd/*` files are absent (already verified).
- [ ] `grep -R "ops/systemd" -n .` returns no matches across the repo.
- [ ] Install units and verify systemd accepts them:
  ```bash
  sudo cp packaging/systemd/*.service /etc/systemd/system/
  sudo cp packaging/systemd/*.timer /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now cloudflared.service
  sudo systemctl enable --now cloudflared-healthcheck.timer
  sudo systemctl status cloudflared --no-pager
  sudo systemctl status cloudflared-healthcheck.timer --no-pager
  ```
- [ ] Verify health and logs:
  ```bash
  curl -fsS https://hostamar.com/api/health | jq .
  sudo journalctl -u cloudflared -n 200 --no-pager
  ```
- [ ] Confirm docker-compose variant can start (staging or local test):
  ```bash
  docker compose -f ops/cloudflared/docker-compose.cloudflared.yml up -d
  docker inspect --format='{{json .State.Health}}' cloudflared || true
  ```

## Rollout
1. Merge PR to `main`.
2. On each host, install units from `packaging/systemd/`.
3. Pre-flight credential check:
   ```bash
   sudo chown root:cloudflared /home/romel/.cloudflared/tunnel-config/credentials.json
   sudo chmod 640 /home/romel/.cloudflared/tunnel-config/credentials.json
   ```
4. Start and enable services:
   ```bash
   sudo systemctl enable --now cloudflared.service
   sudo systemctl enable --now cloudflared-healthcheck.timer
   ```
5. Validate apex health endpoint and Cloudflare tunnel registration.

## Rollback
1. Stop services:
   ```bash
   sudo systemctl disable --now cloudflared-healthcheck.timer
   sudo systemctl disable --now cloudflared.service
   ```
2. Revert to previous units if needed from commit history.
3. Roll back DNS/CNAME in Cloudflare if tunnel hostname changed (not expected in this PR).

## Notes
- Do not commit credentials JSON to git.
- Credentials file path: `/home/romel/.cloudflared/tunnel-config/credentials.json`
