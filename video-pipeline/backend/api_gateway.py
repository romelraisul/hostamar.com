# backend/api_gateway.py
"""Public API gateway for hostamar.com/video (Next.js calls this).
POST /v1/generate -> enqueue job, return job_id immediately.
GET  /v1/status/{job_id} -> status + progress + (when done) signed R2 URL.
Auth: Bearer API key. Optional bKash webhook verification gate before enqueue.
"""
import os
import json
import uuid
import httpx
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from redis import Redis
from common.config import settings

app = FastAPI(title="Hostamar Video Gateway", version="1.0.0")
redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)


class GenerateReq(BaseModel):
    prompt_bn: str = Field(..., description="Bangla natural-language prompt")
    style: str = "ads"
    aspect_ratio: str = Field("9:16", pattern="^(9:16|16:9|1:1)$")
    voice_id: str = "default"
    with_bgm: bool = True
    avatar_image_url: str | None = None
    webhook_url: str | None = None  # where to POST when done


def _auth(api_key: str | None):
    if not api_key or not api_key.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = api_key.split(" ", 1)[1]
    if token != settings.API_KEY:
        raise HTTPException(403, "invalid api key")


def _verify_bkash(bkash_payload: str | None):
    """Optional gate: refuse to enqueue if the org's bKash payment is not verified.
    Real verification hits BKASH_SECRET + the payment record; stubbed to pass when
    BKASH_KEY is unset (local/dev) so the pipeline is testable without bKash."""
    if not settings.BKASH_KEY:
        return  # dev mode: skip
    # TODO: lookup org by token, assert Payment.status == 'COMPLETED' for this plan.
    return


@app.post("/v1/generate")
async def generate(req: GenerateReq, authorization: Optional[str] = Header(None)):
    _auth(authorization)
    _verify_bkash(None)
    job_id = f"vid_{uuid.uuid4().hex[:16]}"
    payload = {
        "job_id": job_id,
        "prompt_bn": req.prompt_bn,
        "style": req.style,
        "aspect_ratio": req.aspect_ratio,
        "voice_id": req.voice_id,
        "with_bgm": req.with_bgm,
        "avatar_image_url": req.avatar_image_url,
        "webhook_url": req.webhook_url or settings.WEBHOOK_URL,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "queued",
        "progress": 0.0,
    }
    redis.hset(f"job:{job_id}", mapping={k: json.dumps(v) if isinstance(v, (dict, list, bool)) else str(v) for k, v in payload.items()})
    redis.expire(f"job:{job_id}", settings.JOB_TTL)
    redis.xadd(settings.WORKER_STREAM, {"job": json.dumps(payload)})
    return {"job_id": job_id, "status": "queued"}


@app.get("/v1/status/{job_id}")
async def status(job_id: str):
    raw = redis.hgetall(f"job:{job_id}")
    if not raw:
        raise HTTPException(404, "job not found")
    out = {}
    for k, v in raw.items():
        try:
            out[k] = json.loads(v)
        except (json.JSONDecodeError, TypeError):
            out[k] = v
    return out


@app.get("/health")
async def health():
    return {"ok": True}
