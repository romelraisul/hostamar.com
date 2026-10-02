#!/usr/bin/env python3
"""og_regen_all.py — re-render OG thumbnails for existing TvVideoSeo rows with the
current make_og_image (run after a font/layout fix; rows/DB untouched)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seo_generate as G
import psycopg2

conn = psycopg2.connect(G.db_url())
cur = conn.cursor()
cur.execute('SELECT id, slug, product, "titleBn", "metaDescription" FROM "TvVideoSeo" ORDER BY slug')
rows = cur.fetchall()
ok = fail = 0
for src_id, slug, product, title, desc in rows:
    seo = {"slug": slug, "titleBn": title, "ogDescription": desc, "metaDescription": desc}
    try:
        out = G.make_og_image(seo, src_id, product)
        ok += 1
    except Exception as e:
        print(f"  [FAIL] {slug}: {e}", flush=True)
        fail += 1
conn.close()
print(f"DONE ok={ok} fail={fail}")
