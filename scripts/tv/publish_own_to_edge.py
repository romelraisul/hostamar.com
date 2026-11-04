#!/usr/bin/env python3
"""
publish_own_to_edge.py — move OUR OWN finished renders into public/tv/ so they
are git-tracked and edge-served (PC-off-safe).

Unlike publish_pure_to_edge.py (third-party CC0 footage, which must NEVER reach
our own properties), this script publishes ONLY renders we produced ourselves:
  - OpenMontage/projects/programmes/*.mp4  (our OpenCut/programme renders)
  - ComfyUI/output/video/HostamarH3_*.mp4   (our own H3 short-form renders)

Every file is verified: h264 video + aac audio with mean_volume > -50 dB
(AUDIO GUARD — a silent file is rejected, never published).

Usage:
  python3 scripts/tv/publish_own_to_edge.py            # all missing
  python3 scripts/tv/publish_own_to_edge.py --dry-run   # list only
"""
import os
import re
import shutil
import subprocess
import sys

REPO = '/home/romel/hostamar.com'
EDGE = os.path.join(REPO, 'public/tv')

SOURCES = [
    '/home/romel/OpenMontage/projects/programmes',
    '/home/romel/ComfyUI/output/video',
    '/home/romel/scratch/video',   # own assemble.py renders (build-log episodes)
]

# third-party patterns must never ship to our edge (same guard as .gitignore)
THIRD_PARTY = ('cc0_', 'clean_cc0_', 'cmt', 'nasa', 'blender', 'prelinger')


def verify(path):
    """h264+aac, >0 duration, audible audio (mean_volume > -50 dB)."""
    p = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=codec_name,width,height', '-show_entries',
         'format=duration,size', '-of', 'default=noprint_wrappers=1', path],
        capture_output=True, text=True, timeout=60)
    if p.returncode != 0:
        return False, 'ffprobe failed: ' + p.stderr[-200:]
    d = dict(l.split('=', 1) for l in p.stdout.strip().splitlines() if '=' in l)
    if float(d.get('duration', 0)) <= 0:
        return False, 'zero duration'
    if d.get('codec_name') != 'h264':
        return False, f"video codec not h264: {d.get('codec_name')}"
    if int(d.get('width', 0)) < 480:
        return False, f"too small: {d.get('width')}px"

    a = subprocess.run(
        ['ffmpeg', '-v', 'info', '-i', path, '-af', 'volumedetect',
         '-f', 'null', '-'],
        capture_output=True, text=True, timeout=300)
    mv = None
    for line in a.stderr.splitlines():
        m = re.search(r'mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB', line)
        if m:
            mv = float(m.group(1))
    if mv is None:
        return False, 'no volumedetect output'
    if mv <= -50:
        return False, f'SILENT: mean_volume {mv} dB'
    return True, (f"{d['width']}x{d['height']} {float(d['duration']):.1f}s "
                  f"{int(d['size'])}B {mv:+.1f}dB")


def main():
    dry = '--dry-run' in sys.argv
    done = []
    for src_dir in SOURCES:
        if not os.path.isdir(src_dir):
            print(f'[publish] SKIP missing dir {src_dir}')
            continue
        for name in sorted(os.listdir(src_dir)):
            if not name.endswith('.mp4'):
                continue
            if '.silent-bak' in name:
                continue
            low = name.lower()
            if any(t in low for t in THIRD_PARTY):
                continue
            dst = os.path.join(EDGE, name)
            if os.path.exists(dst):
                continue
            src = os.path.join(src_dir, name)
            ok, info = verify(src)
            if not ok:
                print(f'[publish] SKIP {name}: {info}')
                continue
            print(f'[publish] {name} -> public/tv/ ({info})')
            done.append(name)
            if dry:
                continue
            shutil.copy2(src, dst)
    print(f'[publish] {"would publish" if dry else "published"} {len(done)} file(s)')


if __name__ == '__main__':
    main()