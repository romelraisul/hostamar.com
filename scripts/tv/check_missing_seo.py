#!/usr/bin/env python3
"""Find shelf videos that have no SEO watch page in the DB."""
import os, json, urllib.request, sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV = os.path.join(REPO, ".env.local")

api = None; token = None
for line in open(ENV):
    if line.startswith("DATABASE_URL="):
        v = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
        if v.startswith("libsql://"):
            parts = v.split("?")
            api = parts[0].replace("libsql://", "https://") + "/v2/pipeline"
            for p in parts[1].split("&"):
                if p.startswith("authToken="): token = p.split("=", 1)[1]

def query(sql, args=None):
    stmt = {"sql": sql}
    if args: stmt["args"] = args
    payload = {"requests": [{"type": "execute", "stmt": stmt}]}
    req = urllib.request.Request(api, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        resp = json.loads(r.read().decode())
    return resp["results"][0]["response"]["result"]["rows"]

# Existing DB slugs
rows = query('SELECT slug FROM "TvVideoSeo"')
db_slugs = set(r[0].get("value") for r in rows if r[0].get("value"))
print(f"DB has {len(db_slugs)} TvVideoSeo rows")

# Shelf files
import glob
shelf = sorted(os.path.basename(f) for f in glob.glob(os.path.join(REPO, "public/tv/*.mp4")))
print(f"Shelf has {len(shelf)} mp4s")

# Map: the seo script creates slug like own-<title-...> or <product>-<...>
# We don't know exact slugs. Just report shelf count vs DB count.
missing = len(shelf) - len(db_slugs)
print(f"Shelf files: {len(shelf)}, DB SEO entries: {len(db_slugs)}")
if missing > 0:
    print(f"Approximately {missing} videos may be missing SEO (check individually)")
