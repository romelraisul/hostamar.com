# V25 AI Reel Generator — audit + merge record (2026-09-01, repo @ 2b4935f)

## Phase 0 audit (pre-change, all verified live)
- quota: 20/100 ✓ (<80, push allowed)
- /api/health 200 ✓ · vercel.json: 10 crons + /v1 rewrite + buildCommand + git main-only ✓
- next.config.js 221 lines ✓ · middleware.ts 216 lines (verifyTokenEdge + Bearer + webhook whitelist) ✓
- NotoSansBengali fonts in public/fonts ✓ · @aws-sdk/client-s3 already in package.json ✓
- **CRITICAL DISCOVERY**: `/api/video/generate` ALREADY EXISTS — a ComfyUI placeholder
  that hardcodes `http://localhost:8188` (dead in prod). The spec said "create" it.
  MERGE-SAFE DECISION: NOT overwritten. The reel feature ships under the NEW
  namespace `/api/video/reel/*` — the legacy generate/render routes (ComfyUI preview
  system used by /api/video/render + Preview records) stay untouched.

## What shipped (all NEW files + surgical merges)
NEW: lib/tts.ts (Bangla script + 4 captions) · lib/ai-video.ts (image chain
OpenAI→Replicate→deterministic SVG gradients, 1h Map cache; voiceover ElevenLabs→
browser-TTS flag; uploadToB2) · app/api/video/reel/generate (auth getAuthUser OR
x-user-id preview, never-500 chain, AgentTask ledger non-fatal, no-cache) ·
app/api/video/reel/upload-logo (2MB image/* only, sanitized name, B2 logos/{userId}) ·
app/dashboard/reel/page.tsx ("use client" player only — 9:16 360x640, 3s/slide,
progress bar, Bangla caption overlay, logo watermark, bn-BD speechSynthesis,
12s 720x1280 MediaRecorder WEBM export client-side — no ffmpeg) ·
components/reel-preview.tsx (reusable props-driven player).

MERGED (surgical, existing content intact):
- sidebar secondaryNav: +AI Reel Generator (Clapperboard, badge NEW) before My TV
- support-widget quick actions: +«Reel বানাও» → routes to /dashboard/reel
- middleware publicApiPaths: +2 reel paths ONLY (verifyTokenEdge/Bearer/webhook untouched)
- vercel.json: +/api/video/* 60s cache rule ONLY (10 crons, rewrite, buildCommand kept)
- .env.example: +ELEVENLABS_API_KEY / REPLICATE_API_TOKEN / GOOGLE_TTS_KEY (empty templates)

## Gates
tsc 0 · vitest 25/25 · build ✓ (/dashboard/reel 5.68kB, both reel routes in build
output) · prisma generate ✓ · no node:dns in client (prisma only imported in
server route with dynamic import + non-fatal catch).

## Honest limits (same class as V20's blog length)
- Without OPENAI_API_KEY/REPLICATE tokens on Vercel env, slides are deterministic
  gradient backdrops — captions/logo/voiceover still work. Chain is wired; keys
  flip it to real AI images.
- Browser TTS is the default voiceover path (bn-BD); ElevenLabs only when its key
  is set. No fake audio ever returned.
- Export is WEBM (MediaRecorder standard); Safari lacks captureStream in some
  versions — button shows the honest error message.
