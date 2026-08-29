# AI Services — Pinned Chat Operation (2026-08-30)

## Operation flow (customer view)
1. **Activate** — pick a service card on /dashboard/ai-services (~105 unique,
   deduped: 50 existing + 55 new Fiverr jobs; semantic overlap → existing card wins,
   NO duplicate cards). Click "Activate" → Material Collection Modal opens
   (NO deduction yet).
2. **Material Collection Modal** — dynamic form from `service.inputs` (required
   fields validated inline). Footer shows the credit math: cost / balance /
   after. "Continue to AI Chat →" deducts (race-safe) and creates everything.
3. **Permanent Pinned Chat** — appears instantly in the left 📌 Pinned Chats
   section (green dot = active, gray = delivered). It NEVER disappears —
   stored in DB, survives refresh, return days later, same thread.
4. **AI asks for missing materials** — first AI message lists exactly what's
   missing vs provided ("Great! You activated Logo Design. I need: Brand Name…").
   The customer answers in the same chat; the AI extracts the fields (label
   parse + model extraction).
5. **Generating → Delivered** — once all required inputs exist, the model
   chain (kilocode → CF edge → litellm home → openrouter → knowledge-base)
   generates the deliverable; video-model services attach the placeholder MP4
   (B2/GPU hook). Status badge → delivered, Download button appears.
6. **Revisions forever** — type "make it more minimal green #0E7C3A" in the
   SAME thread: -5cr revision, AI re-generates with full chat+order context.
   Thread stays pinned permanently.

## Dedup policy (the V3 critical fix)
`scripts/dedup-catalog.js` two-layer dedup:
- L1 exact normalized slug match (0 hits)
- L2 semantic overlap map — 31 Fiverr concepts covered by existing services
  (logo-design → brand-identity-starter, thumbnail-design → youtube-thumbnail-studio, …)

Result: raw 86 new → **55 unique added** → catalog **105 total unique**, not 160+.
Transparent report: `docs/product-list-deduped-120.md`.

## Backend (zero cost, survives computer off)
- `lib/pinned-chat-schema.ts` — idempotent runtime DDL (ServiceChat,
  ServiceChatMessage, ServiceOrder.missingFields/isPinned) — no prod db push.
- `lib/pinned-chat.ts` — ensureFiverrCatalog (idempotent seed of the 55),
  activateService (race-safe deduct + CreditTransaction raw audit), 
  pinnedChatMessage (material parsing → generating → delivered, -5cr revisions).
- APIs: GET /api/ai-services/catalog (merged deduped, s-maxage 300),
  POST /api/ai-services/activate (402+bKash), GET /api/ai-services/chats,
  GET+POST /api/ai-services/chat/[chatId]/messages (rate limited 30/min).
- Model in EVERY point: first message, field extraction, deliverable,
  revisions — all through callBestModel; knowledge-base fallback guarantees
  the flow never 500s even with the home computer off.

## Model mapping (per service, `model` column)
Graphics → flux-dev · Writing/Marketing/Business → llama-3-70b ·
Programming → claude-3.5 · Video ads/demos → veo-3 / sora-2 ·
Video edits → kling · Subtitles/transcription → whisper ·
Voice/TTS/audiobook → elevenlabs · Music/SFX → suno
(All execution routes through the free kilocode chain; mapping labels the
target engine for when GPU/video workers are attached.)

## Customer satisfaction targets
Activate <1s · modal <500ms · Continue <2s · pinned chat appears <1s ·
AI asks missing <2s · generating → delivered <5s · revision -5cr same thread ·
chat persists after refresh · no duplicate cards (search "logo" = 1 card).
