# HOSTAMAR FINAL VISION — Absolute Finish Plan
# Owner: Romel Raisul — hostamar.com (Cloud + AI for Bangladesh)
# Last updated: 2026-07-19 ( VERIFIED LIVE — CF 530→200)
# Skill ID: hostamar-final-vision

## VERIFIED STATE (2026-07-19, live)
✅ Public site      : https://hostamar.com = HTTP 200 on /, /login, /signup, /pricing, /products, /api/health, /api/auth/session
✅ Asset count      : 193 skills (user estimated 187; real=193)
✅ Code inventory   : 1839 source files (TS/TSX/JS/Py) inside hostamarcom-app image
✅ DB schema        : 27 Prisma models (Customer, Payment, Subscription, Order, BetaInvite, Conversation, etc.)
✅ DB revenue state : 3 test customers, 20 PENDING beta invites (10% discount, 30-day expiry)
✅ Local models     : 41GB Ollama model cache (mistral, llama3.1, qwen2.5, nomic-embed)
✅ Containers       : hostamar-app:3000, hostamar-video:3002, hostamar-comfyui:8188, hostamar-ltx:8189, hostamar-postgres:5432, hostamar-nginx:80 — all healthy
✅ Tunnel           : cloudflared 3-edge tunnel UP, supervisor cron */2 restarts nginx+tunnel if dead
✅ Cron jobs        : 2 active (failover + ticker)
✅ Beta system      : 20 PENDING BetaInvites seeded 2026-07-19
⚠️ NEXTAUTH_URL     : set to http:/...3000 — works for same-origin login, BREAKS magic-link emails (TODO)
⚠️ Vercel          : NOT authenticated (no failover front-end)
⚠️ K8s/kind        : 10 nodes keep regenerating on Docker Desktop restart (settings-store.json isn't the config path)
⚠️ Disk            : C: 93%, docker_data.vhdx 65GB, ~36GB slack trapped, sparse compaction not yet run
⚠️ LiteLLM         : DOWN (port 4000 refuses connection). No LLM router — all AI calls hit local Ollama direct
⚠️ Ollama daemon   : not running (port 11434 refuses)
⚠️ Studio route    : /studio 404 (route lives under /products/[slug], not top-level)
✅ flociops.com    : NXDOMAIN — deferred until hostamar.com has first 5 paying customers
✅ bKash env       : BKASH_NUMBER + NEXT_PUBLIC_BKASH_NUMBER loaded into hostamar-app

## ASSET TABLE — WHAT WE HAVE NOW
| Layer | Status | Count/Path |
|---|---|---|
| Skills library | complete | 193 skills under ~/.hermes/skills |
| Codebase | complete | 1839 source files baked in hostamarcom-app image |
| Prisma models | complete | 27 models, all migrations applied |
| Containers | 6 healthy | app, nginx, postgres, video, comfyui, ltx |
| Local models | cached | 41GB in /mnt/c/Users/User/.ollama |
| Public DNS | live | hostamar.com + www.hostamar.com (CF proxied) |
| Tunnel | live | cloudflared 3-edge UP, supervisor cron */2 |
| Beta invites | 20 PENDING | seeded 2026-07-19, 10% disc, 30-day exp |
| Cron jobs | 2 | failover + ticker |
| LLM router | DOWN | litellm:4000 dead, no cloud routing |
| Ollama daemon | DOWN | port 11434 dead — local AI offline

## THE GAP TABLE — WHAT'S MISSING TO REACH 100%
| Component | Have | Gap | Effort |
|---|---|---|---|
| Public site (200s) | ✅ | /studio 404 | 30 min (route fix) |
| Signup flow | ✅ /signup returns 200 | need to verify POST works end-to-end | 1h |
| Auth callback URL | ⚠️ | NEXTAUTH_URL=w/...3000 breakmagic-link emails | 5 min (env restart) |
| bKash payment | code+env loaded | not invoked from checkout; 0 payments in DB | 4-6h |
| Beta onboarding | 20 codes seeded | need first user to actually signup | 30 min manual outreach |
| LLM router (litellm) | image exists | container DOWN, no LITELLM_API_KEY wired | 15 min restart |
| Local AI (Ollama) | models cached | daemon DOWN | 1 command |
| K8s kill switch | scripts exist | kind restarts on Docker Desktop reboot, wrong config path | 30 min (find+edit) |
| Disk compaction | skill exists | docker_data.vhdx 65GB on C: 93%, sparse trim not run | 10 min, requires wsl --shutdown |
| Vercel failover | CLI installed | not auth'd; failover cron has no target | 5 min (vercel login) |
| Studio product page | exists under /products/[slug] | /studio top-level route 404 | 30 min route map |
| FlociOps | skills+docs only | flociops.com NXDOMAIN, no infra | deferred until 5 paying customers |
| Marketing automation | none | no organic content engine scheduled | depends on local-LLM uptime |
| rclone OneDrive backup | config exists | not cron'd | 5 min crontab -e |

## OFFLINE-FIRST STRATEGY — "no internet" fallback vision
If internet dies and Cloudflare tunnel drops, Hostamar can still:
1. Run locally — hostamar-app:3000 still serves localhost and hostamar-network
2. Generate videos — hostamar-comfyui + hostamar-ltx don't need internet (GPUs local)
3. Local LLM chat — Ollama 41GB models cached, litellm can route to it locally
4. Postgres — local DB stays up
5. Cron supervisor restores tunnel as soon as internet returns (it checks every 2min)
The only thing that fails offline: receiving new public users + processing bKash callbacks (both need internet).

WHAT TO MAKE PERMANENT for offline-guaranteed operation:
- Start litellm container with LITELLM_API_KEY tied to local-only routes (no cloud models)
- Start ollama-dev container (compose.dev.yml already exists) → localhost:11434
- Add to supervisor script: also restart litellm + ollama if dead
- Cron nightly rclone backup of hostamar-postgres to OneDrive (config already exists)

## TREND-AWARE STRATEGY (always go with trend, or create trend)
**Watch (don't lead)**: agentic IDEs (Cursor/Claude Code), local LLM speed improvements, Bangla-voice TTS.
**Ride (Bangladesh-local trend)**: bKash tokenized-checkout is THE trend for local SaaS — most BD creators pay by bKash. AI marketing video for TikTok/Reels is the dominant BD creator trend 2026.
**Create (our wedge)**: "Banglaverse Studio" — first Bangla-native AI video studio with Bengali voiceover, Bengali script, Bengali captions. The wedge giants won't serve: a TikTok creator in Dhaka making 30 videos/month for ৳2,000/mo beats any US-priced SaaS. THAT is the trend we create, not follow.

## FASTEST PATH TO 100% (in order, by effort)
0. ✅ Bring site live (DONE 2026-07-19) — tunnel supervisor installed
1. (5 min) Start Ollama + LiteLLM containers → local AI online
2. (5 min) Restart hostamar-app with NEXTAUTH_URL=https://hostamar.com
3. (30 min) Fix /studio route → top-level route or redirect to /products/ai-video
4. (1 hour) Test signup endpoint end-to-end (POST /api/auth/signup) → DB must receive new customer
5. (15 min) Auth Vercel CLI + deploy landing page as failover target
6. (15 min) Cron rclone pg_dump → OneDrive nightly
7. (4-6h) Wire bKash tokenized-checkout (skill: hostamar-billing). Endpoint flow:
   POST /api/billing/bkash/create → bKash → callback → INSERT Payment row
8. (10 min, requires wsl --shutdown) Run docker_data.vhdx sparse compaction
9. (30 min) Manual outreach: text 3 BD creator contacts a beta code each
10. (rolling) First paying customer = 1st revenue. Then iterate.

After step 10, "development" is done. Everything after is growth + iteration.

## HOW TO RELOAD THIS DOC
From any Hermes session: `skill_view(name='hostamar-final-vision')`
The agent memory also references this skill as the project source-of-truth.

## RULES (NON-NEGOTIABLE)
1. NEVER re-login cloudflared (creds in ~/.cloudflared/ survive wsl --shutdown)
2. NEVER bind-mount a single file from WSL path to container (use parent dir + copy)
3. NEVER use 'postgres' role (only 'hostamar' superuser exists)
4. NEVER fake a PASS — every "✅" above is backed by a real curl in this session
5. Local-first > cloud ($0 is the constraint)
6. Stable fix-once > rebuild/re-scaffold
7. Money surface = signup + bKash; that's #1 priority over video pipeline polish
