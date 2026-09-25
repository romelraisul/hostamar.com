#!/usr/bin/env python3
"""
seo_ensure_shelf.py — SEO for EVERY video on our own shelf.

The gap: seo_generate.py keys off FreeVideoSource rows, which are the retired
hunter lineage (83 viral titles). Our own 50+ renders (receipt-*, programme-*,
code-to-screen...) had 3 of 85 SEO rows — no watch page, no sitemap entry, no
OG image for our own content.

This closes it at the root: for every public/tv/*.mp4, ensure a FreeVideoSource
row + TvVideoSeo row (watch page + sitemap + OG + VideoObject), reusing
seo_generate's validated template path, OG renderer, schema builder and upsert.
No new SEO logic lives here — only coverage.

Skipped: new copy. Titles come from the curated /tv page cards; descriptions
are assembled from the same CTA boilerplate the template path uses.

ponytail: third-party patterns (cc0_/clean_cc0_/cmt[0-9]) are NEVER given SEO
rows — same guard as the shelf and the safety audit. Retired footage must not
gain watch pages.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seo_generate as G

THIRD_PARTY = re.compile(r"^(cc0_|clean_cc0_|cmt[0-9])")
CARD_RE = re.compile(r"\{\s*f:\s*'([^']+\.mp4)'\s*,\s*t:\s*'([^']+)'")
BANGLA_RE = re.compile(r"[\u0980-\u09FF]")


def page_cards():
    """filename -> curated card title from app/tv/page.tsx."""
    cards = {}
    page = os.path.join(os.path.dirname(G.REPO), "hostamar.com", "app/tv/page.tsx")
    for line in open(page, encoding="utf-8"):
        m = CARD_RE.search(line)
        if m:
            cards[m.group(1)] = m.group(2)
    return cards


def title_bn_for(filename, card):
    """A validate_seo-passing Bangla title: card first, filename fallback."""
    base = (card or os.path.splitext(filename)[0].replace("-", " ").replace("_", " ")).strip()
    if not BANGLA_RE.search(base):
        base = f"{base} — বাংলায় | Hostamar TV"
    if len(base) < 30:
        base = f"{base} — Hostamar TV-তে দেখুন"
    if len(base) > 90:
        base = base[:87] + "…"
    return base


def seo_for_own(filename, card, local_path):
    title_bn = title_bn_for(filename, card)
    slug = os.path.splitext(filename)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    words = [w for w in re.split(r"\s+", card or filename.replace("-", " ")) if len(w) > 2]
    keywords = (words[:5] + ["Hostamar", "Hostamar TV", "বাংলা", "hostamar.com"])[:10]
    while len(keywords) < 6:
        keywords.append("ভিডিও")
    desc = (f"{title_bn} — Hostamar TV-তে দেখুন। নতুন ভিডিও প্রতিদিন, "
            f"সম্পূর্ণ ফ্রি। এখনই দেখুন hostamar.com/tv এ।")
    if len(desc) > 160:
        desc = desc[:157] + "…"
    return {
        "slug": slug,
        "titleBn": title_bn,
        "metaDescription": desc,
        "keywords": keywords,
        "ogTitle": "📺 " + title_bn[:60],
        "ogDescription": desc,
        "transcriptBn": None,  # filled below from the deterministic builder
    }


def ensure_file(conn, filename, card, dry=False):
    """Returns (slug, action) — action in {exists, created}."""
    import psycopg2
    stem = os.path.splitext(filename)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    with conn.cursor() as cur:
        cur.execute('SELECT slug FROM "TvVideoSeo" WHERE slug=%s', (slug,))
        if cur.fetchone():
            return slug, "exists"
        cur.execute("SELECT id FROM \"FreeVideoSource\" WHERE \"localPath\"=%s",
                    (f"public/tv/{filename}",))
        row = cur.fetchone()
        if row:
            src_id = row[0]
        else:
            if dry:
                return slug, "would-create"
            cur.execute("""INSERT INTO "FreeVideoSource"
                (id, product, title, "titleBn", url, "localPath", "createdAt")
                VALUES (gen_random_uuid()::text, 'Own', %s, %s, %s, %s, NOW())
                RETURNING id""",
                (card or stem, card or stem, f"https://hostamar.com/tv/{filename}",
                 f"public/tv/{filename}"))
            src_id = cur.fetchone()[0]
            conn.commit()
    if dry:
        return slug, "would-create"
    src = {"id": src_id, "product": "Own", "title": card or stem,
           "titleBn": card or stem, "hook": "", "scriptBn": "",
           "viralScore": 0, "createdAt": None,
           "localPath": f"public/tv/{filename}"}
    seo = seo_for_own(filename, card, src["localPath"])
    errs = G.validate_seo({**seo, "transcriptBn": "x"}, "Own")
    assert not errs, f"{filename}: {errs}"
    seo["transcriptBn"] = G.build_transcript(seo, {**src, "product": "Own"})
    canonical, og_rel = G.upsert_seo(conn, src, seo)
    return slug, f"created -> {canonical}"


def main():
    import argparse
    import psycopg2
    ap = argparse.ArgumentParser()
    ap.add_argument("--missing", action="store_true",
                    help="only shelf files with no TvVideoSeo row yet")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cards = page_cards()
    files = sorted(f for f in os.listdir(G.EDGE)
                   if f.endswith(".mp4") and not THIRD_PARTY.match(f))
    conn = psycopg2.connect(G.db_url())
    created = existed = 0
    for fn in files:
        slug, action = ensure_file(conn, fn, cards.get(fn), dry=args.dry_run)
        if args.missing and action == "exists":
            continue
        print(f"  [{action}] {fn} -> /tv/watch/{slug}")
        created += action != "exists"
        existed += action == "exists"
    conn.close()
    print(f"DONE shelf={len(files)} existed={existed} created={created}")


if __name__ == "__main__":
    main()
