#!/usr/bin/env python3
"""
scripts/tv/r2_upload.py — Upload TV videos to Cloudflare R2
Usage: python r2_upload.py [--dry-run] [file ...]
Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
"""
import os, sys, pathlib, mimetypes
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None

def env(k, d=""):
    return os.environ.get(k, d)

def get_client():
    if not boto3:
        print("boto3 not installed, dry-run only", file=sys.stderr)
        return None
    acct = env("R2_ACCOUNT_ID")
    key = env("R2_ACCESS_KEY_ID")
    secret = env("R2_SECRET_ACCESS_KEY")
    if not all([acct, key, secret]):
        print("Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — dry-run", file=sys.stderr)
        return None
    endpoint = f"https://{acct}.r2.cloudflarestorage.com"
    return boto3.client("s3", endpoint_url=endpoint, aws_access_key_id=key, aws_secret_access_key=secret, region_name="auto")

def upload_file(client, bucket, filepath, key):
    ctype = mimetypes.guess_type(filepath)[0] or "video/mp4"
    if not client:
        print(f"[dry-run] {filepath} -> s3://{bucket}/{key} ({ctype})")
        return True
    try:
        client.upload_file(filepath, bucket, key, ExtraArgs={"ContentType": ctype})
        print(f"Uploaded {filepath} -> s3://{bucket}/{key}")
        return True
    except ClientError as e:
        print(f"Failed {filepath}: {e}", file=sys.stderr)
        return False

def main():
    dry = "--dry-run" in sys.argv
    files = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not files:
        # default: upload all in public/tv or docker/tv-station/videos
        for base in ["public/tv", "docker/tv-station/videos", "videos"]:
            p = pathlib.Path(base)
            if p.exists():
                files = [str(f) for f in p.glob("*.mp4")]
                if files:
                    break
        if not files:
            print("No files found. Pass file paths or put mp4s in public/tv/", file=sys.stderr)
            sys.exit(1)
    bucket = env("R2_BUCKET", "hostamar-tv")
    prefix = env("R2_PREFIX", "tv/")
    client = None if dry else get_client()
    ok = 0
    for f in files:
        key = prefix + pathlib.Path(f).name
        if upload_file(client, bucket, f, key):
            ok += 1
    public_url = env("R2_PUBLIC_URL", f"https://{bucket}.r2.dev")
    print(f"Done {ok}/{len(files)} — public base {public_url}/{prefix}")
    # write manifest
    if ok:
        manifest = pathlib.Path("public/tv/r2_manifest.json")
        manifest.parent.mkdir(parents=True, exist_ok=True)
        import json, time
        data = {"uploaded": ok, "total": len(files), "bucket": bucket, "prefix": prefix, "public_url": public_url, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
        manifest.write_text(json.dumps(data, indent=2))
        print(f"Wrote {manifest}")

if __name__ == "__main__":
    main()
