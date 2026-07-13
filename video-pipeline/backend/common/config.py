# backend/common/config.py
"""Centralised settings. Reads the env vars wired in docker-compose.prod.yml."""
import os
from typing import Optional


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


class Settings:
    REDIS_URL: str = _env("REDIS_URL", "redis://localhost:6379/0")
    COMFY_MAIN_URL: str = _env("COMFY_MAIN_URL", "http://localhost:8188")
    COMFY_LITE_URL: str = _env("COMFY_LITE_URL", "http://localhost:8189")
    WORKER_STREAM: str = _env("WORKER_STREAM", "video_jobs")
    JOB_TTL: int = int(_env("JOB_TTL", "86400"))
    R2_ENDPOINT: str = _env("R2_ENDPOINT", "http://localhost:9000")
    R2_KEY: str = _env("R2_KEY", "minioadmin")
    R2_PASS: str = _env("R2_PASS", "minioadmin")
    R2_BUCKET: str = _env("R2_BUCKET", "hostamar-videos")
    R2_PUBLIC_URL: str = _env("R2_PUBLIC_URL", "http://localhost:9000/hostamar-videos")
    R2_TTL: int = int(_env("R2_TTL", "604800"))  # 7 days
    HF_TOKEN: str = _env("HF_TOKEN", "")
    API_KEY: str = _env("VIDEO_KEY", "change-me")
    BKASH_KEY: str = _env("BKASH_KEY", "")
    WEBHOOK_URL: str = _env("WEBHOOK_URL", "")


settings = Settings()
