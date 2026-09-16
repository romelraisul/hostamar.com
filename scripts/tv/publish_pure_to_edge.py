#!/usr/bin/env python3
"""
publish_pure_to_edge.py — move finished pure/ renders into public/tv/ so they
are git-tracked and edge-served (PC-off-safe).

The pure/ dir holds CC0 renders (NASA/Blender + Prelinger) with the Hostamar
ad text burned in. These are finished, never re-rendered by REEL. Copying them
to public/tv/<slug>.mp4 puts them on the edge shelf behind Cloudflare, which is
the ONLY path that survives the PC being off.

Usage:
  python3 scripts/tv/publish_pure_to_edge.py clean_cc0_Hosting_nasa_1_ad
  python3 scripts/tv/publish_pure_to_edge.py --all
"""
import json
import os
import shutil
import subprocess
import sys

REPO = '/home/romel/hostamar-build'
PURE = os.path.join(REPO, 'docker/tv-station/videos/pure')
EDGE = os.path.join(REPO, 'public/tv')
ATTR = os.path.join(PURE, 'attribution.json')


def slugify(name):
    base = os.path.splitext(name)[0]
    return base


def verify(path):
    """h264+aac, 854x480, non-zero duration — the shape every edge shelf card expects.

    NOTE: ffprobe emits one codec_name per STREAM, so a dict keyed on the bare
    key silently takes the AUDIO stream's codec_name and rejects every valid
    h264 file. Parse the first VIDEO stream explicitly.
    """
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=codec_name,width,height', '-show_entries',
         'format=duration,size', '-of', 'default=noprint_wrappers=1', path],
        capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        return False, 'ffprobe failed: ' + out.stderr[-200:]
    d = dict(l.split('=', 1) for l in out.stdout.strip().splitlines() if '=' in l)
    if float(d.get('duration', 0)) <= 0:
        return False, 'zero duration'
    if d.get('codec_name') != 'h264':
        return False, 'video codec not h264: ' + d.get('codec_name', '?')
    if int(d.get('width', 0)) < 480:
        return False, 'too small: ' + d.get('width', '?')
    return True, f"{d.get('width')}x{d.get('height')} {float(d['duration']):.1f}s {int(d['size'])}B"


def publish(names):
    os.makedirs(EDGE, exist_ok=True)
    attr = json.load(open(ATTR)) if os.path.exists(ATTR) else []
    by_file = {a['file']: a for a in attr}
    done = []
    for n in names:
        src = os.path.join(PURE, n + '.mp4')
        if not os.path.exists(src):
            print(f'[publish] SKIP missing {src}')
            continue
        dst = os.path.join(EDGE, slugify(n) + '.mp4')
        ok, info = verify(src)
        if not ok:
            print(f'[publish] SKIP {n}: {info}')
            continue
        if os.path.exists(dst):
            print(f'[publish] already on edge: {dst}')
            done.append(dst)
            continue
        shutil.copy2(src, dst)
        print(f'[publish] {n} -> {dst} ({info})')
        a = by_file.get(n + '.mp4') or by_file.get('clean_' + n + '.mp4') or {}
        print(f'[publish]   product={a.get("product")} source={a.get("source")} '
              f'license={a.get("license")} ad="{a.get("ad_text", "")}"')
        done.append(dst)
    return done


def main():
    names = sys.argv[1:]
    if not names or names[0] == '--all':
        names = sorted(f for f in os.listdir(PURE)
                       if f.endswith('.mp4') and not f.startswith('_tmp'))
    publish(names)


if __name__ == '__main__':
    main()