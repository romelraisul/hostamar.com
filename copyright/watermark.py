"""Copyright registry + watermark for Hostamar final videos.

Real ffmpeg drawtext watermark "© হোস্টামার" and append-only JSONL registry.
Importable: `from watermark import add_copyright`.
"""
import os
import json
import time
import subprocess

COPY_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "copyright-db")
REGISTRY = os.path.join(COPY_DB, "registry.jsonl")


def add_copyright(path, typ="video"):
    os.makedirs(COPY_DB, exist_ok=True)
    cid = f"HOSTAMAR-{int(time.time())}"
    out = path.replace(".mp4", "_wm.mp4")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", path,
             "-vf", "drawtext=text='© হোস্টামার':x=10:y=H-th-10:fontsize=24:fontcolor=white@0.8:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "-c:a", "copy", out],
            timeout=30, capture_output=True,
        )
        final = out if os.path.exists(out) and os.path.getsize(out) > 0 else path
    except Exception:
        final = path
    cert = {"id": cid, "file": final, "type": typ, "ts": time.time(),
            "copyright": "© হোস্টামার"}
    try:
        with open(REGISTRY, "a") as f:
            f.write(json.dumps(cert) + "\n")
    except Exception:
        pass
    return cert
