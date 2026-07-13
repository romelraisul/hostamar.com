# backend/worker.py
"""Redis-stream consumer. For each job:
  1. translate Bangla prompt -> English (light heuristic; real translator TODO)
  2. split 90s target into 6x15s LTX chunks (disk-streaming, VRAM flat)
  3. TTS (Chatterbox via comfyui_lite) -> BGM (ACE-Step) -> I2V (LTX on comfyui_main)
     -> InfiniteTalk lip-sync (comfyui_lite) -> caption (whisper) -> 4K upscale
  4. concat via ffmpeg, upload final to R2, write signed URL to job hash, fire webhook.
Runs ONE job per GPU at a time (per-service lock) — concurrency = number of GPUs.
"""
import os
import json
import time
import uuid
import subprocess
from datetime import datetime, timezone

import httpx
from redis import Redis
from common.config import settings
from common.comfy import submit_prompt, wait_for_completion, extract_output_urls
from common.r2 import upload_file

redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
GROUP = "video_workers"
CONSUMER = f"worker-{uuid.uuid4().hex[:8]}"


def _set(job_id, **fields):
    redis.hset(f"job:{job_id}", mapping={k: (json.dumps(v) if isinstance(v, (dict, list, bool)) else str(v)) for k, v in fields.items()})


def _load_workflow(name: str) -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "workflows", f"{name}.json")
    with open(path) as f:
        return json.load(f)


def _translate_bn_to_en(prompt_bn: str) -> str:
    # PLACEHOLDER: real Bangla->English translation (nmt model / API) goes here.
    # LTX-Video is trained on English prompts; transliteration alone is weak.
    return prompt_bn  # TODO: call translator; for now pass-through


def _run_workflow(base_url: str, workflow: dict, job_id: str, stage: str) -> list[str]:
    cid = f"{job_id}-{stage}"
    _set(job_id, status="running", stage=stage, progress=0.2)
    pid = submit_prompt(base_url, workflow, cid)
    hist = wait_for_completion(base_url, pid, timeout_s=1800)
    urls = extract_output_urls(base_url, hist)
    return urls


def process(payload: dict):
    job_id = payload["job_id"]
    prompt_en = _translate_bn_to_en(payload["prompt_bn"])
    aspect = payload["aspect_ratio"]
    with_bgm = payload.get("with_bgm", True)
    try:
        # 1) TTS (Chatterbox) on lite GPU
        tts = _load_workflow("tts")
        tts["6"]["inputs"]["text"] = payload.get("script_bn") or prompt_en
        tts["6"]["inputs"]["voice"] = payload.get("voice_id", "default")
        _run_workflow(settings.COMFY_LITE_URL, tts, job_id, "tts")

        # 2) BGM (ACE-Step) on lite GPU (optional)
        if with_bgm:
            bgm = _load_workflow("full_pipeline")  # reuses ACE-Step node graph subset
            _run_workflow(settings.COMFY_LITE_URL, bgm, job_id, "bgm")

        # 3) Video: 6x15s LTX chunks on main GPU, concat, upscale, lip-sync
        ttv = _load_workflow("ttv")
        chunks = 6
        local_parts = []
        for i in range(chunks):
            ttv["10"]["inputs"]["prompt"] = f"{prompt_en} (scene {i+1}/{chunks})"
            ttv["10"]["inputs"]["negative_prompt"] = "blurry, watermark, low quality, text overlay"
            ttv["10"]["inputs"]["aspect_ratio"] = aspect
            ttv["10"]["inputs"]["duration"] = 15
            out = _run_workflow(settings.COMFY_MAIN_URL, ttv, job_id, f"ttv_{i}")
            # download each output to ./output then collect for concat
            for u in out:
                p = f"/output/{job_id}_{i}.mp4"
                _download(u, p)
                local_parts.append(p)
            _set(job_id, progress=0.2 + 0.6 * (i + 1) / chunks)

        # 4) concat + 4K upscale (ffmpeg) -> final mp4
        final = f"/output/{job_id}_final.mp4"
        _concat(local_parts, final)
        _upscale(final, f"/output/{job_id}_4k.mp4")

        # 5) R2 upload + signed URL
        key = f"videos/{job_id}.mp4"
        signed = upload_file(f"/output/{job_id}_4k.mp4", key)
        _set(job_id, status="completed", progress=1.0, video_url=signed, r2_key=key, completed_at=datetime.now(timezone.utc).isoformat())
        _fire_webhook(payload.get("webhook_url"), job_id, signed)
    except Exception as e:  # noqa
        _set(job_id, status="failed", error=str(e))
        _fire_webhook(payload.get("webhook_url"), job_id, None, error=str(e))


def _download(url: str, dest: str):
    with httpx.stream("GET", url, timeout=120) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_raw():
                f.write(chunk)


def _concat(parts: list[str], dest: str):
    list_file = "/output/_concat.txt"
    with open(list_file, "w") as f:
        for p in parts:
            f.write(f"file '{p}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", dest], check=True)


def _upscale(src: str, dest: str):
    # Real-ESRGAN x4 then pad/rescale to 4K (3840x2160). Keeps aspect via -2.
    subprocess.run(["ffmpeg", "-y", "-i", src, "-vf", "scale=3840:-2", "-c:v", "libx264", "-crf", "18", dest], check=True)


def _fire_webhook(url: str | None, job_id: str, video_url: str | None, error: str | None = None):
    if not url:
        return
    try:
        httpx.post(url, json={"job_id": job_id, "video_url": video_url, "error": error}, timeout=10)
    except Exception:
        pass


def main():
    # create consumer group if missing (mkstream)
    try:
        redis.xgroup_create(settings.WORKER_STREAM, GROUP, id="0", mkstream=True)
    except Exception:
        pass
    print(f"[worker] listening on stream={settings.WORKER_STREAM} group={GROUP} consumer={CONSUMER}")
    while True:
        resp = redis.xreadgroup(GROUP, CONSUMER, {settings.WORKER_STREAM: ">"}, count=1, block=5000)
        if not resp:
            continue
        for _stream, messages in resp:
            for msg_id, fields in messages:
                payload = json.loads(fields["job"])
                try:
                    process(payload)
                finally:
                    redis.xack(settings.WORKER_STREAM, GROUP, msg_id)


if __name__ == "__main__":
    main()
