#!/usr/bin/env python3
"""
publish_cc0_slow_final.py — Safe-swap publish for the CC0 slow-net playlist.

Priority: cc0_*_ad.mp4 (ad-burned) -> slow_*_pure.mp4 (no ad yet).
Never empties the playlist; restores /tmp/tv_backup_*/playlist.host.txt and
restarts ffmpeg if 0 files or HLS != 200 after swap.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
import time

REPO = "/home/romel/hostamar-build"
PLAYLIST = os.path.join(REPO, "docker/tv-station/videos/playlist.host.txt")
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
LOG = "/tmp/publish_cc0.log"


def log(m):
    print(m, flush=True)
    open(LOG, "a", encoding="utf-8").write(m + "\n")


def restore_backup():
    matches = sorted(glob.glob("/tmp/tv_backup_*/playlist.host.txt"), reverse=True)
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
    log("=== publish_cc0_slow_final start ===")

    ads = sorted(glob.glob(os.path.join(PURE_DIR, "cc0_*_ad.mp4")))
    slows = sorted(glob.glob(os.path.join(PURE_DIR, "slow_*_pure.mp4")))
    candidates = ads + [s for s in slows if os.path.basename(s).replace("_pure.mp4", "_ad.mp4")
                        not in [os.path.basename(a) for a in ads]]
    candidates = [f for f in candidates if os.path.getsize(f) > 100_000]

    # PRODUCT COVERAGE FIRST: at least one file per product (Video/Hosting/Chat/
    # Browser/IDE/Gaming), then fill remaining slots. Prevents alphabetical
    # caps from dropping whole products.
    import re as _re
    def prod_of(path):
        m = _re.match(r"(?:cc0|slow)_([A-Za-z]+)_", os.path.basename(path))
        return m.group(1) if m else "Misc"

    by_prod = {}
    for f in candidates:
        by_prod.setdefault(prod_of(f), []).append(f)

    ordered = []
    seen = set()
    # round-robin one per product until exhausted or cap
    CAP = 12
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

    files = ordered

    if not files:
        log("❌ 0 publishable files — restoring backup, aborting")
        restore_backup()
        subprocess.run(["systemctl", "--user", "restart", "tv-ffmpeg"], timeout=60)
        sys.exit(1)

    lines = [f"file '{os.path.abspath(f)}'" for f in files]
    tmp = PLAYLIST + ".tmp"
    open(tmp, "w").write("\n".join(lines) + "\n")
    os.replace(tmp, PLAYLIST)
    log(f"wrote {len(lines)} entries ({len(ads)} with still ads)")

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
    log("=== done ===")


if __name__ == "__main__":
    main()
