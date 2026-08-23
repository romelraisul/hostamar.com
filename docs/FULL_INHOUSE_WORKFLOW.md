# Hostamar TV — FULL IN-HOUSE WORKFLOW

One command turns a browser hunt into a published, SEO'd TV video using only
in-house services. Zero external API cost.

## Architecture

```
 camofox.hostamar.com          ai.hostamar.com (:11442, 103 models)         WSL ffmpeg
 ┌───────────────────┐   ┌──────────────────────────────────────┐   ┌──────────────────┐
 │ browser_search_    │   │ research: llama-3.1-8b relevance JSON│   │ yt-dlp download  │
 │ youtube_cc (tool)  │──▶│ gate <7 = skip                       │──▶│ edge-tts Bangla  │
 │ CC filter + scrape │   │ (whisper/vision AUTO-ON when gw      │   │ VO + music bed   │
 │ + yt-dlp license   │   │  gains mmproj/whisper endpoints)     │   │ mix + enhance    │
 └───────────────────┘   │ create-script: rafan (template-safe) │   │ + burn overlays  │
                         └──────────────────────────────────────┘   └───────┬──────────┘
                                                                                    │ publish pos1
                              comfy.hostamar.com (Hunyuan little-edit)              ▼
                              probe → DOWN today → ffmpeg enhance        ┌──────────────────────┐
                              (auto-fallback, retry when GPU fixed)      │ TvPlaylistItem pos1  │
                                                                         │ playlist.host.txt    │
                                                                         │ tv-ffmpeg restart    │
                                                                         │ seo_generate.py      │
                                                                         │  → /tv/watch/{slug}  │
                                                                         │  → OG 1200x630       │
                                                                         │  → sitemap entry     │
                                                                         │ notify.py → TG/TvLog │
                                                                         └──────────────────────┘
```

## Run it

```bash
cd ~/hostamar-build
python3 scripts/tv/full_workflow.py --product Video --now [--use-rafan]
# automation (already live in tv-viral.service): round-robin every 30 min
```

Stages (each independently runnable):

| Stage | Script | Notes |
|---|---|---|
| hunt | `scripts/tv/hunt_tool.ts` / lib/tv/hunter/browserTool.ts | camofox REST /tabs + YouTube CC filter; yt-dlp license verify; dedupe by url |
| research | `scripts/tv/research_inhouse.py` | relevance JSON via llama-3.1-8b (2000 tok headroom for CoT); whisper+vision paths coded, auto-skip while gateway 404s them |
| create | `scripts/tv/create_from_free.ts` | gender pitch detect → Pradeep/Nabanita; music bed (per-product triad) mixed at ~0.12; VIDEO_ENHANCE color+unsharp; burns watermark/hook/tag; 1280x720 High@L3.1 yuv420p |
| SEO | `scripts/tv/seo_generate.py` | template-primary (rafan optional --use-rafan); TvVideoSeo + OG + VideoObject |
| notify | `scripts/notify.py` | Telegram if TELEGRAM_BOT_TOKEN/CHAT_ID set; always TvLog |

## Reality audit (2026-08-23 — /tmp/inhouse_audit.txt)

Brief assumed endpoints that DO NOT exist. Built against reality:

| Assumed | Reality | Handling |
|---|---|---|
| whisper @ ai.hostamar.com | /v1/audio/transcriptions → **404** | audio_transcribe() coded; returns None → title-only scoring until endpoint appears |
| llava vision @ gateway | VL models listed but server lacks **mmproj** ("image input is not supported") | vision_describe() coded; None → skipped |
| bark / musicgen | not in model list | ffmpeg-synth music bed per product triad (royalty-free by construction); USE_MUSIC=0 disables |
| HunyuanVideo1.5 @ comfy.hostamar.com | **502** — podman container exited: no NVIDIA driver in container | comfyAvailable() probe each run; ffmpeg enhance fallback; fix = nvidia-container-toolkit/CDI then restart comfyui-podman |
| camofox CDP /json/version | it's a REST server (/health, /tabs) | hunter already uses correct REST API |

Gateway quirks encoded in code:
- reasoning models dump chain-of-thought into `content` → extract LAST JSON object containing the wanted key, give 2000-token headroom (~2 min/call on llama-3.1-8b)
- Neon drops idle SSL during long model calls → fresh DB connection per write

## Relevance gate

FreeVideoSource.relevanceScore (+ FreeVideoSourceResearch table). Verified
discrimination: "Chatbotapp AI Tutorial" → 8.5 ACCEPT vs "Perl Programming
Tutorial" → 2 REJECT. create_from_free only picks candidates with score NULL
or ≥7.

## Automation

tv-viral.service runs start-viral.sh: every 30 min rotates Video→Hosting→Chat→
Browser→IDE→Gaming through full_workflow --one; hourly --missing SEO sweep.
Containers: tv-db restart=always, tv-rtmp unless-stopped. Logs:
/tmp/tv-workflow.log, /tmp/tv-viral.log, /tmp/tv-seo-auto.log.

## Fixing Hunyuan later

1. Give the podman container GPU access (nvidia-container-toolkit / CDI on WSL),
   or run Windows portable ComfyUI (C:\ComfyUI_Download) and point COMFY_URL at it.
2. No code change needed — comfyAvailable() flips true and the workflow logs
   "comfy available"; wire the full edit workflow JSON into create_from_free's
   comfyUp branch when weights fit 8GB VRAM (Hunyuan fp8 likely does NOT —
   see memory: 17-18GB models never fit).
