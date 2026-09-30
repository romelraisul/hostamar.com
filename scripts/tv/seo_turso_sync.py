#!/usr/bin/env python3
"""
seo_turso_sync.py — copy TvVideoSeo/FreeVideoSource rows from the local dev
postgres (localhost:5432, where seo_generate.py writes) into production Turso
(the DB the /tv/watch pages + sitemap actually read).

Why this exists: seo_generate.db_url() is hardcoded to localhost:5432 and
psycopg2 cannot talk libsql dialect (gen_random_uuid()/NOW()). Rows "created"
there never reach production → /tv/watch/<slug> 404. This script is the one
sync step after any generation run.

Usage: python3 scripts/tv/seo_turso_sync.py            # sync all missing
       python3 scripts/tv/seo_turso_sync.py --slug X   # sync one
"""
import json
import os
import re
import subprocess
import sys
import uuid
from urllib.parse import unquote

import psycopg2

REPO = "/home/romel/hostamar.com"
LOCAL_URL = "postgresql://hostamar:hostamar@localhost:5432/hostamar"

JS_TEMPLATE = """
const p = JSON.parse(require('fs').readFileSync(__PAYLOAD__, 'utf8'));
let ins = 0, skip = 0;
for (const s of p.src) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO "FreeVideoSource" (id, product, title, "titleBn", url, "localPath", "createdAt") VALUES (?,?,?,?,?,?,?)',
    args: [s.id, s.product, s.title, s.titleBn, s.url, s.localPath, s.createdAt],
  });
}
const only = p.onlySlug;
for (const r of p.seo) {
  if (only && r.slug !== only) continue;
  const ex = await db.execute({ sql: 'SELECT slug FROM "TvVideoSeo" WHERE slug = ?', args: [r.slug] });
  if (ex.rows.length) { skip++; continue; }
  await db.execute({
    sql: 'INSERT INTO "TvVideoSeo" (id, "videoSourceId", slug, "titleBn", "metaDescription", keywords, "transcriptBn", "schemaString", "ogImage", "canonicalUrl", product, "viralScore", views, "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    args: [r.id, r.videoSourceId, r.slug, r.titleBn, r.metaDescription, r.keywords, r.transcriptBn, r.schemaString, r.ogImage, r.canonicalUrl, r.product, r.viralScore, r.views, r.createdAt, r.updatedAt],
  });
  ins++;
  console.log('  inserted: ' + r.slug);
}
const cnt = await db.execute('SELECT COUNT(*) as n FROM "TvVideoSeo"');
console.log('DONE inserted=' + ins + ' skipped=' + skip + ' total=' + cnt.rows[0].n);
"""


def turso_env():
    """(url, token) from .env.local DATABASE_URL."""
    env = open(os.path.join(REPO, ".env.local"), encoding="utf-8").read()
    raw = re.search(r"^DATABASE_URL=(.+)$", env, re.M).group(1).strip()
    if raw.startswith('"'):
        raw = raw[1:]  # .env.local value is quoted; the quote is not part of the URL
    if raw.endswith('"'):
        raw = raw[:-1]  # trailing close-quote rides along the same way — 401 at Turso
    url, _, rest = raw.partition("?")
    token = unquote(rest.split("authToken=", 1)[1]) if "authToken=" in rest else ""
    return url, token


def pg_array_literal(val):
    """Turso stores keywords as a Postgres array-literal STRING ('{a,b,"c d"}')
    — the watch page's char-loop parser expects exactly that shape."""
    if val is None:
        return None
    if isinstance(val, str):
        return val if val.startswith("{") else "{" + val + "}"

    def esc(s):
        s = str(s)
        if any(ch in s for ch in ',"\\{}'):
            return '"' + s.replace("\\", "\\\\").replace('"', '""') + '"'
        return s
    return "{" + ",".join(esc(v) for v in val) + "}"


def dt_sql(dt):
    """Match the format of working Turso rows: 'YYYY-MM-DD HH:MM:SS'."""
    if dt is None:
        import datetime
        dt = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def main():
    only_slug = None
    if "--slug" in sys.argv:
        only_slug = sys.argv[sys.argv.index("--slug") + 1]

    conn = psycopg2.connect(LOCAL_URL)
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM "TvVideoSeo"')
    print(f"local TvVideoSeo rows: {cur.fetchone()[0]}")

    cur.execute("""SELECT v.id, v."videoSourceId", v.slug, v."titleBn", v."metaDescription",
                          v.keywords, v."transcriptBn", v."schemaString", v."ogImage",
                          v."canonicalUrl", v.product, v."viralScore", v.views,
                          v."createdAt", v."updatedAt"
                   FROM "TvVideoSeo" v""")
    rows = cur.fetchall()
    cur.execute("""SELECT id, product, title, "titleBn", url, "localPath", "createdAt"
                   FROM "FreeVideoSource"
    """)
    srcs = {r[0]: r for r in cur.fetchall()}
    conn.close()

    payload = []
    for (rid, vsid, slug, title_bn, meta_desc, keywords, transcript, schema_s,
         og_image, canonical, product, viral, views, created, updated) in rows:
        payload.append({
            "id": rid or str(uuid.uuid4()),
            "videoSourceId": vsid,
            "slug": slug,
            "titleBn": title_bn,
            "metaDescription": meta_desc,
            "keywords": pg_array_literal(keywords),
            "transcriptBn": transcript,
            "schemaString": schema_s,
            "ogImage": og_image,
            "canonicalUrl": canonical or f"https://hostamar.com/tv/watch/{slug}",
            "product": product or "Own",
            "viralScore": viral or 0,
            "views": views or 0,
            "createdAt": dt_sql(created),
            "updatedAt": dt_sql(updated),
        })

    # FreeVideoSource rows for the same sources (keep both tables consistent)
    src_payload = []
    for row in rows:
        s = srcs.get(row[1])
        if s:
            src_payload.append({
                "id": s[0] or str(uuid.uuid4()),
                "product": s[1] or "Own",
                "title": s[2] or row[3],
                "titleBn": s[3] or row[3],
                "url": s[4],
                "localPath": s[5],
                "createdAt": dt_sql(s[6]),
            })

    pf = "/tmp/seo-turso-payload.json"
    with open(pf, "w", encoding="utf-8") as f:
        json.dump({"seo": payload, "src": src_payload, "onlySlug": only_slug},
                  f, ensure_ascii=False)

    url, token = turso_env()
    req = os.path.join(REPO, "node_modules", "@libsql", "client")
    js = (
        f"const c = require({json.dumps(req)});"
        f"const db = c.createClient({{ url: {json.dumps(url)}, authToken: {json.dumps(token)} }});"
        + "(async () => {" + JS_TEMPLATE.replace("__PAYLOAD__", json.dumps(pf))
        + "})().catch(e => { console.error('JSERR:', e.message); process.exit(1); });"
    )
    r = subprocess.run(["/usr/bin/env", "node", "-e", js],
                       capture_output=True, text=True, timeout=180)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.returncode != 0:
        print("TURSO ERR:", r.stderr[:500])
    sys.exit(0 if r.returncode == 0 else 1)


if __name__ == "__main__":
    main()
