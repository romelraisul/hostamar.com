#!/usr/bin/env python3
"""one_pusher.py — kill every ffmpeg that pushes to YouTube, keep the local publisher.

Why a script: `pkill -f "youtube.com/live2"` also matches the *shell that runs it*
(its own command line contains the pattern), so the agent's terminal dies with
SIGTERM. Matching in python and killing by PID avoids self-matching entirely.
"""
import os
import signal
import sys

TARGET = "youtube.com/live2"
KEEP = "-f concat"  # the local publisher (writes nginx + HLS)

me = os.getpid()
killed, kept = [], []
for pid in os.listdir('/proc'):
    if not pid.isdigit() or int(pid) == me:
        continue
    try:
        cmd = open(f'/proc/{pid}/cmdline', 'rb').read().decode('utf-8', 'replace').replace('\x00', ' ').strip()
    except OSError:
        continue
    if 'ffmpeg' not in cmd:
        continue
    if TARGET in cmd:
        try:
            os.kill(int(pid), signal.SIGTERM)
            killed.append((pid, cmd[:90]))
        except OSError as e:
            print(f"  kill {pid} failed: {e}")
    elif KEEP in cmd:
        kept.append((pid, cmd[:70]))

print(f"killed {len(killed)} YouTube pusher(s):")
for pid, cmd in killed:
    print(f"  {pid} {cmd}")
print(f"kept {len(kept)} local publisher(s):")
for pid, cmd in kept:
    print(f"  {pid} {cmd}")

assert len(kept) >= 1, "no local publisher found — TV would go dark"
print("OK: egress cleared, local publisher intact")
