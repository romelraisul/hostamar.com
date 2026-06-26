#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Entrypoint for hostamar/setup container
# =============================================================================

REPO_URL="${REPO_URL:-https://github.com/monjilaktn/hostamar.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/hostamar}"
COMPOSE_FILE="${DEPLOY_DIR}/deploy/docker-compose.vps.yml"
ENV_FILE="${DEPLOY_DIR}/.env.production"

info()  { echo -e "\033[0;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[0;32m[OK]\033[0m    $*"; }
warn()  { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
err()   { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; }

section() {
    echo ""
    echo -e "\033[0;36m============================================\033[0m"
    echo -e "\033[0;36m   $*\033[0m"
    echo -e "\033[0;36m============================================\033[0m"
}

# Pre-flight: Docker socket must be mounted
section "Pre-flight Checks"
if ! docker version &>/dev/null; then
    err "Docker is not available. Mount the host socket: -v /var/run/docker.sock:/var/run/docker.sock"
    exit 1
fi
ok "Docker available: $(docker version --format '{{.Server.Version}}')"

if ! docker compose version &>/dev/null; then
    err "Docker Compose (V2 plugin) is not available in this container."
    exit 1
fi
ok "Docker Compose available"

# ============================================================================
# Step 1: Clone / Update Repository
# ============================================================================
section "Cloning Repository"

mkdir -p "$(dirname "$DEPLOY_DIR")"

if [[ -d "$DEPLOY_DIR/.git" ]]; then
    info "Repository exists at ${DEPLOY_DIR}. Updating..."
    cd "$DEPLOY_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    ok "Repository updated to $(git rev-parse --short HEAD)"
else
    if [[ -d "$DEPLOY_DIR" ]] && [[ "$(ls -A "$DEPLOY_DIR")" ]]; then
        warn "Directory ${DEPLOY_DIR} exists but is not a git repo. Backing up..."
        mv "$DEPLOY_DIR" "${DEPLOY_DIR}.bak.$(date +%s)"
    fi
    info "Cloning ${REPO_URL} to ${DEPLOY_DIR}..."
    git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
    ok "Repository cloned"
fi

cd "$DEPLOY_DIR"

# ============================================================================
# Step 2: Generate .env.production from required env vars
# ============================================================================
section "Environment Configuration"

if [[ -f "$ENV_FILE" ]]; then
    ok ".env.production already exists"
else
    if [[ -f ".env.production.example" ]]; then
        cp ".env.production.example" "$ENV_FILE"
        info "Created ${ENV_FILE} from template"
    else
        err "No .env.production.example found in repo"
        exit 1
    fi
fi

# Override required fields from environment variables if provided
REQUIRED_VARS=(
    DATABASE_URL
    NEXTAUTH_SECRET
    NEXTAUTH_URL
    REDIS_URL
    R2_ENDPOINT
    R2_ACCESS_KEY
    R2_SECRET_KEY
    R2_BUCKET
    R2_PUBLIC_URL
    REPLICATE_API_KEY
    OPENAI_API_KEY
    FALLBACK_API_URL
    FALLBACK_API_KEY
    FALLBACK_MODEL
)

for var in "${REQUIRED_VARS[@]}"; do
    val="${!var:-}"
    if [[ -n "$val" ]]; then
        # Escape special chars for sed replacement
        escaped=$(printf '%s\n' "$val" | sed 's/[&/\]/\\&/g')
        if grep -qE "^${var}=" "$ENV_FILE"; then
            sed -i "s|^${var}=.*|${var}=${escaped}|" "$ENV_FILE"
            info "Set ${var} from environment"
        else
            echo "${var}=${val}" >> "$ENV_FILE"
            info "Appended ${var} from environment"
        fi
    else
        warn "${var} not provided in environment — using value from template"
    fi
done

ok "Environment configured"

# ============================================================================
# Step 3: Validate required env vars
# ============================================================================
section "Validating Environment"

MISSING=()
for var in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL; do
    val=$(grep -E "^${var}=" "$ENV_FILE" | cut -d= -f2- | tr -d '\"' | tr -d "'")
    if [[ -z "${val:-}" ]] || [[ "$val" =~ ^\<|^your-|^r8_ ]]; then
        MISSING+=("$var")
    fi
done

if [[ "${#MISSING[@]}" -gt 0 ]]; then
    err "Missing or placeholder values for: ${MISSING[*]}"
    err "Edit ${ENV_FILE} or pass as environment variables"
    exit 1
fi
ok "Required environment variables present"

# ============================================================================
# Step 4: Build Docker Images
# ============================================================================
section "Building Docker Images"

docker compose \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    build \
    --pull \
    --no-cache-filter deps \
    hostamar

ok "Docker build complete"

# ============================================================================
# Step 5: Run Database Migrations
# ============================================================================
section "Running Migrations"

DB_URL=$(grep -E "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '\"' | tr -d "'")
if [[ -n "$DB_URL" ]]; then
    docker compose \
        -f "$COMPOSE_FILE" \
        --env-file "$ENV_FILE" \
        run --rm \
        -e DATABASE_URL="$DB_URL" \
        hostamar \
        npx prisma migrate deploy --schema=./prisma/schema.prisma \
    && ok "Migrations applied" \
    || warn "Migration step skipped or failed — will run on app startup"
else
    warn "DATABASE_URL not set — skipping migrations"
fi

# ============================================================================
# Step 6: Deploy Services
# ============================================================================
section "Starting Services"

docker compose \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    up -d \
    --remove-orphans

ok "Services started"

# ============================================================================
# Step 7: Verify Deployment
# ============================================================================
section "Verification"

sleep 5

CONTAINERS=("hostamar-app" "hostamar-nginx")
for container in "${CONTAINERS[@]}"; do
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "N/A")
    if [[ "$status" == "running" ]]; then
        ok "Container ${container}: ${status} (health: ${health})"
    else
        warn "Container ${container}: ${status}"
    fi
done

echo ""
info "Local HTTP test (may take a moment)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost/healthz 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^2|^3 ]]; then
    ok "HTTP ${HTTP_CODE} from http://localhost/healthz"
else
    warn "HTTP ${HTTP_CODE} from http://localhost/healthz (check nginx config / DNS)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "\033[0;32m============================================\033[0m"
echo -e "\033[0;32m   Deploy Complete!\033[0m"
echo -e "\033[0;32m============================================\033[0m"
echo ""
echo "  Running containers:"
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "  Logs:"
echo "    docker compose -f ${COMPOSE_FILE} logs -f hostamar"
echo "    docker compose -f ${COMPOSE_FILE} logs -f nginx"
echo ""
echo "  Restart:   docker compose -f ${COMPOSE_FILE} restart"
echo "  Stop:      docker compose -f ${COMPOSE_FILE} down"
echo "  Rebuild:   docker compose -f ${COMPOSE_FILE} build --no-cache hostamar"
echo ""
