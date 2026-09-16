#!/usr/bin/env python3
"""tv-seo-publish-edge.py — publish ONE own render to the edge shelf with SEO."""
import json, os, sys, uuid
from datetime import datetime, timezone

REPO = "/home/romel/hostamar-build"
SITE = "https://hostamar.com"


def log(*a):
    print("[seo]", *a, flush=True)


def main():
    slug, edge_file, product, title_bn, desc_bn = sys.argv[1:6]
    edge_url = f"{SITE}/tv/{edge_file}"
    canonical = f"{SITE}/tv/watch/{slug}"
    now = datetime.now(timezone.utc).isoformat()
    og_rel = f"/og/tv/{slug}.jpg"
    og_path = os.path.join(REPO, "public", og_rel.lstrip("/"))

    # 1) OG image
    try:
        from PIL import Image, ImageDraw, ImageFont
        os.makedirs(os.path.dirname(og_path), exist_ok=True)
        img = Image.new("RGB", (1200, 630), (7, 10, 8))
        d = ImageDraw.Draw(img)
        d.ellipse([10, 10, 120, 120], fill=(14, 124, 58))
        fb = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSansBengali-Bold.ttf", 64)
        ft = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSansBengali-Bold.ttf", 38)
        fr = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf", 28)
        d.text((140, 40), "HOSTAMAR TV", font=fb, fill=(255, 255, 255))
        d.text((140, 118), title_bn, font=ft, fill=(240, 244, 250))
        d.text((140, 178), "hostamar.com/tv", font=fr, fill=(180, 200, 160))
        d.rectangle([0, 560, 1200, 630], fill=(14, 124, 58))
        d.text((30, 578), f"\u25b6 {product}", font=fr, fill=(255, 255, 255))
        img.save(og_path, "JPEG", quality=88)
        log("og:", og_path, os.path.getsize(og_path))
    except Exception as e:
        log("og skipped:", e)
        if os.path.exists(og_path) and os.path.getsize(og_path) > 1000:
            log("og reused:", og_path)

    schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title_bn,
        "description": desc_bn,
        "thumbnailUrl": f"{SITE}{og_rel}",
        "contentUrl": edge_url,
        "uploadDate": now,
        "publisher": {"@type": "Organization", "name": "Hostamar", "url": SITE},
    }

    import psycopg2
    from dotenv import load_dotenv
    load_dotenv(os.path.join(REPO, ".env"))
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        'SELECT id FROM "TvVideoSeo" WHERE slug=%s', (slug,))
    row = cur.fetchone()
    if row:
        cur.execute(
            'UPDATE "TvVideoSeo" SET "titleBn"=%s, "metaDescription"=%s, '
            '"schemaJson"=%s::jsonb, "ogImage"=%s, "updatedAt"=NOW() WHERE id=%s',
            (title_bn, desc_bn, json.dumps(schema, ensure_ascii=False), og_rel, row[0]))
        log("updated slug=", slug)
    else:
        cur.execute(
            'INSERT INTO "TvVideoSeo" ("id","videoSourceId",slug,"titleBn",'
            '"metaDescription",keywords,"transcriptBn","schemaJson","ogImage",'
            '"canonicalUrl",product,"createdAt","updatedAt") '
            'VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s,%s)',
            (str(uuid.uuid4()), f"edge::{edge_file}", slug, title_bn, desc_bn,
             [product, "Hostamar TV", "\u09ac\u09be\u0982\u09b2\u09be \u09ad\u09bf\u09a1\u09bf\u0993", edge_file],
             "", json.dumps(schema, ensure_ascii=False), og_rel, canonical, product, now, now))
        log("inserted slug=", slug)
    conn.commit()
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())