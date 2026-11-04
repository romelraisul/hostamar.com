# Hostamar.com — Git & Backup

**Last verified:** 2026-11-04 Asia/Dhaka  
**Status:** Forgejo live, GitLab mirror, GitHub suspended, Codeberg quota-blocked

## Git Remotes

| Remote | URL | Status | Notes |
|--------|-----|--------|-------|
| `forgejo` | `https://git.hostamar.com/romel/hostamar.com.git` | **LIVE** | SQLite, tunnel 5affa5bd, port 3100 |
| `gitlab` | `git@gitlab.com:romelraisul/hostamar.com.git` | Mirror | FULL verified (2a72ba512e43) |
| `github` | `git@github.com:romelraisul/hostamar.com.git` | **BLOCKED** | Suspended #4892433, reinstated Oct 30 by Noah Spencer |
| `codeberg` | `git@codeberg.org:romelraisul/hostamar.com.git` | QUOTA-BLOCKED | Delete repo via web UI first |

## Commit History

| Commit | Date | Notes |
|--------|------|-------|
| `68359b8c8da9` | 2026-11-04 | P5 f005 B2 CLOSED b2-live + 15-doc AGENTS fix + 4x200 green |
| `4a45910a` | 2026-11-03 | Guard shift #10: tv-agent stopped, .env.prod tracked, safety-review.sh |
| `371 videos` | 2026-11-02 | TV pipeline fixes, 374 videos in manifest |
| `0e6ac37b` | 2026-11-01 | P4 CLOSED: /models.json 200 v40 152 models |
| `dd8ba823` | 2026-10-31 | Infisical restore v0.167, 171 secrets imported |
| `74268f6f` | 2026-10-29 | Fleet 16 containers up, podman stack stable |

## Local State

- **Commits:** 2024 (unshallowed from shallow clone)
- **Branches:** `main` (default), feature branches merged via PR
- **Size:** `.git` ~940MB (filter-repo pending)
- **Unshallowed:** `git fetch --unshallow` completed

## Push Protocol

```bash
# Standard push (Forgejo = live)
cd /home/romel/hostamar.com
git push forgejo main

# Mirror to GitLab
git push gitlab main

# Codeberg: quota blocked — manual web UI delete needed first
# git push codeberg main

# Long pushes: chunked-push.sh + systemd-run --user (bg jobs get reaped)
# Verify: git ls-remote forgejo main
```

## Backup Strategy

| Asset | Location | Frequency |
|-------|----------|-----------|
| Git repos | Forgejo (live), GitLab (mirror) | On every push |
| B2 bucket `hostamar-prod` | `s3.us-east-005.backblazeb2.com` | Continuous (worker sync) |
| Infisical secrets | `/home/romel/automation/infisical.env` (chmod 600) | Manual export after rotation |
| Tunnel credentials | `/home/romel/.cloudflared/` | Survives `wsl --shutdown` |
| Fleet configs | `/home/romel/hostamar.com/docker/`, `.config/systemd/user/` | Git tracked |

## Recovery Commands

```bash
# Verify Forgejo tip matches local
git ls-remote forgejo main
git rev-parse HEAD

# Verify GitLab mirror
git ls-remote gitlab main

# Check commit count
git rev-list --count HEAD
# Expected: 2024+

# Check unshallowed
git cat-file -t HEAD  # Should not error
```

## Known Issues

- **GitHub suspended** — appeal #4892433 (reinstated Oct 30 4:05PM UTC by Noah Spencer, false spam flag)
- **Codeberg quota** — delete repo via web UI, then re-add
- **Vercel hostamar-build** — gated by GitHub block, CNAME removed
- **Long pushes** — `push|tail` rc=0 lies; verify `ls-remote`