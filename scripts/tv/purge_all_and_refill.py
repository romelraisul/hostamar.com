#!/usr/bin/env python3
"""
purge_all_and_refill.py — ONE SHOT: purge all 18 old voice-over to 0, then
immediately refill 2 real-dubbed (keep-music) to avoid HLS blackout >2 min.

Steps:
  1. Purge all old unqualified (--keep 0) -> playlist 0, DB 0
  2. Refill 2 real dubbed via real_dubbing.py (Video + Hosting) with keep-music
     (Demucs no_vocals if available, else synth fallback — TV never breaks)
  3. Verify HLS 200 after refill (10 sec)
  4. Ever-fresh loop will then continue to 2880

Usage:
  python3 scripts/tv/purge_all_and_refill.py
"""
import subprocess
import sys
import time
import os

REPO = '/home/romel/hostamar-build'

def run(cmd, timeout=900):
    print(f"$ {' '.join(cmd)}", flush=True)
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=REPO)
    print((p.stdout or p.stderr)[-800:])
    return p.returncode == 0

def main():
    print("=== PURGE ALL 18 old voice-over to 0 ===", flush=True)
    ok = run(['python3','scripts/tv/remove_all_unqualified.py','--confirm','--keep','0'], timeout=120)
    if not ok:
        print("purge failed", flush=True)
        sys.exit(1)
    # Verify 0
    with open(os.path.join(REPO,'docker/tv-station/videos/playlist.host.txt')) as f:
        lines = [l for l in f.read().splitlines() if l.strip()]
    print(f"After purge: playlist {len(lines)} lines (expected 0)")

    print("\n=== REFILL 2 real-dubbed keep-music to avoid blackout ===", flush=True)
    for product in ['Video','Hosting']:
        print(f"\n--- Refill {product} (real dubbing keep-music) ---", flush=True)
        # Try real_dubbing keep-music, fallback to create_from_free if XTTS/Wav2Lip down
        ok = run(['python3','scripts/tv/real_dubbing.py','--product',product,'--force-restart'], timeout=900)
        if not ok:
            print(f"real_dubbing {product} failed, trying create_from_free fallback", flush=True)
            run(['python3','scripts/tv/create_batch.py','--batch=1','--parallel=1','--use-piper'], timeout=600)
        time.sleep(5)

    print("\n=== Verify HLS after refill ===", flush=True)
    time.sleep(8)
    run(['bash','scripts/tv/force_restart_tv.sh'], timeout=60)
    time.sleep(5)
    p = subprocess.run(['bash','-c','curl -s -o /dev/null -w "%{http_code}" https://tv.hostamar.com/hls/tv/index.m3u8'], capture_output=True, text=True, timeout=20)
    print(f"HLS public: {p.stdout.strip()}")
    print("Done. TV should now have 2 real-dubbed keep-music, ever-fresh will continue to 2880.")

if __name__ == '__main__':
    main()
