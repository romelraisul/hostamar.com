#!/usr/bin/env python3
"""
Hostamar GPU Worker (Python, self-contained)

Pure-Python BullMQ consumer that uses only packages actually available at
runtime. NO .ts / @prisma/client imports — those are JS-only and break the
Python process. The worker updates Postgres by calling the Node app's
internal callback endpoint (POST /api/worker/video-update) protected by a
shared secret.

Docker CMD: python3 workers/video_worker_gpu.py
"""

import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime, timezone
from typing import Any

import httpx
from bullmq import Worker

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Logging destination. /app/logs may be bind-mounted from the host
# (docker-compose.local.yml mounts ./logs → /app/logs). WSL2 / DrvFS quirks
# sometimes allow probe-write but deny FileHandler append-open, so prefer
# /var/log (container-local, always writable) unless WORKER_LOG_DIR is
# explicitly set to /app/logs.
LOG_DIR = os.getenv("WORKER_LOG_DIR", "/var/log")
os.makedirs(LOG_DIR, exist_ok=True)

# Touch the target file up front so we get a clean PermissionError early
# instead of after the first log line.
try:
    _log_file = os.path.join(LOG_DIR, "gpu-worker.log")
    if not os.path.exists(_log_file):
        open(_log_file, "a").close()
except OSError:
    LOG_DIR = "/tmp"
    os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(LOG_DIR, "gpu-worker.log")),
    ],
)
logger = logging.getLogger("gpu-worker")


# ---------------------------------------------------------------------------
# Config (mirrors lib/queue.ts + lib/ai-video.ts so behavior matches)
# ---------------------------------------------------------------------------
QUEUE_NAME = os.getenv("VIDEO_QUEUE_NAME", "video-generation")

# bullmq-py accepts the IORedis-style URL the Node app uses.
# docker-compose.local.yml passes BULLMQ_REDIS_URL=http://redis:6379 (a
# mistake from when this was Upstash REST — fall back to redis://). The
# Python redis client only accepts redis://, rediss://, or unix://.
_raw_redis = (
    os.getenv("BULLMQ_REDIS_URL")
    or os.getenv("REDIS_URL")
    or "redis://redis:6379"
)
if _raw_redis.startswith("http://"):
    REDIS_URL = "redis://" + _raw_redis[len("http://") :]
elif _raw_redis.startswith("https://"):
    REDIS_URL = "rediss://" + _raw_redis[len("https://") :]
else:
    REDIS_URL = _raw_redis

CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", "2"))
WORKER_NAME = os.getenv("WORKER_NAME", "hostamar-gpu-worker")

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")
FAL_AI_API_KEY = os.getenv("FAL_AI_API_KEY", "")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")

# Provider preference. Local is skipped today (RTX 5060 sm_120 needs torch >=2.7
# + CUDA 12.8; worker image has torch 2.4+cu124 which only knows sm_50..sm_90
# — verified by direct GPU compute test). When a newer torch wheel exists,
# promote "local" to the front and re-test.
# Provider order — "local" tries first on machines with a working GPU stack
# (RTX 5060 sm_120 + torch nightly cu128). Falls back to cloud APIs.
PROVIDER_PRIORITY = [
    os.getenv("VIDEO_PROVIDER_PRIMARY", "huggingface"),  # local was first; flip if torch cu128 is working
    "replicate",
    "fal",
    "local",  # WIP — needs full cu128 stack including nvidia-cuda-cupti
]

# Callback into Node app. In docker-compose the app service is reachable at
# http://app:3000 and the internal endpoint is /api/worker/video-update.
APP_CALLBACK_URL = os.getenv("APP_CALLBACK_URL", "http://app:3000/api/worker/video-update")
WORKER_SHARED_SECRET = os.getenv("WORKER_SHARED_SECRET", "")

# ---------------------------------------------------------------------------
# Callback helper — POST status / result back to the Node app
# ---------------------------------------------------------------------------
async def report_to_app(video_id: str, job_id: str | None, payload: dict[str, Any]) -> None:
    """
    Send a status update / result to the Node app, which writes to Postgres
    via Prisma. If the secret is unset we log and skip — worker still runs.
    """
    if not WORKER_SHARED_SECRET:
        logger.debug("WORKER_SHARED_SECRET unset — skipping app callback")
        return

    body = {"videoId": video_id, "jobId": job_id, **payload}
    headers = {
        "content-type": "application/json",
        "x-worker-secret": WORKER_SHARED_SECRET,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(APP_CALLBACK_URL, json=body, headers=headers)
        if r.status_code >= 300:
            logger.warning(
                "app callback returned %s for videoId=%s: %s",
                r.status_code, video_id, r.text[:300],
            )
        else:
            logger.debug("app callback ok for videoId=%s: %s", video_id, r.json())
    except Exception as exc:  # network blip etc — don't kill the job
        logger.warning("app callback failed for videoId=%s: %s", video_id, exc)


# ---------------------------------------------------------------------------
# Video generation — pure-Python port of lib/ai-video.ts
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# =============================================================================
# Local video provider — see /tmp/local_provider.py for the latest implementation
# =============================================================================
"""Local video provider using Stable Video Diffusion XT.

Stable Video Diffusion (SVD) with the XT variant produces smooth 25-frame
videos (3.1s @ 8fps) from a single source image. We don't have an SDXL
text-to-image model on hand, so we synthesize a deterministic RGB image
seeded by the prompt's hash. This produces visual variety per prompt without
incurring the 4GB SDXL model download.
"""

import logging as _local_log
import hashlib as _hashlib

import PIL.Image as _PILImage


# --------- lazy loaders ---------


def _torch_check():
    """Returns torch CUDA device or raises."""
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA not available")
    return torch.device("cuda")


def _load_svd_model(device, dtype):
    """Load Stable Video Diffusion XT for img2vid (3s, 25 frames)."""
    import torch
    from diffusers.pipelines.stable_video_diffusion.pipeline_stable_video_diffusion import StableVideoDiffusionPipeline
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=dtype,
        variant="fp16",
    ).to(device)
    pipe.enable_attention_slicing()
    pipe.enable_vae_slicing()
    try:
        pipe.enable_xformers_memory_efficient_attention()
    except Exception:
        pass
    return pipe


# --------- main function ---------


async def generate_via_local(prompt: str, style: str, duration: int, aspect_ratio: str) -> dict:
    """
    Stable Video Diffusion XT — produce a 3s (25 frames @ 8fps) mp4 entirely
    on the local RTX GPU. The src image is a deterministic RGB gradient
    derived from the prompt hash, giving each prompt a unique look.
    """
    log = _local_log.getLogger("gpu-worker")
    try:
        device = _torch_check()
    except RuntimeError as e:
        raise RuntimeError(f"local GPU unavailable: {e}")

    import torch
    from diffusers.pipelines.stable_video_diffusion.pipeline_stable_video_diffusion import StableVideoDiffusionPipeline
    dtype = torch.float16

    # Write to a shared volume so node app can serve it
    out_dir = "/app/videos"
    import os, tempfile
    os.makedirs(out_dir, exist_ok=True)

    tmp_mp4 = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False, dir=out_dir)
    tmp_mp4.close()
    out_path = tmp_mp4.name

    log.info("generate_via_local SVD-XT starting: prompt=%r, %ds", prompt[:60], duration)

    def _run() -> str:
        # 1. Load SVD pipeline (cached after first call)
        if not hasattr(_load_svd_model, "_cached_pipe"):
            _load_svd_model._cached_pipe = _load_svd_model(device, dtype)
        pipe = _load_svd_model._cached_pipe

        # 2. Build deterministic source image (RGB gradient based on prompt hash)
        h = int(_hashlib.sha1(prompt.encode()).hexdigest(), 16)
        r1, g1, b1 = (h >> 24) & 0xFF, (h >> 16) & 0xFF, (h >> 8) & 0xFF
        r2, g2, b2 = (r1 + 64) & 0xFF, (g1 + 64) & 0xFF, (b1 + 64) & 0xFF
        H, W = 320, 576  # 16:9 — keeps VRAM low
        img = _PILImage.new("RGB", (W, H))
        for y in range(H):
            ratio = y / max(H - 1, 1)
            r = int(r1 * (1 - ratio) + r2 * ratio)
            g = int(g1 * (1 - ratio) + g2 * ratio)
            b = int(b1 * (1 - ratio) + b2 * ratio)
            for x in range(W):
                img.putpixel((x, y), (r, g, b))
        # Add a faintly-textured overlay so the motion vector field picks up variation
        import random as _r
        _r.seed(h)
        for _ in range(200):
            x = _r.randint(0, W - 1)
            y = _r.randint(0, H - 1)
            v = _r.randint(-30, 30)
            r, g, b = img.getpixel((x, y))
            img.putpixel((x, y), (
                max(0, min(255, r + v)),
                max(0, min(255, g + v)),
                max(0, min(255, b + v)),
            ))

        log.info("SVD image prepared, calling pipeline...")
        # 3. Generate 25-frame video (SVD-XT default)
        out = pipe(
            image=img,
            height=H,
            width=W,
            num_frames=25,
            num_inference_steps=15,
            decode_chunk_size=2,
            motion_bucket_id=127,
            fps=8,
        )
        # diffusers >=0.30 returns a FrameSeq with .frames[0]; older returns nested lists of PIL
        result = out.frames[0] if hasattr(out, "frames") else out[0]
        if isinstance(result, list) and result and not hasattr(result[0], "save"):
            result = result[0]

        # 4. Save mp4 via imageio (handles PIL frames cleanly)
        import imageio.v2 as imageio
        import numpy as np
        writer = imageio.get_writer(out_path, fps=8, codec="libx264", quality=8, macro_block_size=1)
        for frame in result:
            writer.append_data(np.asarray(frame))
        writer.close()
        return out_path

    import asyncio
    loop = asyncio.get_event_loop()
    try:
        video_path = await loop.run_in_executor(None, _run)
    except Exception as e:
        import os as _os
        try:
            _os.unlink(out_path)
        except OSError:
            pass
        raise RuntimeError(f"local SVD-XT failed: {e}")

    filename = os.path.basename(video_path)
    video_url = f"/videos/{filename}"
    # Thumbnail — first frame
    thumb_url = None
    try:
        thumb_path = "/app/videos/_thumb_" + filename.replace(".mp4", ".jpg")
        if result := None:
            pass
    except Exception:
        thumb_url = None
    log.info("SVD-XT saved: %s -> %s", video_path, video_url)
    return {
        "videoUrl": video_url,
        "thumbnailUrl": thumb_url,
        "duration": duration,
        "provider": "local:svd-xt",
    }


async def generate_via_replicate(prompt: str, style: str, duration: int, aspect_ratio: str) -> dict[str, Any]:
    """
    POST a prediction to Replicate, then poll. Mirrors generateVideoReplicate()
    in lib/ai-video.ts which uses stability-ai/stable-video-diffusion.
    """
    if not REPLICATE_API_TOKEN:
        raise RuntimeError("REPLICATE_API_TOKEN is not set")

    model_id = "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438"
    headers = {"Authorization": f"Token {REPLICATE_API_TOKEN}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Create prediction
        create_resp = await client.post(
            "https://api.replicate.com/v1/predictions",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "version": model_id.split(":", 1)[1],
                "input": {
                    "prompt": f"{prompt}, {style} style, {duration}s duration",
                    "aspect_ratio": aspect_ratio,
                    "motion_bucket_id": 127,
                    "fps": 24,
                },
            },
        )
        create_resp.raise_for_status()
        prediction = create_resp.json()
        prediction_id = prediction.get("id")
        if not prediction_id:
            raise RuntimeError(f"replicate: no prediction id in response: {prediction}")

        # 2. Poll until terminal
        get_url = prediction.get("urls", {}).get("get", f"https://api.replicate.com/v1/predictions/{prediction_id}")
        for _ in range(120):  # up to ~20 minutes (10s intervals)
            await asyncio.sleep(10)
            poll = await client.get(get_url, headers=headers)
            poll.raise_for_status()
            data = poll.json()
            status = data.get("status")
            if status in ("succeeded", "failed", "canceled"):
                if status != "succeeded":
                    raise RuntimeError(f"replicate job {status}: {data.get('error')}")
                output = data.get("output")
                video_url = output[0] if isinstance(output, list) and output else output
                if not isinstance(video_url, str):
                    raise RuntimeError(f"replicate: unexpected output shape: {output!r}")
                return {"videoUrl": video_url, "duration": duration, "provider": "replicate"}

        raise RuntimeError("replicate: timed out waiting for prediction")


async def generate_via_fal(prompt: str, style: str, duration: int, aspect_ratio: str) -> dict[str, Any]:
    """
    Subscribe to fal-ai/video-generation. Mirrors generateVideoFal() in
    lib/ai-video.ts. Uses fal's queue subscribe endpoint.
    """
    if not FAL_AI_API_KEY:
        raise RuntimeError("FAL_AI_API_KEY is not set")

    headers = {"Authorization": f"Key {FAL_AI_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Submit
        submit = await client.post(
            "https://queue.fal.run/fal-ai/video-generation",
            headers=headers,
            json={
                "prompt": f"{prompt}, {style} style",
                "duration": duration,
                "aspect_ratio": aspect_ratio,
            },
        )
        submit.raise_for_status()
        job = submit.json()
        request_id = job.get("request_id")
        if not request_id:
            raise RuntimeError(f"fal: no request_id in response: {job}")

        # 2. Poll status endpoint
        status_url = f"https://queue.fal.run/fal-ai/video-generation/requests/{request_id}/status"
        result_url = f"https://queue.fal.run/fal-ai/video-generation/requests/{request_id}"
        for _ in range(120):
            await asyncio.sleep(5)
            s = await client.get(status_url, headers=headers)
            s.raise_for_status()
            status = s.json().get("status")
            if status in ("COMPLETED", "FAILED"):
                break
        else:
            raise RuntimeError("fal: timed out waiting for completion")
        if status != "COMPLETED":
            raise RuntimeError(f"fal job failed: {s.text}")

        result = await client.get(result_url, headers=headers)
        result.raise_for_status()
        data = result.json()
        return {
            "videoUrl": data.get("video_url"),
            "thumbnailUrl": data.get("thumbnail_url"),
            "duration": duration,
            "provider": "fal",
        }


async def generate_via_huggingface(prompt, style, duration, aspect_ratio):
    """
    Use the HuggingFace Inference API for free, serverless video gen.

    Free tier: ~1k requests/day, no card. Set HUGGINGFACE_API_TOKEN.
    Get a token at https://huggingface.co/settings/tokens (type: read).

    Model: damo-vilab/ModelScope_t2v — free, 240 frames (4s@60fps or 8s@30fps),
    text→video. HF may need to "warm up" a cold model on first call (it loads
    the model from storage); we poll with backoff up to 60s.
    """
    if not HUGGINGFACE_API_TOKEN:
        raise RuntimeError("HUGGINGFACE_API_TOKEN is not set")

    model_id = "damo-vilab/ModelScope_t2v"
    api_url = f"https://api-inference.huggingface.co/models/{model_id}"

    # Build request payload — ModelScope_t2v accepts: prompt, guidance_scale,
    # num_inference_steps, num_frames. duration is advisory only.
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_frames": min(duration * 8, 64),   # ~8fps: 4s→32 frames, 8s→64 frames (max stable)
            "guidance_scale": 7.5,
        },
    }

    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
        # POST the inference job
        submit_resp = await client.post(api_url, headers=headers, json=payload)
        if submit_resp.status_code == 503:
            # Model is cold — poll until it's ready
            logger.info("HF model %s is cold, waiting for load...", model_id)
            for _ in range(24):          # up to 2 min
                await asyncio.sleep(5)
                ready_resp = await client.get(api_url, headers=headers)
                if ready_resp.status_code == 200:
                    break
            else:
                raise RuntimeError(f"HF model {model_id} failed to load within 120s")
            # Retry after load
            submit_resp = await client.post(api_url, headers=headers, json=payload)

        submit_resp.raise_for_status()

        # ModelScope_t2v returns a raw video bytes (mp4) on success
        content_type = submit_resp.headers.get("content-type", "")
        if "video" in content_type or submit_resp.content[:4] == b"\x00\x00\x00":
            # Binary video — save to /tmp, upload to our app as a worker artifact
            video_bytes = submit_resp.content
            ext = "mp4"
        elif submit_resp.content[:1] == b"{":
            # JSON — might be a queued response
            resp_json = submit_resp.json()
            raise RuntimeError(f"HF returned queued response (expected binary): {resp_json}")
        else:
            raise RuntimeError(f"HF returned unexpected content-type {content_type}")

        # Save locally so the callback URL can serve it
        import hashlib, time
        video_hash = hashlib.sha256(video_bytes + str(time.time()).encode()).hexdigest()[:12]
        video_path = f"/tmp/video_{video_hash}.{ext}"
        with open(video_path, "wb") as f:
            f.write(video_bytes)
        logger.info("HF video saved locally: %s (%d bytes)", video_path, len(video_bytes))

        # Report back with the local path — the Node app will copy/serve it
        return {
            "videoUrl": f"file://{video_path}",
            "thumbnailUrl": None,
            "duration": duration,
            "provider": "huggingface",
            "modelId": model_id,
        }

async def generate_video(options: dict[str, Any]) -> dict[str, Any]:
    """Dispatcher -- tries providers in PROVIDER_PRIORITY."""
    prompt = options.get("prompt", "")
    style = options.get("style", "cinematic")
    aspect_ratio = options.get("aspect_ratio", "16:9")
    duration = options.get("duration", 5)
    requested = options.get("provider")  # may be empty
    errors = []

    # Build the candidate list: honor explicit provider first, then priority list (deduped).
    providers = []
    if requested:
        providers.append(requested)
    for p in PROVIDER_PRIORITY:
        if p not in providers and p != requested:
            providers.append(p)

    for p in providers:
        try:
            if p == "local":
                return await generate_via_local(prompt, style, duration, aspect_ratio)
            if p == "huggingface":
                return await generate_via_huggingface(prompt, style, duration, aspect_ratio)
            if p == "replicate":
                return await generate_via_replicate(prompt, style, duration, aspect_ratio)
            if p == "fal":
                return await generate_via_fal(prompt, style, duration, aspect_ratio)
            # if p == "local": reserved for when torch >= 2.7 + CUDA 12.8 are available
            logger.warning("unknown provider '%s', skipping", p)
        except Exception as e:
            logger.warning("provider %s failed: %s", p, e)
            errors.append(f"{p}: {e}")

    raise RuntimeError(f"all providers failed: {' | '.join(errors)}")


# ---------------------------------------------------------------------------
# Job processing — replicate the TS processor body
# ---------------------------------------------------------------------------
async def process_video_job(job, token: str | None = None) -> dict[str, Any]:
    """
    bullmq-py 2.25 calls the processor as processor(job, token). The token
    lets you extend the job lock if processing is long; we ignore it since
    each video gen completes in under 20 minutes and our default lock is 30 seconds. See:
    https://github.com/taskforcesh/bullmq-py.
    Mirrors workers/video-worker.ts videoWorker handler logic.
    """
    job_id = job.id
    data = job.data or {}
    video_id = data.get("videoId") or data.get("video_id")
    prompt = data.get("prompt", "N/A")

    logger.info("processing job %s video=%s prompt=%.50s", job_id, video_id, prompt)

    if not video_id:
        raise ValueError("job payload missing videoId")

    # 1. Mark PROCESSING
    await report_to_app(video_id, job_id, {"status": "PROCESSING", "progress": 10})

    try:
        # 2. Run inference (this is what the "GPU" actually does)
        try:
            await job.update_progress(20)
        except Exception:
            pass  # not critical

        result = await generate_video({
            "prompt": prompt,
            "style": data.get("style", "cinematic"),
            "duration": data.get("duration", 5),
            "aspect_ratio": data.get("aspectRatio") or data.get("aspect_ratio", "16:9"),
            "provider": data.get("provider", "replicate"),
        })

        try:
            await job.update_progress(90)
        except Exception:
            pass

        # 3. Report completion to Node app, which writes to Postgres
        await report_to_app(video_id, job_id, {
            "status": "COMPLETED",
            "progress": 100,
            "videoUrl": result.get("videoUrl"),
            "thumbnailUrl": result.get("thumbnailUrl"),
            "duration": result.get("duration"),
            "provider": result.get("provider"),
        })

        try:
            await job.update_progress(100)
        except Exception:
            pass

        logger.info("job %s completed video=%s url=%s", job_id, video_id, result.get("videoUrl"))
        return result

    except Exception as exc:
        logger.exception("job %s failed video=%s", job_id, video_id)
        await report_to_app(video_id, job_id, {
            "status": "FAILED",
            "progress": 0,
            "error": str(exc)[:500],
        })
        raise


# ---------------------------------------------------------------------------
# Main — boot BullMQ worker, wait forever
# ---------------------------------------------------------------------------
async def main() -> None:
    logger.info("starting %s (concurrency=%s, queue=%s)", WORKER_NAME, CONCURRENCY, QUEUE_NAME)
    logger.info("redis=%s callback=%s", REDIS_URL, APP_CALLBACK_URL if WORKER_SHARED_SECRET else "(disabled no secret)")

    # bullmq-py Worker takes an async callable and connection options.
    # The connection dict mirrors what the Node side passes to ioredis.
    worker = Worker(
        QUEUE_NAME,
        process_video_job,
        {
            "connection": REDIS_URL,
            "concurrency": CONCURRENCY,
        },
    )

    worker.on("completed", lambda j, r: logger.info("job %s completed", j.id))
    worker.on("failed", lambda j, err: logger.error("job %s failed: %s", j.id, err))
    worker.on("error", lambda err: logger.error("worker error: %s", err))

    stop = asyncio.Event()

    def _signal_handler(*_):
        logger.info("signal received — shutting down")
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            asyncio.get_running_loop().add_signal_handler(sig, _signal_handler)
        except (NotImplementedError, RuntimeError):
            # Windows / restricted envs — fall back to default
            signal.signal(sig, lambda *_: _signal_handler())

    try:
        await stop.wait()
    finally:
        await worker.close()
        logger.info("worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
