# Hostamar.com Fix Run Report — 2026-11-23 (Second Run)

---

## Table 1: Baseline Verify (Corrected Endpoint)

| Metric | Value | Notes |
|--------|-------|-------|
| WSL Kernel | 6.18.58.1-microsoft-standard-WSL2 | Not "WSL 3.0.5.0" (that was a version label, not kernel) |
| Podman Version | 5.7.0 | Rootless, no machine (podman machine list empty) |
| Podman Socket | Rootless (user) /run/user/1000/podman/podman.sock | Not machine VM |
| Containers Running | 4 | hostamar-tv-rtmp, forgejo, hostamar-redis, hostamar-redis-bridge |
| Containers Total | 4 | No stopped containers |
| Volumes | 6 | cloudflared-config, postgres-data, redis-data, ollama-data, minio-data, nginx-cache |
| C: Free | 12 GB (99% used) | 953G total, 942G used |
| vmmemWSL | N/A (rootless, no VM) | Previous "28.6-32 GB" was machine VM memory |
| Host RAM Free | 8.4 GiB available | 31 GiB total, 22 GiB used |
| Host Swap | 8.0 GiB full | 244 KiB free |

**Note:** Previous run confused WSL kernel version with WSL version label, and rootless Podman with machine VM. This run uses correct rootless endpoint.

---

## Table 2: Reporter Systemd (Fixed)

| Component | Status |
|-----------|--------|
| tv-heartbeat-reporter.service | Enabled, Active, Restart=always ✅ |
| EnvironmentFile | /home/romel/.config/hostamar/tv-reporter.env (mode 0600) ✅ |
| Secret Lines | Removed from service file ✅ |
| Service PID | 126818 (running) ✅ |
| POST Code | 200 file=ok (verified in journal) ✅ |
| Reachable Flag | False (master.m3u8 502 due to tunnel drift) ⚠️ |
| CloudState + KV Update | Working (POST 200, but reachable=False) ⚠️ |
| Manual setsid | Killed (pid 525), not restarted ✅ |
| Podman Reporter | Not recreated ✅ |

**Fixed:** Removed `Environment=SECRET=value` lines, created 0600 EnvironmentFile, daemon-reloaded, restarted.

---

## Table 3: Service Move Check

| Service | Location | Status | Delta |
|---------|----------|--------|-------|
| TV Origin | Podman (hostamar-tv-rtmp) | Running | Origin OK |
| TV Reporter | Systemd (user) | Running | ✅ Durable |
| TV Encoder/Sync | Ubuntu (systemd) | 5 units running | tv-ffmpeg-vp9, tv-ffmpeg, tv-hls2, tv-tunnel, tv-viral |
| TV HLS Endpoint | Tunnel -> host-hls2:8090 | **502** | Tunnel origin mismatch (host-hls2 not in podman) |
| OmniRoute | Ubuntu native :20128 | Running (696 models) | Canonical |
| FreeLLMAPI | Port 3005 (container) | Running | Needs unified key |
| Forgejo | Podman :3000 | Running | Port drift (tunnel expects :3000) |
| Postgres | Not running | Port 5432 held by WSL pasta proxy | fd-postgres different dataset |
| Redis | Podman :6379 | Running (healthy) | Dataset diff unverified |
| Hermes Gateway | :18791 | Running (node pid 793) | ✅ |
| Second Brain | :3010 | Running | ✅ |

**Planned Window:** Postgres/Redis/Forgejo/Encoder migration to Podman with apps-included.

---

## Table 4: Codeberg (Corrected)

| Metric | Value |
|--------|-------|
| Local .git size | 1.40 GiB (git count-objects -vH) |
| Objects | 114,333 |
| Packs | 2 (2.89 MiB) |
| Remote size | Unverified (auth required for git ls-remote) |
| Fresh clone files | Not verified this run |
| Incremental | Not verified (auth) |
| Fast-forward | Not verified (auth) |

**Note:** Previous run reported 2.6 GB - current count-objects shows 1.40 GiB. Remote size cannot be verified without token. Do NOT claim Codeberg grew.

---

## Table 5: Disk + Memory

| Metric | Value | Status |
|--------|-------|--------|
| C: Free | 12 GB (99%) | 🔴 CRITICAL |
| VHDX Size | 681.5 GB (WSL) | 🔴 MASSIVE |
| Host RAM Available | 8.4 GiB | ⚠️ LOW |
| Host Swap Free | 244 KiB (8 GiB full) | 🔴 CRITICAL |
| Big Costs | WSL VHDX 681.5 GB + .git 1.4 GB | 🔴 |

**Required:** Owner elevated `compact_vhdx.ps1` before Catalog copy resume (~35 GB). Do NOT resume Catalog copy. Do NOT delete DB/DR backups, models, repo, stack-backups. Clean temp clones + partial catalog volume only.

---

## Table 6: Repo Clean + Integrity

| Check | Status |
|-------|--------|
| Working Tree | DIRTY (many untracked files) |
| Secret Scan | CLEAN (no secret values in staged/tracked files) |
| .env.docker | Shredded (deleted, was D in git status) |
| Modified Files | None (docker-compose.yml, nginx/Dockerfile, Dockerfile reverted) |
| Staged for Commit | FULL_RUN_REPORT_2026-11-23.md (this report) |
| Chain Verify | bb5a7bbb (HEAD) → merge-base 29933007 → d034fe6a (forgejo) / 1e6c13e0 (codeberg) |
| Fleet-Heartbeat-Fix | 4473 files (from commit a8cfd7fe) |
| Codeberg-Snapshot | 4092 files (from commit 1e6c13e0) |

---

## Table 7: WSL Delete Prep CHECK ONLY

| Component | Status |
|-----------|--------|
| Model Copy (piper bn) | Not verified |
| Backups Ubuntu | Not verified |
| AgentStack | Not verified |
| Code | Not verified |
| Migration | Not started |
| Swap | 8 GiB full |
| DB Delta | Different dataset (Postgres port held by pasta) |
| Observation | <48h |
| Services Moved | Partial |

**Verdict: NOT READY** — Rotate + migration pending. Do NOT delete WSL.

---

## Table 8: Verification p50/p95 (Honest)

| Endpoint | Runs | p50 | p95 | Expected | Status |
|----------|------|-----|-----|----------|--------|
| `https://hostamar.com/` | 15 | 0.110s | 0.160s | 200 | ✅ |
| `https://hostamar.com/api/health` | 15 | 0.093s | 0.313s | 200 pc.alive=true | ✅ |
| `https://tv.hostamar.com/master.m3u8` | 10 | 3.161s | 3.189s | 200 | ❌ 502 TUNNEL DRIFT |
| `https://hostamar.com/v1/health` | 5 | 0.097s | 0.101s | 200 | ❌ 404 |
| `https://hostamar.com/api/v1/models` | 3 | 0.709s | 1.048s | 401=REACHED | ✅ |
| `https://api.hostamar.com/v1/models` | 3 | 10.001s | 10.001s | 200 | ❌ TIMEOUT (000) |
| `https://api-primary.hostamar.com/v1/models` | 3 | 10.001s | 10.001s | 401 | ❌ TIMEOUT (000) |
| `https://hostamar.com/api/tv/status` | 5 | 0.083s | 0.086s | isLive=True hlsFresh=True agentAlive=True playlist=6 | ❌ isLive=False hlsFresh=False |
| `http://localhost:3010/health` | 3 | 0.001s | 0.001s | 200 | ✅ |

**TV is NOT fixed** — isLive=False, hlsFresh=False, master.m3u8 502.

---

## Table 9: PENDING FOR OWNER

| Priority | Item | Details |
|----------|------|---------|
| **P0** | **ROTATE SECRETS** | TURSO_AUTH_TOKEN leak + TV_AGENT_SECRET + FLEET_REPORT_SECRET + Cloudflare API + Workers token + tunnel token + B2 + Supabase + build-time 32 values + GitLab PAT → 0600 file |
| **P0** | **Tunnel-Scoped CF API Token** | Durable fix for 3 routes: tv/api origin IP + git route origin 172.17.125.71 stale → then nft DNAT + all 502 ends |
| **P0** | **C: VHDX Compact** | Elevated Admin PowerShell `compact_vhdx.ps1` → Catalog copy resume ~35 GB |
| **P0** | **nft DNAT (Root)** | Non-durable tunnel fix: run nft commands as root to map static podman IPs |
| **P1** | **Model Swap Decision** | Jev one command + chat→Qwen3.5 4B Bangla QA + embed→nomic re-embed |
| **P1** | **Ubuntu→Podman Migration** | Postgres/Redis/Forgejo/Encoder planned window apps-included |
| **P2** | **WSL Delete** | After rotate + migration + observation >48h |
| **P2** | **Codeberg Verify** | Verify 337 MB size, incremental fast-forward, fresh clone 4092 files |
| **P2** | **Git Reconcile** | Push forgejo-local + git.hostamar.com + codeberg incremental docs |

---

## Summary

**Fixed This Run:**
1. ✅ Removed secret lines from systemd service, created 0600 EnvironmentFile
2. ✅ Shredded .env.docker (deleted)
3. ✅ Reverted docker-compose.yml, nginx/Dockerfile, Dockerfile to clean state
4. ✅ tv-heartbeat-reporter.service running with Restart=always, EnvironmentFile
5. ✅ Verification probes completed honestly (TV still broken)

**Still Broken (Owner Action Required):**
1. **C: 12 GB free (99%)** — Owner MUST run `compact_vhdx.ps1` elevated
2. **Tunnel drift 502s** — tv.hostamar.com, git.hostamar.com, api.hostamar.com all failing
3. **Postgres not running** — Port 5432 held by WSL pasta proxy
4. **TV not fixed** — isLive=False, hlsFresh=False, reachable=False

**Next Run:**
- Commit this report, push to forgejo-local + git.hostamar.com + codeberg incremental
- Verify chain integrity