#!/usr/bin/env python3
"""
add_100_destinations.py — Populate TvStreamDestination with 15 real + 85 placeholders (100 total).

Placeholders are inactive (isActive false) until you replace streamKey via
POST /api/tv/restream or /admin/tv/restream.

Usage:
  python3 scripts/tv/add_100_destinations.py --confirm
  curl https://hostamar.com/api/tv/restream | jq length  # 100+
"""
import argparse
import json
import os
import requests

REPO = '/home/romel/hostamar-build'

def load_base():
    import json as _json
    base = _json.load(open(os.path.join(REPO, 'scripts/tv/destinations_100.json')))
    # Expand to 100 by cloning custom placeholders
    while len(base) < 100:
        n = len(base) + 1
        base.append({"platform":"CUSTOM","rtmpUrl":f"rtmp://custom{n}.example.com/live/","streamKey":f"PLACEHOLDER_CUSTOM{n}","label":f"Custom {n}"})
    return base[:100]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--confirm', action='store_true')
    ap.add_argument('--api', default='https://hostamar.com/api/tv/restream')
    args = ap.parse_args()
    dests = load_base()
    print(f"Prepared {len(dests)} destinations (first 15 real, rest placeholders)")
    if not args.confirm:
        print("Dry-run: use --confirm to POST")
        for d in dests[:3]:
            print(f"  {d['platform']} {d['label']} -> {d['rtmpUrl']}")
        return
    ok = 0
    for d in dests:
        is_active = not d['streamKey'].startswith('PLACEHOLDER')
        payload = {
            "platform": d['platform'],
            "rtmpUrl": d['rtmpUrl'],
            "streamKey": d['streamKey'],
            "label": d['label'],
            "isActive": is_active
        }
        try:
            r = requests.post(args.api, json=payload, timeout=15)
            if r.status_code in (200,201):
                ok += 1
            else:
                print(f"  FAIL {d['label']}: {r.status_code} {r.text[:80]}")
        except Exception as e:
            print(f"  ERR {d['label']}: {e}")
    print(f"Done: {ok}/{len(dests)} created. Active: {sum(1 for d in dests if not d['streamKey'].startswith('PLACEHOLDER'))}")

if __name__ == '__main__':
    main()
