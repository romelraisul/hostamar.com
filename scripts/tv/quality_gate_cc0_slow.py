#!/usr/bin/env python3
"""
quality_gate_cc0_slow.py — SLOW-NET gate for the CC0 ad pipeline.

Accepts ONLY: width 640..1280, height 360..720, bitrate 400k..2000k,
duration 20..180s, size <60MB, filename *_ad.mp4 (ad-burned).
Anything else in pure/ matching cc0_*_pure.mp4 (unburned) is left alone;
heavy legacy 4K/1080p files are MOVED to videos/pure/archive_4k/ so the
playlist builder only sees slow-net files. Exits 1 if <MIN_KEEP pass.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys

REPO = "/home/romel/hostamar-build"
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
ARCHIVE_DIR = os.path.join(PURE_DIR, "archive_heavy")
LOG = "/tmp/pure_gate_cc0.log"
MIN_KEEP = 6


def log(m):
    print(m, flush=True)
    open(LOG, "a", encoding="utf-8").write(m + "\n")


def probe(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,bit_rate",
         "-show_entries", "format=duration,size", "-of", "json", path],
        capture_output=True, text=True, timeout=30)
    if r.returncode != 0 or not r.stdout.strip():
        return None
    try:
        j = json.loads(r.stdout)
        s = j["streams"][0]
        return (int(s.get("width") or 0), int(s.get("height") or 0),
                int(s.get("bit_rate") or 0),
                float(j["format"].get("duration") or 0),
                int(j["format"].get("size") or 0))
    except Exception:
        return None


def main():
    open(LOG, "w", encoding="utf-8").close()
    log("=== quality_gate_cc0_slow start ===")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    # 1) Archive heavy legacy files (4K/1080p multi-lang era) out of the way
    for f in sorted(glob.glob(os.path.join(PURE_DIR, "*.mp4"))):
        base = os.path.basename(f)
        if "_ad.mp4" in base:
            continue
        if base.startswith(("mul_", "ar_", "en_")) and not base.startswith("slow_"):
            dst = os.path.join(ARCHIVE_DIR, base)
            if not os.path.exists(dst):
                shutil.move(f, dst)
                log(f"📦 archived heavy: {base}")

    # 2) Gate the slow library: prefer _ad.mp4; fall back to slow_*_pure.mp4
    keep = []
    for f in sorted(glob.glob(os.path.join(PURE_DIR, "*_ad.mp4"))) + \
             sorted(glob.glob(os.path.join(PURE_DIR, "slow_*_pure.mp4"))):
        p = probe(f)
        if not p:
            os.remove(f)
            continue
        w, h, br, dur, sz = p
        ok = (640 <= w <= 1280 and 360 <= h <= 720
              and (br == 0 or 400_000 <= br <= 2_000_000)
              and 20 <= dur <= 200 and sz < 60_000_000)
        if ok:
            keep.append(f)
            log(f"✅ {os.path.basename(f)} {w}x{h} {br//1000}k "
                f"{sz//1_000_000}MB {dur:.0f}s")
        else:
            log(f"❌ REJECT {os.path.basename(f)} {w}x{h} {br//1000}k "
                f"{sz//1_000_000}MB {dur:.0f}s")
            os.remove(f)

    log(f"kept {len(keep)} slow files")
    sys.exit(0 if len(keep) >= MIN_KEEP else 1)


if __name__ == "__main__":
    main()
