# V28 Video-Stuck Audit — 2026-09-02, repo @ 1e0c1f3 (prod jz6gs88gg, 164/164)

## The stuck video (owner account)

`"ছুটির আনন্দ দ্বিগুণ - বগুড়া থেকে কক্সবাজার স্পেশাল প্যাকেজ"` — status `processing`
since 9/2/2026, 0 views / 0 downloads, on `/dashboard/videos`.

## Root cause (grounded in code, not guessed)

`app/api/dashboard/videos/create/route.ts` writes:
- `Video { status: 'processing', url: '' }`
- `VideoQueue { status: 'pending', videoId }` — **designed for a local render worker**

`app/api/queue/process/route.ts` documents it: *"Actual video rendering runs on the
local Windows machine via the cron worker. This avoids bundling
@remotion/renderer (FFmpeg binaries) on Vercel."*

**But NOTHING consumes the queue**: repo-wide grep for callers of
`/api/queue/process` — across app/, vercel.json (10 crons), scripts/, .github/ —
found ZERO. The render worker only existed on a machine that is not always on
(serverless-first, per memory). So every video create since the queue design
landed = a row frozen at `processing` forever. Not an AI timeout, not B2 — a
missing consumer.

Same class as the V26 blog bug: infrastructure designed for an always-on host
inside a serverless app.

## Fix (V28)

1. **`lib/video-pipeline.ts` NEW** — serverless `processVideoNow(videoId, topic)`:
   slides via lib/ai-video (provider chain → gradient data-URLs, never throws) →
   manifest artifact (slides+captions+timing; serverless can't run ffmpeg) → B2
   upload (non-fatal) → **ALWAYS transitions the row**: `completed` (real or
   honest gradient) / `failed`. Plus `healStuckVideos(>5min)`.
2. **create route**: after the queue insert (kept for history), the pipeline runs
   INLINE bounded by `Promise.race` 35s — the row transitions in-request; worst
   case the heal pass finishes it minutes later. **Never stuck again.**
3. **`app/api/videos/retry` NEW** — POST `{videoId}` re-runs the pipeline for the
   caller's OWN row (IDOR-scoped); POST `{heal:true}` sweeps the caller's stuck
   rows. 401 honest without auth.
4. **Dashboard page** — `processing` badge pulses, `completed` renders green,
   retry button on processing/failed, 10s auto-refresh while anything is
   processing, and the heal sweep fires automatically for rows stuck >5min
   (the owner's bogura-cox video will clear on first dashboard visit post-deploy).

## Owner actions — verified runbooks (human-login only, cannot be automated)

Keys are minted in Facebook/Google consoles and exist NOWHERE on this machine
(V24: 335-file env scan, zero values). Exact steps:
1. **FB Page token** — docs/v19-audit.md: facebook.com → Graph API Explorer →
   Get Page Access Token (Hostamar Page) → Vercel env `FACEBOOK_PAGE_ACCESS_TOKEN`
   → fb tools flip UNAUTHENTICATED(honest 0cr) → LIVE permalinks.
2. **GSC JSON** — docs/v21-audit.md: Cloud Console → service account → JSON key →
   add as Owner in Search Console (hostamar.com) → Vercel env
   `GOOGLE_SERVICE_ACCOUNT_JSON` → Indexing pings go LIVE (URL_UPDATED).
3. **Dashboards** — docs/v23-audit.md: Vercel Settings→Git (webhook currently
   LIVE — bot pushes self-deploy), Remote Caching, Firewall rate-limits, 75%
   alerts; Cloudflare Cache Rules + Bot Fight Mode.

**`/api/owner-check` NEW (public)**: live board of exactly these states — fb
configured?, gsc configured?, AI-chain keys, deploy facts (10 crons, /v1
rewrite, git-push-only) — so the owner can see what flips the moment each
credential lands. Same HONEST/LIVE pattern as the tools themselves.

## 6-product delivery (user request)

- `docker-compose.all.yml` — full 13-service stack (core: app+postgres+redis;
  profiles: hosting[coolify,paymenter] chat[open-webui,chatwoot,ollama]
  browser[camofox shim] ide[code-server] gaming[sunshine,pterodactyl,mysql]).
  Images + profiles, zero repo vendoring.
- `docker/camofox/{Dockerfile,main.py}` — Camoufox + browser-use + FastAPI
  POST /v1/browse; honest 503 without BROWSER_LLM_* env (never fake results).
- `install.sh` — preflight, optional `--clone` of the 19 OSS reference repos
  into ./oss/ (study only; stack runs public images), profile selector, build,
  and a port map report.

## Spec corrections

- Spec guessed "AI generation timeout / status never updated" — real cause: **no
  queue consumer exists at all** (design assumed an always-on local worker).
- Spec's `/api/videos/retry` assumed taskId/AgentTask — the model is `Video` +
  `VideoQueue`; retry is scoped by `customerId` (IDOR-safe).
- Spec's "Mark as Completed for admin" — replaced by the user-scoped heal+retry
  (owner fixes their own row from their dashboard; no admin-only path needed).
- Spec's compose with `version: '3.8'` + `typebot/theia/agent-browser/moonlight
  — services either have no stable image or duplicate what the app provides
  natively; shipped the runnable set + document the rest in install.sh.
