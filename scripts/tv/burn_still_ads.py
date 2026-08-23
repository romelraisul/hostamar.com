#!/usr/bin/env python3
"""
burn_still_ads.py — Burn STILL product ad text into CC0 pure files.

Still (non-moving) white text, bottom-center, black 0.6-opacity box,
fontsize 22, DejaVuSans (Latin-safe). One ad per file by its product tag:
  cc0_{Product}_{source}_{n}_pure.mp4 -> cc0_{Product}_..._ad.mp4

Also writes attribution.json entries for /api/tv/credits.
NO yellow hook, NO movement — readable at 480p on slow connections.
"""
import glob
import json
import os
import re
import subprocess

REPO = "/home/romel/hostamar-build"
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
LOG = "/tmp/burn_ads.log"

ADS = {
    "Video":   "Hostamar Video - AI Video Generator - hostamar.com/video",
    "Hosting": "Hostamar Hosting - BDIX 5GB FREE 20ms - hostamar.com/hosting",
    "Chat":    "Hostamar Chat - AI Chat Bangla Voice - hostamar.com/chat",
    "Browser": "Hostamar Browser - Automation Browser - browser.hostamar.com",
    "IDE":     "Hostamar IDE - Replit Alternative FREE - hostamar.com/ide",
    "Gaming":  "Hostamar Gaming - Tournament Hosting - hostamar.com/gaming",
}
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def log(m):
    print(m, flush=True)
    open(LOG, "a", encoding="utf-8").write(m + "\n")


def esc(t):
    """Escape drawtext-special chars."""
    return (t.replace("\\", "\\\\").replace(":", "\\:")
              .replace("'", "\\\\'").replace("%", "\\%"))


def burn(src, dst, text):
    vf = (f"drawtext=fontfile={FONT}:text='{esc(text)}'"
          f":fontcolor=white:fontsize=22:box=1:boxcolor=black@0.6"
          f":boxborderw=8:x=(w-text_w)/2:y=h-th-20")
    cmd = ["ffmpeg", "-y", "-i", src, "-vf", vf,
           "-c:v", "libx264", "-b:v", "800k", "-maxrate", "900k",
           "-bufsize", "1600k", "-preset", "fast",
           "-c:a", "copy", "-movflags", "+faststart", dst]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    return r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 100_000


def main():
    open(LOG, "w", encoding="utf-8").close()
    log("=== burn_still_ads start ===")
    attribution = []
    out_files = []

    for f in sorted(glob.glob(os.path.join(PURE_DIR, "cc0_*_pure.mp4"))):
        base = os.path.basename(f)
        m = re.match(r"cc0_([A-Za-z]+)_([a-z]+)_?(\d*)_pure\.mp4", base)
        if not m:
            continue
        product, source, n = m.group(1), m.group(2), m.group(3)
        ad_text = ADS.get(product)
        if not ad_text:
            continue
        dst = f.replace("_pure.mp4", "_ad.mp4")
        if os.path.exists(dst) and os.path.getsize(dst) > 100_000:
            log(f"  exists: {os.path.basename(dst)}")
            out_files.append(dst)
        elif burn(f, dst, ad_text):
            log(f"  ✅ burned {product}: {os.path.basename(dst)} "
                f"({os.path.getsize(dst)//1_000_000}MB)")
            out_files.append(dst)
        else:
            log(f"  ❌ burn failed: {base}")
            continue
        attribution.append({
            "file": os.path.basename(dst),
            "product": product,
            "source": source,
            "license": "CC0/Public Domain (Blender films: CC-BY, credited)",
            "ad_text": ad_text,
        })

    with open(os.path.join(PURE_DIR, "attribution.json"), "w") as fp:
        json.dump(attribution, fp, indent=2)
    log(f"attribution.json: {len(attribution)} entries; ad files: {len(out_files)}")
    print(f"AD_FILES={len(out_files)}")


if __name__ == "__main__":
    main()
