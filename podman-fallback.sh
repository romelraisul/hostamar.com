#!/usr/bin/env bash
# podman-fallback.sh (v2) — bus-Docker-crash safety net for Hostamar.
#
# TRIES podman FIRST, falls back to Windows docker.exe.
# When invoked, checks if current runtime is alive. If primary dies:
#   1. Starts the 3 critical containers (postgres, hostamar-app, nginx)
#   2. Tries docker.exe as secondary fallback
#   3. In worst case, runs static maintenance nginx on :8081
#   4. Notifies via supervisor log
#
# Does NOT need to run on a timer — supervisor calls it when runtime probe fails.
set -uo pipefail

LOG=/home/romel/hostamar-build/logs/podman-fallback.log
mkdir -p "$(dirname "$LOG")"
log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" >>"$LOG"; }

log "=== podman-fallback v2 invoked ==="

WIN_DOCKER='/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe'
PG_PASSWORD="${PG_PASSWORD:-hostamar}"
PG_DATA=/home/romel/hostamar-build/podman-pgdata
mkdir -p "$PG_DATA"

# Determine PRIMARY runtime
RUNTIME="podman"
podman info >/dev/null 2>&1 || {
  RUNTIME="docker"
  "$WIN_DOCKER" info >/dev/null 2>&1 || {
    log "BOTH podman and docker DOWN — emergency maintenance mode"
    RUNTIME="maint"
  }
}
log "primary runtime=$RUNTIME"

# Helper
_run() {
  case "$RUNTIME" in
    podman) podman run -d --replace "$@" ;;
    docker) "$WIN_DOCKER" run -d "$@" ;;
  esac
}
_ps()    { podman ps "$@" 2>/dev/null || "$WIN_DOCKER" ps "$@" 2>/dev/null; }
_exists() { 
  local name="$1"
  _ps --format '{{.Names}}' 2>/dev/null | grep -q "^${name}$"
}

# 1. Postgres — critical, try both runtimes if needed
if ! _exists hostamar-pg-fallback; then
  log "starting hostamar-pg-fallback ($RUNTIME)"
  _run --name hostamar-pg-fallback \
    -e POSTGRES_USER=hostamar -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB=hostamar \
    -v "$PG_DATA:/var/lib/postgresql/data:Z" \
    -p 5432:5432 \
    docker.io/library/postgres:16-alpine >>"$LOG" 2>&1 || {
    # If primary runtime failed, try the other one
    log "primary runtime failed for postgres — trying secondary"
    if [ "$RUNTIME" = "podman" ]; then
      "$WIN_DOCKER" run -d --name hostamar-pg-fallback \
        -e POSTGRES_USER=hostamar -e POSTGRES_PASSWORD="$PG_PASSWORD" \
        -e POSTGRES_DB=hostamar \
        -p 5432:5432 \
        postgres:16-alpine >>"$LOG" 2>&1 || log "BOTH failed for postgres"
    else
      podman run -d --name hostamar-pg-fallback --replace \
        -e POSTGRES_USER=hostamar -e POSTGRES_PASSWORD="$PG_PASSWORD" \
        -e POSTGRES_DB=hostamar \
        -v "$PG_DATA:/var/lib/postgresql/data:Z" \
        -p 5432:5432 \
        docker.io/library/postgres:16-alpine >>"$LOG" 2>&1 || log "BOTH failed for postgres"
    fi
  }
fi

# 2. hostamar-app (pre-loaded image from docker-export, now in podman store)
# Tag: hostamar-app:latest in podman, same in Docker
if ! _exists hostamar-app; then
  log "starting hostamar-app ($RUNTIME)"
  _run --name hostamar-app \
    -e DATABASE_URL="postgresql://hostamar:***@localhost:5432/hostamar" \
    -e NODE_ENV=production \
    -e NEXTAUTH_URL=https://hostamar.com \
    -e NEXT_PUBLIC_APP_URL=https://hostamar.com \
    -e NEXT_PUBLIC_SITE_URL=https://hostamar.com \
    -p 3000:3000 \
    hostamar-app:latest >>"$LOG" 2>&1 || log "hostamar-app start FAILED"
fi

# 3. nginx — same image as docker (hostamar-nginx:local)
if ! _exists hostamar-nginx; then
  log "starting hostamar-nginx ($RUNTIME)"
  _run --name hostamar-nginx \
    hostamar-nginx:local >>"$LOG" 2>&1 || {
    # fallback: use docker nginx or pull official
    _run --name hostamar-nginx \
      docker.io/library/nginx:alpine >>"$LOG" 2>&1 || log "nginx FAILED"
  }
fi

# 4. Maintenance nginx on :8081 as absolute last-resort (always runs)
if ! _exists hostamar-maint-nginx; then
  log "starting maintenance nginx on :8081"
  MAINT_DIR=/home/romel/hostamar-build/podman-maint
  mkdir -p "$MAINT_DIR"
  cat > "$MAINT_DIR/index.html" <<'HTML'
<!DOCTYPE html><html><body>
<h1>Hostamar — Maintenance Window</h1>
<p>Our local servers are restarting. Cloud backup is engaging. Back in ~120 seconds.</p>
<p>Contact: ceo@hostamar.com</p>
</body></html>
HTML
  cat > "$MAINT_DIR/default.conf" <<'NGINX'
server { listen 80 default_server; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }
NGINX
  # Use whatever runtime works for nginx:alpine (small image, both have it or pull)
  podman run -d --name hostamar-maint-nginx --replace \
    -v "$MAINT_DIR/index.html:/usr/share/nginx/html/index.html:Z" \
    -v "$MAINT_DIR/default.conf:/etc/nginx/conf.d/default.conf:Z" \
    -p 8081:80 \
    docker.io/library/nginx:alpine >>"$LOG" 2>&1 || {
    "$WIN_DOCKER" run -d --name hostamar-maint-nginx \
      -v "$MAINT_DIR/index.html:/usr/share/nginx/html/index.html" \
      -v "$MAINT_DIR/default.conf:/etc/nginx/conf.d/default.conf" \
      -p 8081:80 \
      nginx:alpine >>"$LOG" 2>&1 || log "BOTH runtimes failed for maint-nginx"
  }
fi

log "podman-fallback v2 done"
exit 0
