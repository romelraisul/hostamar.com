#!/usr/bin/env python3
"""merge-free-models.py — V74 rolling free-model index.

Merges the latest hourly snapshot (~/memories/models/free-models-*.json)
into ~/memories/models/index.json:
  {last_run, total_free, top10: [{id, provider, quality_score}], providers: {}}
Keeps the last N (24) hourly snapshots on disk; older ones are pruned so the
memories dir cannot grow unbounded. Secrets: never sees any keys.
"""
import json
import os
import sys
import glob
import time

MEMDIR = os.path.expanduser("~/memories/models")
INDEX = os.path.join(MEMDIR, "index.json")
KEEP_SNAPSHOTS = 24


def main(snap_path: str) -> None:
    os.makedirs(MEMDIR, exist_ok=True)
    try:
        with open(snap_path) as f:
            snap = json.load(f)
    except Exception as e:
        print(f"snapshot unreadable: {e}")
        sys.exit(1)

    models = snap.get("models", [])
    providers: dict = {}
    for m in models:
        providers[m.get("provider", "?")] = providers.get(m.get("provider", "?"), 0) + 1
    index = {
        "last_run": snap.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
        "total_free": snap.get("count", len(models)),
        "top10": [
            {"id": m["id"], "provider": m.get("provider"), "quality_score": m.get("quality_score")}
            for m in models[:10]
        ],
        "providers": providers,
    }
    with open(INDEX, "w") as f:
        json.dump(index, f, indent=1)

    # prune old snapshots, keep newest KEEP_SNAPSHOTS
    snaps = sorted(glob.glob(os.path.join(MEMDIR, "free-models-*.json")))
    for old in snaps[:-KEEP_SNAPSHOTS]:
        try:
            os.remove(old)
        except OSError:
            pass
    print(f"index updated: {index['total_free']} free, top={index['top10'][0]['id'] if index['top10'] else 'n/a'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
