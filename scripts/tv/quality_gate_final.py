#!/usr/bin/env python3
"""
quality_gate_final.py — Reject anything that isn't PURE quality.

Multi-lang aware: accepts ANY language (en/hi/es/ar/id/bn/mul). Language and
place are parsed from the filename ({lang}_{place}_...) for logging only —
the gate never rejects on language.

For each *_pure.mp4 in docker/tv-station/videos/pure/:
  ffprobe video stream: REJECT if width<1920 OR height<1080 OR
  (bit_rate present AND bit_rate<3000000).  [3Mbps floor: YouTube 1080p
  typically ~4Mbps; 3Mbps allows efficient CC encodes while blocking junk.]
Rejected files are deleted. If zero files remain, the script exits non-zero
so the publisher can restore the backup and keep HLS alive.
"""
import glob
import json
import os
import re
import subprocess
import sys

REPO = "/home/romel/hostamar-build"
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
GATE_LOG = "/tmp/pure_gate.log"
MIN_BITRATE = 3_000_000  # 3Mbps floor for 1080p pure quality


def log(msg):
    print(msg, flush=True)
    with open(GATE_LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def probe_video(path):
    r = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=width,height,bit_rate', '-of', 'json', path],
        capture_output=True, text=True, timeout=30)
    if r.returncode != 0 or not r.stdout.strip():
        return None
    try:
        return json.loads(r.stdout).get('streams', [{}])[0]
    except Exception:
        return None


def lang_place(path):
    """Parse {lang}_{place}_ from filename for logging (never used to reject)."""
    m = re.match(r"([a-z]{2,3})_([A-Z]{2})_", os.path.basename(path))
    return f"[{m.group(1)}-{m.group(2)}]" if m else "[??-??]"


def main():
    open(GATE_LOG, "w", encoding="utf-8").close()
    log("=== quality_gate_final start (multi-lang, >=3Mbps) ===")
    files = sorted(glob.glob(os.path.join(PURE_DIR, "*_pure.mp4")))
    log(f"found {len(files)} pure files")
    kept = 0
    for f in files:
        tag = lang_place(f)
        v = probe_video(f)
        if not v:
            log(f"❌ REJECT unreadable {tag}: {os.path.basename(f)}")
            os.remove(f)
            continue
        w = int(v.get('width', 0) or 0)
        h = int(v.get('height', 0) or 0)
        br = int(v.get('bit_rate', 0) or 0)
        if w < 1920 or h < 1080:
            log(f"❌ REJECT low res {tag} {w}x{h}: {os.path.basename(f)}")
            os.remove(f)
            continue
        if br and br < MIN_BITRATE:
            log(f"❌ REJECT low bitrate {tag} {br//1000}k: {os.path.basename(f)}")
            os.remove(f)
            continue
        log(f"✅ PURE PASS {tag} {w}x{h} {br//1000}kbps: {os.path.basename(f)}")
        kept += 1
    log(f"kept {kept} pure files after gate")
    # Non-zero exit if nothing remains (caller restores backup)
    sys.exit(0 if kept >= 1 else 1)


if __name__ == "__main__":
    main()
