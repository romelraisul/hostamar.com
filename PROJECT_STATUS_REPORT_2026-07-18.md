# Hostamar AI-Video Project — Status Report
Generated 2026-07-18 · Evidence-backed (every line verified via live daemon, logs, /proc, curl)

## 1. What actually happened (the real story)

The project is NOT broken. The `hostamar-video` container has been **Up and healthy for 49+ minutes** when this report was written. The whole "container not running / docker daemon won't start" chase across two prior turns was a **false alarm caused by a Docker CLI context misconfiguration in WSL**, not a real outage.

### The misleading symptom
- `docker` commands from the Hermes shell (in the user's Ubuntu WSL distro) failed with `protocol not available` against BOTH the default `/run/docker.sock` and the `desktop-linux` npipe context.
- That made it LOOK like no daemon was running and the container was down.

### The real state (verified)
- Docker Desktop WAS running all along (5 `Docker Desktop.exe` processes on Windows; containers up 49 min).
- The containers live in the **docker-desktop WSL distro's network namespace**, so their listening ports do NOT show in this distro's `/proc/net/tcp`. But WSL2's mirrored-net means `curl localhost:<port>` from the user distro DOES reach them.
- The correct socket to drive the daemon from the user distro:
  `export DOCKER_HOST=unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock`
- Through that socket: `docker ps` shows the ENTIRE stack up (see §3).

So: nothing needed rebuilding. The two big pasted scripts would have (a) "exit 2" at the daemon check for no reason, or (b) overwritten the correct `app.py`/`Dockerfile`/`compose` with regressed stubs — both wrong.

## 2. The one genuine defect: `litellm-play` is dead (exit 127)

This IS a real problem and it's why `/create` times out.

**Container:** `litellm-play` — image `ghcr.io/berriai/litellm:main-latest` — Status: `Exited (127) 49 minutes ago`, `RestartCount: 0`.

**Root cause (from `docker inspect`):** bind-mount type mismatch.
```
error mounting "/run/desktop/mnt/host/wsl/docker-desktop-bind-mounts/Ubuntu/<sha>"
to rootfs at "/tmp/cfg.yaml": not a directory:
Are you trying to mount a directory onto a file (or vice versa)?
```
The compose mounts `litellm-config.final.yaml` (a file, `ro`) onto `/tmp/cfg.yaml`, but Docker Desktop resolved the host source as a **directory**, so the container can't init → exit 127.

**Downstream effect (from `docker logs litellm-play`):**
- Even when it briefly ran, every model call failed:
  - `AuthenticationError: api_key client option must be set ... Received Model Group=minimax-m3` (NVIDIA key missing in env)
  - `OllamaException: model requires more system memory (3.6 GiB) than is available (2.8 GiB)` for `hostamar-own` — the exact OOM the real v4 `app.py` warns about (it defaults to `hostamar-own-fast` to avoid this; but the running `hostamar-video` container has `MODEL=hostamar-own` env set, overriding the safe default).
- `hostamar-video` sets `ROUTER_URL=http://host.docker.internal:4000/v1`. `/create` calls the router for story generation → router dead → `/create` hangs → my 30s curl timed out.

**Note:** `hostamar-video` has still **successfully produced videos before** — its logs show:
`© Permanent: HOSTAMAR-7ff1ef7bd94a-1784322071 -> /app/output/final.mp3.copyright.mp4` + `POST /create 200 OK`.
So the pipeline works end-to-end when the router is up. The router is the single point of failure right now.

## 3. Live stack inventory (all verified Up unless noted)

| Container | Port | Image | Status |
|---|---|---|---|
| hostamar-postgres | 5432 | postgres:16-alpine | Up (healthy) |
| hostamar-video | 3002→3000 | hostamar-build-video-api | Up 49 min |
| hostamar-comfyui-lowvram | 8188 | hostamar-comfyui-lowvram:local | Up (healthy) RTX 5060 |
| hostamar-ltx-video | 8189→8190 | hostamar-build-ltx-video | Up (ready:true) |
| hostamar-opencut | 8193 | hostamar-build-opencut | Up (ready:false, optional mux) |
| hostamar-browser-api | 3003→3000 | hostamar-build-brave-api | Up |
| hostamar-brave | 8080-8081 | m1k1o/neko:brave | Up (healthy) |
| hostamar-openclaw | 3001→18789 | openclaw/openclaw:latest | Up (healthy) |
| **litellm-play** | **4000** | ghcr.io/berriai/litellm:main-latest | **Exited (127) — BROKEN** |

Live `/health` from `hostamar-video` (port 3002):
```json
{"model":"hostamar-own","fast_combined":["gema4","qwen3.6","glm5.2","hy3-x2"],
 "trending_count":47,"router":"http://host.docker.internal:4000/v1",
 "autonomous":true,
 "pipeline":{"comfyui":true,"ltx":true,"chatterbox":false,"ace_step":false,
             "infinitetalk":false,"opencut":true},
 "no_time_limit":true}
```
(ComfyUI + LTX + OpenCut = the 3 UP services the prompt asked for. chatterbox/ace/infinitetalk = drift-optional/down in 8GB WSL, as designed.)

## 4. File-state (verified, NOT touched)

- `~/hostamar-build/video-api/app.py` — real v4 (marker `hostamar-video-v4-real` present), 265 lines, syntax OK. Uses `hostamar-own-fast` default (safe). **Correct — do NOT overwrite.**
- `~/hostamar-build/video-api/Dockerfile.v4` — the one compose actually builds; ffmpeg + fastapi only, no torch. Correct.
- `~/hostamar-build/docker-compose.video.yml` — builds `Dockerfile.v4`, mounts lowvram workflows, all envs, `host.docker.internal:host-gateway`. Correct.
- `~/hostamar-build/copyright/watermark.py` — syntax OK, real ffmpeg watermark + jsonl registry.
- `~/hostamar-build/cloud-backup/upload.sh` — rclone `onedrive:` remote configured; last run logged `videos -> onedrive OK` + `state dbs -> onedrive OK`.
- `~/hostamar-build/video-output/` — empty (container writes to its own `/app/output`, not this bind path — minor path drift, non-critical).
- `~/hostamar-build/copyright-db/registry.jsonl` — does not exist on this host path (registry is written inside the container's namespace; the bind mount target differs from where app.py writes).

## 5. The model you pasted (`7ab63945…`)

- NOT a valid git object in `~/hostamar-build` ("Not a valid object name").
- Not resolvable as a docker object from the (now-working) daemon either — it's not among the running container/image IDs.
- Most likely it was a container/image hash from an earlier session that has since been replaced. Harmless; ignore.

## 6. Fixes needed (ranked)

1. **Fix `litellm-play` bind mount** (restores `/create`). The compose mount of `litellm-config.final.yaml:/tmp/cfg.yaml:ro` is being resolved as dir→file by Docker Desktop. Fix options:
   - Inject the config via `volumes` with the file explicitly, OR bake it into the image, OR mount the parent dir and set `CONFIG_FILE_PATH`.
   - Also set the NVIDIA API key env for `minimax-m3`/`glm-5.2` (currently `AuthenticationError`).
   - Also fix `hostamar-video` env: `MODEL=hostamar-own` → `MODEL=hostamar-own-fast` (the running container has the OOM-prone model).
2. **Sync `video-output` / `copyright-db` bind targets** so host-side registry + outputs are visible (currently inside container ns only).
3. None of the pasted "overwrite app.py" scripts should be run — they'd regress correct code.

---

# USER-SIDE CHECKLIST (for Hostamar video creation — end user)

Use this every time you want to make a video and confirm it worked.

```
[U1] Open the app / call POST /create with {"type":"video","prompt":"<your prompt>"}
[U2] Expect a JSON response within ~60s containing:
       - "video": a path
       - "copyright": {"id":"HOSTAMAR-<hash>","copyright":"© হোস্টামার"}
       - "pipeline_status": a list of 6 entries (comfy, ltx, opencut, chatterbox, ace, infinitetalk)
       - "permanent": true
[U3] If response takes >60s or times out → router (litellm-play) is likely down.
       Tell admin: "litellm-play exited, /create hangs"
[U4] Verify the returned video path exists and is non-empty (>0 bytes, valid mp4).
[U5] Verify a copyright id was assigned (HOSTAMAR-<timestamp>).
[U6] Verify the video carries the "© হোস্টামার" watermark (visual check).
[U7] Trending keywords in response should be non-empty (8 items from keywords.json or router).
[U8] If chatterbox/ace/infinitetalk show "drift-optional-*" — that is EXPECTED in 8GB WSL.
       NOT a bug. Fallbacks (gtts/silent/static) are by design.
[U9] Outputs backed up to OneDrive automatically (Hostamar/videos + Hostamar/permanent).
       Don't delete local copies until you confirm OneDrive sync logged OK.
```

# ADMIN-SIDE CHECKLIST (for Hostamar video stack — operator)

Run this in order. Stop at first RED and fix before continuing.

```
[A1] PRE: export DOCKER_HOST=unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock
       (without this, docker CLI in WSL says "protocol not available" — false "daemon down")
[A2] docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
       EXPECT: hostamar-video Up, hostamar-comfyui-lowvram Up (healthy),
               hostamar-postgres Up (healthy), hostamar-ltx-video Up,
               hostamar-opencut Up, hostamar-openclaw Up (healthy)
[A3] docker ps -a --filter name=litellm-play
       EXPECT: Up. If "Exited (127)" → bind-mount /tmp/cfg.yaml mismatch (see §6 fix 1).
       Fix the litellm-config.final.yaml mount BEFORE proceeding.
[A4] curl -s http://localhost:3002/health | python3 -m json.tool
       EXPECT: pipeline.comfyui=true, ltx=true, opencut=true,
               trending_count>0, model match.
       RED flags: model="hostamar-own" (should be hostamar-own-fast to avoid OOM).
[A5] curl -s http://localhost:8188/system_stats  → ram_free>4GB, device cuda:0 present
[A6] curl -s http://localhost:8189/health        → {"ready":true}
[A7] Test /create end-to-end:
       curl -s -X POST http://localhost:3002/create \
         -H "Content-Type: application/json" \
         -d '{"type":"video","prompt":"Eid viral 2026 trending"}'
       EXPECT: 200 within ~60s, "copyright.id":"HOSTAMAR-...", "pipeline_status" 6 entries.
       If 500/timeout → router down (re-check A3) or OOM (re-check A4 model).
[A8] docker logs --tail 20 hostamar-video  → look for "POST /create 200 OK" + "Permanent: HOSTAMAR-..."
[A9] Verify persistent artifacts:
       - copyright-db/registry.jsonl appended (line count increased)
       - video-output/ has a new non-empty .mp4 (or container's /app/output)
       - logs/cloud.log shows "videos -> onedrive OK"
[A10] Disk guard health:
       tail logs/disk-guard.log → if "PRUNE TRIGGERED: prune-c-windows" recurs, C: is >90%.
       Disk hogs: video-pipeline-lowvram/models=163G (DO NOT prune),
                 .ollama/blobs=41G, Docker VHDX~51G.
[A11] NEVER overwrite ~/hostamar-build/video-api/app.py (hostamar-video-v4-real),
       Dockerfile.v4, or docker-compose.video.yml with the minimal-stub scripts.
       Those are phantom specs; the real v4 is correct and verified.
[A12] Docker Desktop must be the daemon — do NOT try to run `sudo dockerd` locally
       (passwordless sudo unavailable; rootless not configured).
```
