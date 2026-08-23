#!/usr/bin/env python3
"""
publish_pure_final.py — Safe publish to the live TV playlist.

SAFETY (never break HLS 200, never empty playlist):
  - If 0 pure files, RESTORE backup playlist.host.txt and abort.
  - Write new playlist with absolute paths to each pure file (max 20).
  - Verify each file exists before listing it.
  - Restart tv-ffmpeg, then confirm HLS 200; if not 200, restore backup
    and restart again.

Backup path: read from /tmp/tv_backup_path.txt (set during Phase 2).
"""
import os
import shutil
import subprocess
import sys
import glob

REPO = "/home/romel/hostamar-build"
PLAYLIST = os.path.join(REPO, "docker/tv-station/videos/playlist.host.txt")
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
BACKUP_PATH_FILE = "/tmp/tv_backup_path.txt"
PUB_LOG = "/tmp/pure_publish.log"


def log(msg):
    print(msg, flush=True)
    with open(PUB_LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def backup_playlist():
    if os.path.exists(BACKUP_PATH_FILE):
        bp = open(BACKUP_PATH_FILE).read().strip()
        src = os.path.join(bp, "playlist.host.txt")
        if os.path.exists(src):
            shutil.copy(src, PLAYLIST)
            log(f"restored playlist from {src}")
            return
    # fallback: any /tmp/tv_backup_*
    import glob as g
    matches = sorted(g.glob("/tmp/tv_backup_*/playlist.host.txt"), reverse=True)
    if matches:
        shutil.copy(matches[0], PLAYLIST)
        log(f"restored playlist from {matches[0]}")


def hls_ok():
    r = subprocess.run(
        ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
         '--max-time', '10', 'https://tv.hostamar.com/hls/tv/index.m3u8'],
        capture_output=True, text=True, timeout=20)
    return r.stdout.strip() == '200'


def main():
    open(PUB_LOG, "w", encoding="utf-8").close()
    log("=== publish_pure_final start ===")
    files = sorted(glob.glob(os.path.join(PURE_DIR, "*_pure.mp4")),
                   key=os.path.getmtime, reverse=True)
    # keep only existing files
    files = [f for f in files if os.path.exists(f) and os.path.getsize(f) > 0]
    if not files:
        log("❌ 0 pure files — restoring backup, aborting to protect HLS")
        backup_playlist()
        subprocess.run(['systemctl', '--user', 'restart', 'tv-ffmpeg'], timeout=60)
        sys.exit(1)

    lines = []
    for f in files[:20]:
        lines.append(f"file '{os.path.abspath(f)}'")
    tmp = PLAYLIST + ".tmp"
    with open(tmp, "w") as out:
        out.write("\n".join(lines) + "\n")
    os.replace(tmp, PLAYLIST)
    log(f"wrote {len(lines)} pure entries to playlist")
    log("playlist head:")
    for l in lines[:3]:
        log("  " + l)

    # restart ffmpeg
    subprocess.run(['systemctl', '--user', 'restart', 'tv-ffmpeg'], timeout=60)
    import time
    time.sleep(8)
    if hls_ok():
        log("✅ HLS 200 after publish")
    else:
        log("⚠ HLS not 200 — restoring backup + restart")
        backup_playlist()
        subprocess.run(['systemctl', '--user', 'restart', 'tv-ffmpeg'], timeout=60)
        time.sleep(8)
        log(f"HLS after restore: {'200 OK' if hls_ok() else 'STILL DOWN — manual'}")
    log("=== publish done ===")


if __name__ == "__main__":
    main()
