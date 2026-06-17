# HuggingFace Spaces (Docker) — another free GPU option

HF Spaces gives you a PERSISTENT GPU-backed container — unlike Colab which disconnects, or Kaggle which is 30h/week. The free tier is **CPU basic, but you can request a free GPU upgrade** (takes a few days for approval). Worth it for prod.

## When to pick this over Kaggle/Colab

- Kaggle = best free GPU hours, but intermittent
- Colab = fast start, dies daily
- **HF Spaces = persistent, sleep-wakes via traffic**, scales for free

## When you outgrow HF Spaces

The free T4 (16GB) on HF Spaces is your exit point from "free" — most video models fit. Once you have paying customers, swap to a **dedicated endpoint** at $1.50/hr running 24/7. With 10 paying users at ৳2,000/mo each = ৳20,000 = $180/mo you can afford it.

## Setup (paste-ready)

1. Sign in at https://huggingface.co (use a NEW throwaway email like `ai-video@yourdomain.com`, NOT your personal Gmail)
2. New Space → SDK: **Docker** → Hardware: **CPU basic** (request GPU upgrade after first deploy)
3. Push the following files (structure shown below)
4. Space auto-builds. Public URL once live.

```
your-space/
├── Dockerfile
└── app.py
```

Get the contents from this directory:

- `Dockerfile` — extends HF base image, includes CUDA, loads AnimateDiff on startup
- `app.py` — simple Flask app, accepts HTTP POST, returns MP4 bytes
- You can copy `notebooks/kaggle-animatediff-server.ipynb` Cell 5 verbatim — same FastAPI server code.

## How the worker connects

```bash
# .env.local
HF_SPACES_VIDEO_URL=https://YOUR-USER-YOUR-SPACE.hf.space
# optional token if your space is private:
HF_SPACES_VIDEO_TOKEN=hf_*** *** HF Spaces. Token is per-account scope.

Then in `workers/video_worker_gpu.py` `PROVIDER_PRIORITY`, append `"hf_spaces"`:
PROVIDER_PRIORITY = [
    os.getenv("VIDEO_PROVIDER_PRIMARY", "huggingface"),
    "hf_spaces",          # <- new
    "kaggle",             # <- new
    "colab",              # <- new
    "replicate",
    "fal",
]
```

The dispatcher logic in `generate_video()` already iterates these names; you'd add 3 new functions (`generate_via_hf_spaces`, `generate_via_kaggle`, `generate_via_colab`) — each posts to the matching URL.

## Why I'm NOT shipping these now

- You have **0 paying customers** and the dispatcher chain `hf → replicate → fal` already covers path-to-paid
- HF Spaces requires account-bound permission escalation (free GPU approval)
- You can ship the **Kaggle/Colab equivalents in 30 minutes each once you need them** — they're just `httpx.post()` away from "ready"
- Your bottleneck isn't GPU, it's **distribution** — no amount of GPU helps without signups

**Cost-priority order over the next 30 days:**
1. Post / DM / ads (₹0) → first paying customer
2. Kaggle bridge (₹0, 1 hr) → actual video generation works
3. HF Spaces (₹0, wait for approval) → persistent
4. Replicate (paid, only when paid customers need 5s-fast gens)
