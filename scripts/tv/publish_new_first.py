#!/usr/bin/env python3
"""
publish_new_first.py — Publish with the NEWEST ad-burned file FIRST.

Playlist = newest *_ad.mp4 (line 1), then the remaining ad files, then slow
files (product-coverage round-robin). Safe swap: never empty; restore backup
playlist + restart ffmpeg if HLS != 200 after swap.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time

REPO = "/home/romel/hostamar-build"
PLAYLIST = os.path.join(REPO, "docker/tv-station/videos/playlist.host.txt")
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
LOG = "/tmp/publish_new_first.log"
CAP = 12


def log(m):
    print(m, flush=True)
    open(LOG, "a", encoding="utf-8").write(m + "\n")


def restore_backup():
    matches = sorted(glob.glob("/tmp/tv_clean_backup_*/playlist.host.txt")
                     + glob.glob("/tmp/tv_backup_*/playlist.host.txt"), reverse=True)
    if matches:
        shutil.copy(matches[0], PLAYLIST)
        log(f"restored playlist from {matches[0]}")


def hls_ok():
    r = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "10",
         "https://tv.hostamar.com/hls/tv/index.m3u8"],
        capture_output=True, text=True, timeout=20)
    return r.stdout.strip() == "200"


def main():
    open(LOG, "w", encoding="utf-8").close()
    log("=== publish_new_first start ===")

    ads = sorted(glob.glob(os.path.join(PURE_DIR, "*_ad.mp4")),
                 key=os.path.getmtime, reverse=True)
    slows = [f for f in glob.glob(os.path.join(PURE_DIR, "slow_*_pure.mp4"))
             if os.path.basename(f).replace("_pure.mp4", "_ad.mp4")
             not in [os.path.basename(a) for a in ads]]
    ads = [f for f in ads if os.path.getsize(f) > 100_000]

    if not ads:
        log("no ad files — aborting, keeping current playlist")
        sys.exit(1)

    # NEWEST first, then the rest of the ads, then slow round-robin by product
    ordered = [ads[0]] + ads[1:]
    def prod_of(p):
        m = re.match(r"(?:cc0|slow)_([A-Za-z]+)_", os.path.basename(p))
        return m.group(1) if m else "Misc"
    by_prod = {}
    for f in slows:
        by_prod.setdefault(prod_of(f), []).append(f)
    prods = sorted(by_prod)
    while len(ordered) < CAP:
        added = False
        for p in prods:
            if len(ordered) >= CAP:
                break
            lst = by_prod[p]
            if lst:
                ordered.append(lst.pop(0))
                added = True
        if not added:
            break

    lines = [f"file '{os.path.abspath(f)}'" for f in ordered[:CAP]]
    tmp = PLAYLIST + ".tmp"
    open(tmp, "w").write("\n".join(lines) + "\n")
    os.replace(tmp, PLAYLIST)
    log(f"NEW FIRST: {os.path.basename(ordered[0])}")
    log(f"wrote {len(lines)} entries")

    subprocess.run(["systemctl", "--user", "restart", "tv-ffmpeg"], timeout=60)
    time.sleep(10)
    if hls_ok():
        log("✅ HLS 200 after swap")
    else:
        log("⚠ HLS not 200 — restoring backup")
        restore_backup()
        subprocess.run(["systemctl", "--user", "restart", "tv-ffmpeg"], timeout=60)
        time.sleep(10)
        log("HLS after restore: " + ("200 OK" if hls_ok() else "STILL DOWN"))
        sys.exit(2)


if __name__ == "__main__":
    main()
