#!/usr/bin/env bash
# =============================================================================
# Hostamar Enterprise SSO — VPS deploy + live verification
#
# What this does:
#   1. Applies the SAML SSO migration to the PROD Postgres (idempotent SQL).
#   2. Rebuilds + restarts the hostamar-app container on the VPS.
#   3. Runs live HTTP checks against https://hostamar.com:
#        - SP metadata XML for a tenant (valid SAML metadata)
#        - SP-initiated login redirect (302 -> IdP)
#        - Enforce-SAML: password login for an enforced domain -> 403 sso_required
#
# NOTE: A FULL IdP round-trip (browser POST of the SAML assertion) cannot be
# done with curl — it needs the IdP's browser session. Step 3 below documents
# the manual browser verification with samltest.id.
#
# Prereqs (run ON the VPS, in the repo dir, with .env.production present):
#   - docker + docker compose
#   - psql client (or use `docker compose exec postgres psql`)
#   - jq
#
# Usage:
#   scp scripts/verify-sso-vps.sh vps:/opt/hostamar/
#   ssh vps 'cd /opt/hostamar && bash verify-sso-vps.sh --tenant acme-corp --domain acme.com'
# =============================================================================
set -euo pipefail

TENANT="${2:-acme-corp}"          # org slug used for the test connection
DOMAIN="${4:-acme.com}"           # email domain to test enforcement on
APP_URL="${APP_URL:-https://hostamar.com}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.vps.yml}"

log()  { printf '\033[32m[SSO]\033[0m %s\n' "$*"; }
err()  { printf '\033[31m[FAIL]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[32m[PASS]\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1) Migration: apply SSO tables + Customer columns to prod (idempotent)
# ---------------------------------------------------------------------------
apply_migration() {
  log "Applying SSO migration to prod DB..."
  # Prefer the bundled compose's postgres service; fall back to local psql.
  if docker compose -f "$COMPOSE_FILE" ps postgres >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U hostamar -d hostamar \
      -f /dev/stdin < prisma/migrations/add_saml_sso_tenant/migration.sql && ok "migration applied (via compose postgres)"
  elif command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -f prisma/migrations/add_saml_sso_tenant/migration.sql && ok "migration applied (via psql)"
  else
    err "No psql/compose available to apply migration. Run migration.sql manually."
    return 1
  fi
}

# ---------------------------------------------------------------------------
# 2) Rebuild + restart app container
# ---------------------------------------------------------------------------
redeploy() {
  log "Rebuilding + restarting hostamar-app..."
  docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d --build hostamar
  # wait for health
  for i in $(seq 1 30); do
    if curl -fsS "$APP_URL/api/health" >/dev/null 2>&1; then ok "app healthy"; return 0; fi
    sleep 3
  done
  err "app did not become healthy in 90s"; return 1
}

# ---------------------------------------------------------------------------
# 3) Live HTTP verification
# ---------------------------------------------------------------------------
verify() {
  local rc body loc

  # 3a) SP metadata XML
  log "3a) GET /api/auth/saml/metadata?tenant=$TENANT"
  body=$(curl -fsS "$APP_URL/api/auth/saml/metadata?tenant=$TENANT" 2>/dev/null || true)
  if echo "$body" | grep -q "<md:EntityDescriptor"; then ok "valid SP metadata XML"; else err "metadata missing <md:EntityDescriptor>"; fi

  # 3b) SP-initiated login -> 302 to IdP
  log "3b) GET /api/auth/saml/login?tenant=$TENANT (expect 302 to IdP)"
  loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$APP_URL/api/auth/saml/login?tenant=$TENANT")
  if [ -n "$loc" ]; then ok "login redirects -> $loc"; else err "login did not redirect"; fi

  # 3c) Enforce: password login for enforced domain -> 403 sso_required
  log "3c) POST /api/auth/login for @$DOMAIN (expect 403 sso_required)"
  body=$(curl -s -o /tmp/sso_login.json -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"test@$DOMAIN\",\"password\":\"irrelevant\"}" \
    "$APP_URL/api/auth/login")
  if [ "$body" = "403" ] && grep -q 'sso_required' /tmp/sso_login.json; then
    ok "enforce works: 403 sso_required + $(jq -r '.ssoLoginUrl' /tmp/sso_login.json)"
  else
    err "enforce NOT triggered (http=$body)"; cat /tmp/sso_login.json
  fi
}

# ---------------------------------------------------------------------------
# Manual browser round-trip (documented; cannot be curl'd)
# ---------------------------------------------------------------------------
manual_note() {
  cat <<EOF

=============================================================================
MANUAL VERIFICATION (browser — required for full IdP round-trip)
-----------------------------------------------------------------------------
1. Create a test org + SAML connection in /admin/sso:
     - tenant slug : $TENANT
     - domain      : $DOMAIN
     - IdP metadata: paste from https://samltest.id/saml/idp  (download metadata)
     - toggle Enforce SSO = ON
2. Open a private window, go to $APP_URL/login, enter test@$DOMAIN.
   -> Must redirect to the IdP (sso_required), NOT accept the password.
3. At samltest.id, log in with the test user -> POST assertion to our ACS.
   -> Land on /dashboard with a valid auth_token (check DevTools > Application > Cookies).
4. Confirm the user was JIT-provisioned:
     psql: SELECT "email","ssoId","ssoProvider" FROM "Customer" WHERE email='test@$DOMAIN';
   -> ssoProvider = 'saml:$TENANT'
=============================================================================
EOF
}

main() {
  apply_migration
  redeploy
  verify
  manual_note
}
main "$@"
