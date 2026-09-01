#!/bin/bash
# install.sh — V28 — Hostamar 6-in-1 BDIX Cloud Platform Installer
# এক লগইনে ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং
#
# What this does (and honestly does NOT do):
#   1. Checks Docker + compose plugin
#   2. Optionally clones the OSS reference repos into ./oss/ for study/customization
#      (NOT required to run — the stack uses public images, no vendoring)
#   3. Builds + starts the core stack, then any --profile group you choose
#
# Usage:
#   ./install.sh                  # core only (app + postgres + redis)
#   ./install.sh all              # every profile
#   ./install.sh hosting chat     # selected profiles

set -euo pipefail

BANNER='
  _  _  _  _  ____  _  _  _    ____  _  _  _
  \/ \/ \/ (  _ \( \/ )/ )  (  _ \( \/ )/ )
  )  )  )  ) (_) ))  (   )   ) (_) )  (   (
 (_/(_/(_/ (____/(_)\_)\_)  (____/(_)\_)\_)
 6-in-1 BDIX Cloud Platform — Video · Hosting · Chat · Browser · IDE · Gaming
'

OSS_REPOS=(
  coollabsio/coolify          # hosting PaaS (Traefik + Docker + Git + SSL)
  Paymenter/Paymenter         # hosting billing (bKash/Nagad/Rocket adaptable)
  Dokploy/dokploy             # lighter PaaS alternative
  open-webui/open-webui       # ChatGPT-style UI
  chatwoot/chatwoot          # live chat (Intercom alternative)
  baptisteArno/typebot.io     # visual flow builder
  daijro/camoufox             # anti-detect browser (C++ fingerprint spoof)
  browser-use/browser-use     # AI browser automation
  vercel-labs/agent-browser   # Playwright CLI agent
  coder/code-server           # VS Code in browser
  coder/coder                 # workspace templates
  eclipse-theia/theia         # IDE plugin system
  LizardByte/Sunshine         # GameStream host
  moonlight-stream/moonlight-qt # GameStream client
  pterodactyl/panel           # game server panel
  PranavKumar03/openmontage   # video pipeline reference (12 pipelines 52 tools)
  social-video-engine/social-video-engine # Remotion + TTS + n8n
  KennyDizi/remotion-video-generation     # Edge TTS free bn-BD
)

say(){ printf "\033[1;32m▶\033[0m %s\n" "$*"; }
die(){ printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; exit 1; }

echo "$BANNER"

# ── 1. Preflight ─────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "docker not installed — install Docker first: https://get.docker.com"
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing — install the compose plugin"
[ -f .env.local ] || say "NOTE: no .env.local yet — copy .env.example and fill values (DATABASE_URL, JWT_SECRET, B2_*, CRON_SECRET …)"

# ── 2. Optional OSS reference clones (study/customize; NOT needed to run) ────
if [ "${1:-}" = "--clone" ] || [ "${CLONE_OSS:-0}" = "1" ]; then
  mkdir -p oss
  for repo in "${OSS_REPOS[@]}"; do
    name="${repo##*/}"
    if [ -d "oss/$name" ]; then
      say "oss/$name already cloned (skip)"
    else
      say "cloning $repo (reference only — stack runs public images)"
      git clone --depth 1 "https://github.com/$repo" "oss/$name" || say "  clone failed for $repo — continuing (not required)"
    fi
  done
else
  say "skip OSS clones (pass --clone to vendor references into ./oss/ — never required)"
fi

# ── 3. Profile selection ─────────────────────────────────────────────────────
PROFILES=()
if [ "${1:-}" = "all" ]; then
  PROFILES=(--profile hosting --profile chat --profile browser --profile ide --profile gaming)
else
  for p in "${@:-}"; do
    case "$p" in
      hosting|chat|browser|ide|gaming) PROFILES+=(--profile "$p") ;;
      *) say "unknown profile '$p' — valid: hosting chat browser ide gaming (or 'all')" ;;
    esac
  done
fi

# ── 4. Build + start ─────────────────────────────────────────────────────────
say "building + starting core stack (app :3005, postgres :5432, redis :6379)"
docker compose -f docker-compose.all.yml up -d --build

if [ "${#PROFILES[@]}" -gt 0 ]; then
  say "starting profiles: $*"
  docker compose -f docker-compose.all.yml "${PROFILES[@]}" up -d
fi

# ── 5. Report ────────────────────────────────────────────────────────────────
cat <<'EOF'

✅ Hostamar stack is up:

  App (all 6 products):        http://localhost:3005
  Postgres:                    localhost:5432
  Redis:                       localhost:6379

Profiles (when enabled):
  Coolify (hosting PaaS):      http://localhost:3000
  Paymenter (billing):          http://localhost:8000
  Open WebUI (chat):           http://localhost:8080
  Ollama (local models):       http://localhost:11434
  Chatwoot (live chat):        http://localhost:3002
  Camofox browser shim:        http://localhost:3003  (POST /v1/browse)
  Code-server (IDE):           http://localhost:8443
  Pterodactyl (game panel):    http://localhost:8030
  Sunshine (GameStream):       localhost:47989 (Moonlight client connects here)

Next:
  - login at http://localhost:3005 → dashboard → all 6 products with one account
  - billing stays bKash 01822417463 via /api/payment/* (single verify path)
  - the OSS reference repos (install.sh --clone) are for study — the stack runs public images, no vendoring
EOF
