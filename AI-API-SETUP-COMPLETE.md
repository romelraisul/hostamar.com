# AI API Setup Guide — Hostamar

This guide covers setting up the AI APIs required for Hostamar's **AI-powered video generation** and **voice synthesis** features.

---

## Table of Contents

1. [OpenAI / GitHub Models Setup](#1-openai--github-models-setup)
2. [ElevenLabs API Setup](#2-elevenlabs-api-setup)
3. [Environment Variables (.env)](#3-environment-variables-env)
4. [How APIs Are Used in the Codebase](#4-how-apis-are-used-in-the-codebase)
5. [Known Mismatch: GITHUB_TOKEN vs OPENAI_API_KEY](#5-known-mismatch-github_token-vs-openai_api_key)
6. [Testing Your Setup](#6-testing-your-setup)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. OpenAI / GitHub Models Setup

### Option A: GitHub Models (Azure — currently used by the code)

The video generator currently connects to GitHub Models (hosted on Azure) instead of OpenAI directly. This is the **default** path in the code.

**Steps:**

1. **Sign in to GitHub** at https://github.com
2. **Generate a GitHub personal access token:**
   - Go to https://github.com/settings/tokens
   - Click **"Generate new token (classic)"**
   - Give it a name like `Hostamar-AI`
   - Scope: at minimum `repo` (for GitHub Models access) or generate a fine-grained token with access to Models
   - Copy the token — it starts with `ghp_` or `github_pat_`
3. **Set the token in .env:**
   ```
   GITHUB_TOKEN=ghp_your_github_token_here
   ```
4. **GitHub Models endpoint** is already configured in the code:
   ```
   baseURL: 'https://models.inference.ai.azure.com'
   ```
   No additional configuration needed.

### Option B: Direct OpenAI API (alternative)

If you prefer to use OpenAI directly instead of GitHub Models:

1. **Sign up / log in** at https://platform.openai.com
2. **Set up billing:**
   - Go to https://platform.openai.com/account/billing
   - Add a payment method (credit card)
   - **Set usage limits** at https://platform.openai.com/account/limits
     - Set a **soft limit** (you'll get an email when reached)
     - Set a **hard limit** (API calls are blocked when reached)
     - Recommended: start with a $10–$20 monthly limit
3. **Create an API key:**
   - Go to https://platform.openai.com/api-keys
   - Click **"Create new secret key"**
   - Give it a name (e.g., `hostamar-video-gen`)
   - Copy the key — it starts with `sk-...`
   - **Store it securely** — you won't be able to see it again
4. **Choose a model:**
   - **GPT-4o** — fastest, most capable, best for production. Used by the current code (`gpt-4o-mini` variant)
   - **GPT-4** — high quality but slower and more expensive
   - **GPT-3.5 Turbo** — cheapest, fastest, but lower quality for complex scripts

   > **Recommendation:** Use `gpt-4o-mini`. It's the best balance of speed, quality, and cost for video script generation.

---

## 2. ElevenLabs API Setup

ElevenLabs provides **text-to-speech (TTS)** for generating voice-overs in videos.

### Steps

1. **Create an account** at https://elevenlabs.io
   - Free tier: ~10,000 characters/month
   - Paid plans: start at $5/month for more characters
2. **Get your API key:**
   - Log in to https://elevenlabs.io
   - Click your profile picture → **"Profile"** → **"API Keys"**
   - Click **"Create"** (or copy the default key)
   - The key is a string like: `sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Set the key in .env:**
   ```
   ELEVENLABS_API_KEY=sk_your_elevenlabs_key_here
   ```

### Available Voices

ElevenLabs offers many voices. For Bengali (Bangla) content, here are recommended options:

| Voice Name | Best For | Language Support |
|-----------|----------|-----------------|
| **Bella** | General-purpose, clear | Multi-lingual v2 |
| **Rachel** | Warm, engaging narration | English + multi |
| **Domi** | Energetic, youthful | English + multi |
| **Elli** | Soft, educational | English + multi |
| **Adam** | Professional male voice | English + multi |
| **Antoni** | Deep, authoritative | English + multi |

For Bengali TTS specifically, the model `eleven_multilingual_v2` is currently configured in the code (line 124 of `lib/video-generator.ts`). You may need to experiment with voices for best Bengali pronunciation.

### ElevenLabs Models

- **eleven_multilingual_v2** — best for non-English languages including Bengali (currently configured)
- **eleven_turbo_v2** — faster, lower latency (English-focused)
- **eleven_monolingual_v1** — English only

---

## 3. Environment Variables (.env)

### OpenAI / GitHub Models

If using **GitHub Models** (current code default):
```env
# ===== AI — GITHUB MODELS (Video Script Generation) =====
# Used by lib/video-generator.ts — connects to GitHub Models (Azure endpoint)
# Generate at: https://github.com/settings/tokens
# Scope: at minimum 'repo' for Models access
GITHUB_TOKEN=ghp_your_github_token_here
```

If using **Direct OpenAI API** (alternative):
```env
# ===== AI — OPENAI (Video Script Generation) =====
# Sign up at: https://platform.openai.com
# Create API key at: https://platform.openai.com/api-keys
# Recommended model: gpt-4o-mini (set in lib/video-generator.ts line 76)
# Usage: billing → set hard limit at https://platform.openai.com/account/limits
OPENAI_API_KEY=sk-your-openai-key-here
```

### ElevenLabs

```env
# ===== ELEVENLABS (Voice — Text-to-Speech) =====
# Create account at: https://elevenlabs.io
# Get API key at: https://elevenlabs.io → Profile → API Keys
# Model used: eleven_multilingual_v2 (supports Bengali / Bangla)
# Voice used: Bella (set in lib/video-generator.ts line 122)
ELEVENLABS_API_KEY=sk_your_elevenlabs_key_here
```

### Current .env Section (as found)

The existing `.env` at `/mnt/c/Users/romel/hostamar-local/.env` has these lines:

```
# ===== ELEVENLABS (Voice) =====
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY

# ===== OPENAI (Video Generation AI) =====
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY
```

> **⚠️ IMPORTANT:** The code in `lib/video-generator.ts` uses `process.env.GITHUB_TOKEN`, NOT `process.env.OPENAI_API_KEY`. See Section 5 below.

---

## 4. How APIs Are Used in the Codebase

### File Map

| File | API Used | Purpose |
|------|---------|---------|
| `lib/video-generator.ts` | OpenAI SDK (via `GITHUB_TOKEN`) | Generate video scripts & suggest topics |
| `lib/video-generator.ts` | ElevenLabs (`ELEVENLABS_API_KEY`) | Generate voice-over audio for videos |
| `scripts/generate-videos.js` | OpenAI (`OPENAI_API_KEY`) & ElevenLabs | CLI batch video generation |
| `app/generate/page.tsx` | None directly (frontend UI) | User interface for video generation |
| `app/api/ai/videos/generate/route.ts` | None directly (creates DB record) | API endpoint that triggers video creation |
| `app/ai-chat/page.tsx` | None directly (static UI) | AI chat interface (lists models) |

### Detailed Usage

#### OpenAI — Video Script Generation (`lib/video-generator.ts`)

- **Function:** `generateVideoScript()` — takes business name, industry, topic → returns structured JSON script with title, hook, main content, and call-to-action in Bengali
- **Function:** `suggestVideoTopics()` — takes business name + industry → returns 10 video topic ideas
- **Model used:** `gpt-4o-mini` (line 76 & 269)
- **API key source:** `process.env.GITHUB_TOKEN` (see mismatch below)
- **Response format:** JSON (enforced via `response_format: { type: 'json_object' }`)

#### ElevenLabs — Voice-Over Generation (`lib/video-generator.ts`)

- **Function:** `generateVoiceOver()` — takes text + output path → produces MP3 audio
- **Model used:** `eleven_multilingual_v2` (supports Bengali)
- **Voice used:** `Bella`
- **Fallback chain:**
  1. Google TTS if `USE_GOOGLE_TTS=true`
  2. ElevenLabs if `ELEVENLABS_API_KEY` is set
  3. Silent audio (mock) if neither configured

#### Scripts

- `scripts/generate-videos.js` — standalone CLI script that reads `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` directly from env (not affected by the mismatch). Currently uses placeholder/TODO for actual API calls.

---

## 5. Known Mismatch: GITHUB_TOKEN vs OPENAI_API_KEY

### The Problem

In `lib/video-generator.ts` (the main production file), the OpenAI client is initialized as:

```typescript
const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: 'https://models.inference.ai.azure.com',
});
```

This means the code reads from **`process.env.GITHUB_TOKEN`**, NOT `process.env.OPENAI_API_KEY`.

However, the `.env` file contains `OPENAI_API_KEY=sk-YOUR_OPENAI_KEY` and does **not** contain `GITHUB_TOKEN`.

### Impact

- If you set `OPENAI_API_KEY` but not `GITHUB_TOKEN`, the video generator will fail to connect (API key will be undefined/empty).
- The `scripts/generate-videos.js` file correctly reads `OPENAI_API_KEY`, so there's a split between the library and the script.

### Resolution Options

#### Option 1: Add GITHUB_TOKEN to .env (recommended — matches current code)

```env
# ===== AI — GITHUB MODELS (Video Script Generation) =====
# IMPORTANT: lib/video-generator.ts reads GITHUB_TOKEN, not OPENAI_API_KEY
GITHUB_TOKEN=ghp_your_github_token_here
```

Then the existing code works as-is (connecting to GitHub Models on Azure).

#### Option 2: Switch code to use OPENAI_API_KEY directly

Edit `lib/video-generator.ts` lines 14-17 to:

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Remove or comment out baseURL to use OpenAI's default endpoint
  // baseURL: 'https://models.inference.ai.azure.com',
});
```

Then the `.env` `OPENAI_API_KEY` value is used directly. The model `gpt-4o-mini` is available on both platforms.

#### Option 3: Support both (flexible)

Add a fallback in `lib/video-generator.ts`:

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GITHUB_TOKEN,
  baseURL: process.env.OPENAI_API_KEY ? undefined : 'https://models.inference.ai.azure.com',
});
```

This allows either variable to be set, with `OPENAI_API_KEY` taking priority.

### Recommendation

**Use Option 1** (add `GITHUB_TOKEN`) if you want the code to work immediately without modifications. GitHub Models provides the same `gpt-4o-mini` model via Azure and is free with a GitHub account up to certain rate limits.

**Use Option 3** (support both) for the most flexibility — it's a small code change and future-proofs the setup.

---

## 6. Testing Your Setup

### Verify Environment Variables

```bash
# Check that the env vars are loaded
cd /mnt/c/Users/romel/hostamar-local
node -e "require('dotenv').config(); console.log('GITHUB_TOKEN set:', !!process.env.GITHUB_TOKEN); console.log('ELEVENLABS_API_KEY set:', !!process.env.ELEVENLABS_API_KEY);"
```

### Test the Video Generator

```bash
# Run the generate page in dev mode
npm run dev
# → Visit http://localhost:3000/generate to test the UI
```

### Test Script Generation via Code

```typescript
// In a test file or REPL
import { generateVideoScript } from './lib/video-generator';

const script = await generateVideoScript({
  customerId: 'test-1',
  businessName: 'Test Business',
  industry: 'Technology',
  topic: 'AI Tools',
});
console.log('Generated script:', script);
```

---

## 7. Troubleshooting

### "API key not configured" warnings

- Ensure the correct env var is set (see Section 5 — the code uses `GITHUB_TOKEN` not `OPENAI_API_KEY`).
- Run `npm run dev` after setting variables — Next.js reads .env on startup only, so restart required.

### OpenAI / GitHub Models 401 Unauthorized

- `GITHUB_TOKEN` is expired or lacks permissions. Regenerate at https://github.com/settings/tokens
- For direct OpenAI, ensure billing is set up and the key is active at https://platform.openai.com/api-keys

### ElevenLabs 401 Unauthorized

- Verify the key at https://elevenlabs.io → Profile → API Keys
- Check character quota hasn't been exceeded (free tier: ~10K chars/month)

### ElevenLabs "Voice not found"

- The code uses voice `Bella` (line 122). If the voice was deleted or renamed, change the voice name.
- List available voices via ElevenLabs API: `GET https://api.elevenlabs.io/v1/voices` with your API key.

### Video generation hangs or fails silently

- Check the logs: look for `FFmpeg error:` or `No TTS service configured` warnings
- Ensure FFmpeg is installed: `ffmpeg -version`
- The video composition requires a background video at `assets/background.mp4`

---

## Appendix: Quick Reference

| Variable | Used By | Where to Get |
|----------|---------|-------------|
| `GITHUB_TOKEN` | `lib/video-generator.ts` | https://github.com/settings/tokens |
| `OPENAI_API_KEY` | `scripts/generate-videos.js` | https://platform.openai.com/api-keys |
| `ELEVENLABS_API_KEY` | `lib/video-generator.ts`, `scripts/generate-videos.js` | https://elevenlabs.io → Profile → API Keys |
| Model | `gpt-4o-mini` | Set in code (changeable) |
| ElevenLabs Model | `eleven_multilingual_v2` | Set in code (changeable) |
| ElevenLabs Voice | `Bella` | Set in code (changeable) |

---

*Last updated: May 2026*
