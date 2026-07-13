# backend/common/r2.py
"""S3-compatible (Cloudflare R2 / MinIO) upload + signed URL with auto-expire."""
import boto3
from botocore.client import Config
from common.config import settings


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_KEY,
        aws_secret_access_key=settings.R2_PASS,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_file(local_path: str, object_key: str) -> str:
    """Upload and return a time-limited signed GET URL (default 7 days)."""
    _client().upload_file(local_path, settings.R2_BUCKET, object_key)
    url = _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET, "Key": object_key},
        ExpiresIn=settings.R2_TTL,
    )
    return url


def public_url(object_key: str) -> str:
    return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{object_key}"
