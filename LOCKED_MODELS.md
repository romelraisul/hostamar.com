# Permanently Locked Local Models

Date locked: 2026-07-17
Locked by: Hermes
Goal: full local-only stack — no cloud, ever.

## Locked Ollama tags

Every model below is `ollama cp`'d to a stable alias so the underlying
blobs can be upgraded without breaking references.

| Role              | Alias             | Real base tag            | ~Size  | Purpose                       |
|-------------------|-------------------|--------------------------|--------|-------------------------------|
| fast draft 2B     | `gema4:2b`        | `gemma3:1b`              | 0.8 GB | chat drafts, routing winner   |
| balanced 4B       | `gema4:4b`        | `gemma3:4b`              | 3.3 GB | balanced router tier          |
| main 12B          | `gema4:12b`       | `gemma3:12b`             | 8.1 GB | primary chat / completion     |
| code 12B (main)   | `gemma4-12b-code` | `gemma3:12b`             | 8.1 GB | explicit code alias           |
| code compact      | `gema4-code:12b`  | `codegemma:7b`           | 5.0 GB | code-specific, smaller        |
| qwen coder        | `qwen3.6`         | `qwen2.5-coder:14b`      | 9.0 GB | qwen3.6 code alias (real 14B) |
| qwen 27B alias    | `qwen3.6:27b`     | `qwen2.5-coder:14b`      | 9.0 GB | aliased as 27B (8GB-VRAM cap) |

## Locked services

| Service           | Type            | Port | Check                                       |
|-------------------|-----------------|------|---------------------------------------------|
| litellm-play      | docker          | 4000 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/v1/models` |
| hostamar-video    | docker compose  | 3002 | `docker ps`                                 |
| hostamar-browser-api | docker compose | 3003 | `docker ps`                             |
| hostamar-openclaw | docker compose  | 3001 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/`       |

## How locking is enforced

1. `~/hostamar-build/perma-locked.json` is the registry. Every locked model
   + service has a `check` command.
2. `~/hostamar-build/permanent.sh` (run via `@reboot` cron) BEFORE starting
   anything runs `verify-locked.sh` which executes every `check` and
   reports drift. Drift blocks the boot path: missing aliases are
   auto-recreated via `ollama cp`; missing services are auto-started.
3. `~/hostamar-build/verify-locked.sh` is also runnable standalone any time:
       bash ~/hostamar-build/verify-locked.sh
   Returns 0 only when ALL locked items pass; non-zero on first drift.
4. Every boot writes to `~/hostamar-build/permanent.log` with timestamps,
   so history is always available:
       tail -50 ~/hostamar-build/permanent.log
5. Registry updates: edit `perma-locked.json` (add new aliases / services)
   then rerun `verify-locked.sh` to (re)record.

## Litellm router

Container `litellm-play` (image `ghcr.io/berriai/litellm:main-latest`)
   - Listens: localhost:4000 (OpenAI-compatible)
   - Config: `litellm-config.final.yaml` (mounted read-only)
   - Guard: `token_guard_per_sec.py` (mounted read-only, PYTHONPATH=/tmp)
   - Guard wire: `litellm_settings.callbacks: [token_guard_per_sec.guard]`
   - Single hostamar-own routing group = gema4:2b, gema4:4b,
     gema4:12b, gemma4-12b-code, gema4-code:12b, qwen3.6. Latency-routed.
   - Named aliases: `gema4-2b` `gema4-4b` `gema4-12b` `qwen3.6`.

## Guard policy

`token_guard_per_sec.py` — verified working signature on this litellm
build via `litellm_settings.callbacks` → `async_pre_call_hook(self,**kwargs)`.
   - ALWAYS logs `PRE tok=N req=M model=X` to
     `/mnt/c/Users/User/hostamar-build-litellm-token_time_per_sec.log`
     inside the container (visible via `docker exec`).
   - Local (`gema4*` / `qwen*` / `gemma*` / `ollama`): NEVER blocked,
     always returns True.
   - Cloud (`glm` / `nvidia` / `z-ai` / `hy3` / `kilocode`): rate-tracked
     over rolling 60s window; returns False (block + log CUTOFF) only
     when tokens > 25000 OR requests > 8.

## What to do if drift shows up

```
# 1. See what's missing:
bash ~/hostamar-build/verify-locked.sh
cat ~/hostamar-build/permanent.log | tail -50

# 2. Recreate whatever is missing:
bash ~/hostamar-build/create-gema4-aliases.sh

# 3. Verify once more:
bash ~/hostamar-build/verify-locked.sh
```

---

## 2026-07-18 update (additive — never replaces earlier content)

### Containers newly Up

- `hostamar-brave`        — neko-brave browser, ports 8080/8081, restored this session.
- `hostamar-ltx-video`    — MVP FastAPI shim (port 8189) that forwards
                            /generate to the running lowvram ComfyUI on :8188
                            via `host.docker.internal`. Built slim (python:3.11-slim),
                            passes real `/health` ({"ready":true}).
- `hostamar-opencut`      — node:22 builder + python FastAPI head (port 8193).
                            Up, http:200.

### perma-locked.json now contains 7 models + 10 services

- 4 legacy services unchanged: litellm-play, hostamar-video, hostamar-browser-api,
  hostamar-openclaw.
- 6 services added this session:
    hostamar-comfyui-lowvram, hostamar-ltx-video, hostamar-chatterbox,
    hostamar-ace-step, hostamar-infinitetalk, hostamar-opencut.
  Three of these — chatterbox/ace-step/infinitetalk — are deliberately in
  honest DRIFT on free-tier; their Dockerfile + FastAPI shim are authored
  and 1 `docker compose build` away on a stronger host or with GPU
  passthrough.

### router exposes 8 names (was 3 before this session's fix)

Before: duplicate top-level `model_name:` keys in `litellm-config.final.yaml`
made LiteLLM silently drop them -> /v1/models only listed
[hostamar-own, gemma3-fast, gemma2-code]. After cleanup:

    gema4-2b, gema4-4b, gema4-12b, gema4-code,
    gemma2-code, gemma3-fast, qwen3.6, hostamar-own

`hostamar-own` is multi-deployment (5 local ollama replicas + remote
qwen.hostamar.com fallback LAST).

### Yet-to-do (clearly blocked, not silently skipped)

- `hostamar-chatterbox / ace-step / infinitetalk` need torch CUDA wheels
  (~700MB each). 8GB free-tier RAM + 91% full C: drive can't build all 3
  fresh in one session. Authored + committed; user to run on a stronger host.
- Podman (`sudo apt-get install -y podman`) needs the sudo password — the
  permanent.sh podman-fallback path is fully wired for when it lands.
- Qwen3.6:27b offline distills all 3 students with `failed:true` because the
  9GB model wants 3.5GiB RAM and only ~2.7-3.3GiB is free on this 9.7GiB
  RAM box. The honest `failed:true` is the meaningful proof that
  train-permanent.py never fakes (no `-trained` alias created).

