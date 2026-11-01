# CHANGELOG — release log; current entry: 2026-11-01/02 MASTER CLOSE (infra recovery + P5 verification).

## 2026-11-01 / 2026-11-02 — MASTER CLOSE

**VM restart-loop fixed.** The Windows-hosted VM cycled restarts (35s–6.7min). Fixed with
the dbus-monitor logind keepalive trap (systemd unit keeps the session alive; poweroff
wrapper trap lets a stuck VM shut down cleanly for a Windows-side restart instead of
crash-looping). See INCIDENTS.md + RUNBOOK.md for the durable procedure.

**Infisical restored.** Infisical was down: the docker hostamar-postgres container had
taken host port 5432 (and an encryption-key-label mismatch — e3044 vs d66cc — proved the
wrong DB was being consulted). The first restore attempt landed on postgres-15432 (EMPTY
decoy schema); the real data volume was **postgres-infisical** (host port **15433**,
~773 tables). Final stack: redis-infisical + postgres-infisical :15433 → infisical on
hostamar-network :8089, health 200. DB had zero app rows, so the env mirror at
/home/romel/automation/infisical.env (chmod 600) WAS the SSOT: full v0.167 recovery
(signup → OTP brute from redis tokenHash → complete-account → select-organization →
import 171 secrets env=prod → re-lock allowSignUp=false, signup now 403). Key facts:
org `hostamar` = e4408ffd-c8a8-4a7e-af71-6e902d553b16, project `hostamar` =
23fc7fdf-b48e-4599-bd38-f079a698255f; ENCRYPTION_KEY/JWT_AUTH_SECRET now persisted in
the mirror so the instance can always be rebuilt.

**Phone QR gateway corrected.** URL is now the Windows LAN IP **192.168.10.70:18789**
(via Windows portproxy 0.0.0.0:18789 → 127.0.0.1:18789, relying on WSL localhostForwarding).
Mirrored networking mode was evaluated and REJECTED because it breaks docker egress.

**P5 verified.** Full probe green: **4x200** on /tv, /api/tv, /api/tv/live, /models.json;
models.json **152** models (v40); /api/tv **362**, source **b2-cache**, b2_only true.
f005 CDN Worker serving manifests from B2 with 5min edge cache.

**teldrive fixed.** Crash-loop resolved in compose: explicit container network
(teldrive-net) + DB host corrected to **teldrive-db:5432** (host.docker.internal is
unreachable from a foreign docker network). `cd ~/teldrive && docker compose up -d` now
comes up clean.

**Guard + fallback verified.** nvidia guard at 127.0.0.1:12436/v1 serving **6 models**
(z-ai/glm-5.3-flash, deepseek-v4.1-flash, minimax-m3.1-flash, step-5-preview,
nemotron-3-ultra-550b, nemotron-3.5-bolt); kilo.ai fallback pool of **384 models**
confirmed as the failover path.

## Standing status after this close

- Live: /tv (362, b2-cache), /models.json v40 (152/10/53/168), api-router with
  tunnel primary + alwaysdata fallback, Turso + 6h mirror chain, Forgejo git host.
- Still pending: bKash tokenized checkout; GitHub appeal #4892433; Cloudflare token
  regen with zone-routes scope.

## How to append

One entry per close: date header, bullets of what changed with the verified numbers,
pointer to INCIDENTS.md for anything that had a postmortem. No vanity metrics.
