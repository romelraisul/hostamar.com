# Hostamar Model Server — Deploy Runbook

## Quick Rollback (30s)

```bash
# 1. SSH to WSL via Tailscale
docker exec -it wsl-tailscale ssh -p 2222 -i /tmp/id_ed25519 \
  romel@$(docker exec wsl-tailscale tailscale ip -4)

# 2. Stop current, run previous image (replace <previous-tag> with known-good tag)
docker stop hostamar-model || true && docker rm hostamar-model || true
docker run -d --name hostamar-model --restart unless-stopped \
  -p 127.0.0.1:8000:8000 \
  ghcr.io/romelraisul/hostamar-model:<previous-tag>

# 3. Verify — fails loudly on non-OK, prints logs
curl -fsS http://localhost:8000/health || docker logs --tail 200 hostamar-model
```

## Common Fixes

| Symptom | Fix |
|---------|-----|
| `Connection refused` on SSH | Check socat: `docker exec wsl-tailscale ss -tlnp \| grep 2222`. Restart: `docker exec -d wsl-tailscale socat TCP-LISTEN:2222,bind=0.0.0.0,reuseaddr,fork TCP:host.docker.internal:22` |
| Container exits immediately | `docker logs hostamar-model --tail 30` — check for OOM or import error |
| `docker pull` fails from runner | Verify `GHCR_TOKEN` secret is still valid and has `packages:read` scope |
| Workflow times out on deploy | Build step takes ~60s (CPU PyTorch). Deploy takes ~45s. If longer, check network/Tailscale. |

## Re-deploy

```bash
gh workflow run "CI Deploy Model" --ref main -R romelraisul/hostamar.com
```
