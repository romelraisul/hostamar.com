# Hostamar — Free-GPU Backend Bridge (Colab & Kaggle)

This is the cheap-path fallback when **Replicate/Fal.ai tokens aren't available**.
The `gpu-worker` container stays the orchestrator and runs end-to-end routing;
this bridge lets it dispatch the **slow part** (model inference) to a free
GPU hosted on Kaggle or Colab.

## Trade-offs (read this first)

| | Local RTX 5060 | Kaggle Free | Colab Free | Replicate (paid) |
|---|---|---|---|---|
| Cost | 0 | 0 | 0 | ~$0.05/s video |
| Speed per clip | ❌ too slow | 30-60s | 30-90s | 5-15s |
| Reliability | ✅ highest | ✅ high | flaky (disconnects) | ✅ highest |
| Quota | unlimited | **30h/week** | ~12h/day | unlimited |
| Cold start | none | none | ~10s | none |
| You need | RTX 5060 | Kaggle acct | Google acct | $$ |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  desktop / Windows / PowerShell                                  │
│                                                                  │
│   hostamar-gpu-worker (Docker, WSL2)                            │
│   ├── receive BullMQ job from Redis                              │
│   ├── try provider: HF hosted (wired, needs scout test)          │
│   ├── try provider: replicate (needs REPLICATE_API_TOKEN)        │
│   ├── try provider: fal     (needs FAL_AI_API_KEY)               │
│   └── try provider: kaggle  ← YOU ARE HERE                       │
│        │                                                         │
│        │ HTTP POST  (image bytes | prompt | aspect)               │
│        ▼                                                         │
│   ┌──────────────────────────────┐                               │
│   │  Kaggle notebook (forever-on) │                              │
│   │  ├── receives HTTP via ngrok  │                              │
│   │  ├── runs AnimateDiff-Lightning│                              │
│   │  ├── uploads MP4 to your S3   │                              │
│   │  └── returns MP4 URL          │                              │
│   └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1** to wire this up: open `notebooks/kaggle-animatediff-server.ipynb` in Kaggle,
set GPU to T4×2, and run it. It'll give you a public URL.

**Step 2** — set `KAGGLE_VIDEO_URL` in your `.env.local`:

```bash
# .env.local
KAGGLE_VIDEO_URL=https://your-kaggle-tunnel.ngrok-free.app/generate
KAGGLE_VIDEO_TOKEN=any-secret-you-set-in-the-notebook
```

**Step 3** — uncomment `"kaggle"` in `PROVIDER_PRIORITY` of `workers/video_worker_gpu.py`,
rebuild worker. The dispatcher will pick it up automatically.

## Files in this directory

- `notebooks/kaggle-animatediff-server.ipynb` — main one. Run on Kaggle, exposes HTTP.
- `notebooks/colab-animatediff-server.ipynb` — same logic, run on Google Colab.
- `scripts/test-kaggle-bridge.sh` — fires one test request at your `KAGGLE_VIDEO_URL`
  to verify it's reachable, with timing.

## Limitations

- Network round-trip adds ~2-5s latency per request
- Kaggle notebooks get restarted weekly (data loss possible — uploaded clips stay safe)
- Colab free flips you off mid-clip on long generations
- Both expect you to copy-paste your **own tunnel token** (ngrok/cloudflared) — see notebook Cell 4
