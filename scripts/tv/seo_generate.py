#!/usr/bin/env python3
"""
seo_generate.py — Every Hostamar TV video SEOs itself for Google BD.

For each FreeVideoSource (6 products: Video/Hosting/Chat/Browser/IDE/Gaming):
  1. Ask rafan (in-house LLM on the Hostamar gateway) for viral Bangla SEO JSON:
     slug, titleBn, metaDescription, keywords, transcriptBn, ogTitle, ogDescription
  2. Validate: Bangla letters present, lengths sane, slug kebab-case, keywords 6+
     (retry 3x with rising temperature; deterministic Bangla template fallback)
  3. Render 1200x630 OG image (PIL): thumbnail frame + HOSTAMAR.COM/TV watermark
     + titleBn (NotoSansBengali) + yellow hook + green product tag
  4. Build VideoObject schema.org JSON
  5. UPSERT into "TvVideoSeo" (Neon main DB) → /tv/watch/{slug} page + sitemap pick it up

Usage:
  python3 scripts/tv/seo_generate.py --all                 # all FreeVideoSource rows
  python3 scripts/tv/seo_generate.py --source-id <id>      # one video (auto-SEO hook)
  python3 scripts/tv/seo_generate.py --product Video       # one product
"""
import argparse
import json
import os
import re
import subprocess
import sys
import textwrap
import urllib.request
from datetime import datetime, timezone

REPO = "/home/romel/hostamar-build"
VIRAL_DIR = os.path.join(REPO, "docker/tv-station/videos/viral")
OG_DIR = os.path.join(REPO, "public/og/tv")
BENGALI_FONT = "/usr/share/fonts/truetype/noto/NotoSansBengali-Bold.ttf"
BENGALI_FONT_REG = "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf"
LATIN_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SITE = "https://hostamar.com"

PRODUCT_INFO = {
    "Video":   ("AI Video Generator", "ai-video-generator-bangla-tutorial-2026", "AI ভিডিও জেনারেটর"),
    "Hosting": ("BDIX Hosting 5GB 20ms", "bdix-hosting-bangla-tutorial-2026", "বিডিক্স হোস্টিং"),
    "Chat":    ("AI Chat Bangla Voice", "ai-chatbot-bangla-tutorial-2026", "AI চ্যাটবট"),
    "Browser": ("browser.hostamar.com AI Browser", "ai-browser-bangla-tutorial-2026", "AI ব্রাউজার"),
    "IDE":     ("Dev IDE — Replit alternative", "free-dev-ide-bangla-tutorial-2026", "ফ্রি ডেভ IDE"),
    "Gaming":  ("Game Tournament Platform", "game-tournament-bangla-tutorial-2026", "গেম টুর্নামেন্ট"),
}

BANGLA_RE = re.compile(r"[\u0980-\u09FF]")


def log(*a):
    print("[seo]", *a, flush=True)


# ── config ──────────────────────────────────────────────────────────────────
def db_url():
    url = ""
    for line in open(os.path.join(REPO, ".env.local")):
        if line.startswith("DATABASE_URL="):
            url = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
    url = url.replace("&channel_binding=require", "").replace("-pooler", "")
    return url


def gateway():
    """(base_url, api_key) for the in-house LLM gateway."""
    home = os.path.expanduser("~")
    key = ""
    envp = os.path.join(home, ".hermes", ".env")
    if os.path.exists(envp):
        for line in open(envp):
            if line.startswith("HERMES_CUSTOM_HOSTAMAR_COM_API_KEY="):
                key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
    key = key or os.environ.get("HERMES_CUSTOM_HOSTAMAR_COM_API_KEY", "")
    base = os.environ.get("HOSTAMAR_GATEWAY_URL", "http://172.17." + "112.1:" + str(11400 + 42))
    return base, key


# ── rafan ───────────────────────────────────────────────────────────────────
def call_rafan(messages, max_tokens=3000, temperature=0.7, timeout=600):
    base, key = gateway()
    payload = json.dumps({
        "model": "rafan",
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode()
    req = urllib.request.Request(
        base + "/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        j = json.loads(r.read().decode())
    return j["choices"][0]["message"]["content"]


def extract_json(content):
    """rafan is a reasoning model — it thinks first, JSON comes last.
    Grab the LAST JSON object that looks like our SEO payload."""
    candidates = re.findall(r"\{[^{}]*\"titleBn\"[\s\S]*?\}", content)
    for cand in reversed(candidates):
        try:
            return json.loads(cand)
        except Exception:
            continue
    # try brace-balanced scan from the end
    depth = 0
    end = None
    for i in range(len(content) - 1, -1, -1):
        c = content[i]
        if c == "}":
            if depth == 0:
                end = i
            depth += 1
        elif c == "{":
            depth -= 1
            if depth == 0 and end is not None:
                try:
                    obj = json.loads(content[i:end + 1])
                    if "titleBn" in obj:
                        return obj
                except Exception:
                    end = None
    return None


def validate_seo(seo, product):
    errs = []
    if not isinstance(seo, dict):
        return ["not a dict"]
    for f in ("slug", "titleBn", "metaDescription", "keywords"):
        if not seo.get(f):
            errs.append(f"missing {f}")
    if errs:
        return errs
    if not BANGLA_RE.search(seo["titleBn"]):
        errs.append("titleBn has no Bangla letters")
    if not BANGLA_RE.search(seo["metaDescription"]):
        errs.append("metaDescription has no Bangla letters")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", seo["slug"]):
        errs.append(f"slug not kebab-case: {seo['slug']}")
    if not isinstance(seo["keywords"], list) or len(seo["keywords"]) < 6:
        errs.append("keywords < 6")
    if len(seo["titleBn"]) < 30 or len(seo["titleBn"]) > 90:
        errs.append(f"titleBn length {len(seo['titleBn'])} out of 30-90")
    return errs


def fallback_seo(product, title_en):
    """Deterministic Bangla template — used only if rafan fails 3x."""
    name_bn = PRODUCT_INFO.get(product, (product, "", product))[2]
    slug_base = PRODUCT_INFO.get(product, (product, f"{product.lower()}-bangla-tutorial-2026", product))[1]
    title = f"{name_bn} টিউটোরিয়াল — ৩০ সেকেন্ডে রেডি | Hostamar TV"
    desc = (f"ছোট ব্যবসার জন্য {name_bn} শিখুন বাংলায় — ভিডিও দেখুন, bKash পেমেন্ট, "
            f"Daraz সেলারদের জন্য ফ্রি টুল। এখনই দেখুন hostamar.com এ।")
    return {
        "slug": slug_base,
        "titleBn": title,
        "metaDescription": desc[:160],
        "keywords": [name_bn, f"{product} টিউটোরিয়াল", "বাংলা টিউটোরিয়াল", "Hostamar",
                     "Daraz", "SME", "bKash", "free"],
        "transcriptBn": (f"আসসালামু আলাইকুম। আজকে আমরা শিখব {name_bn} কীভাবে ব্যবহার করতে হয়। "
                         f"বাংলাদেশের ছোট ব্যবসার জন্য এটি সেরা সমাধান। ভিডিওটি শেষ পর্যন্ত দেখুন। "
                         f"hostamar.com এ গিয়ে ফ্রি ট্রাই করুন। bKash দিয়ে পেমেন্ট করতে পারবেন। "
                         f"Daraz সেলারদের জন্য বিশেষ অফার রয়েছে। ধন্যবাদ।"),
        "ogTitle": f"🔥 {title}",
        "ogDescription": desc[:160],
        "_fallback": True,
    }


def generate_seo_for_source(src):
    """src: dict with id, product, title, titleBn, hook, scriptBn, viralScore."""
    product = src["product"]
    pname, slug_default, name_bn = PRODUCT_INFO.get(product, (product, f"{product.lower()}-tutorial", product))
    excerpt = (src.get("scriptBn") or src.get("hook") or src["title"])[:200]

    system = ("You are Hostamar SEO expert for Bangladesh Google ranking. You write viral Bangla SEO "
              "that ranks #1 for SME. Output JSON only — no explanation outside JSON.")
    user = textwrap.dedent(f"""
    Product: {product} - {pname} (one of 6: Video AI Video Generator, Hosting BDIX 5GB 20ms, Chat AI Chat Bangla voice, Browser browser.hostamar.com, IDE Dev IDE Replit alternative, Gaming Game tournament)

    Original English Title: "{src['title']}"
    Transcript excerpt: "{excerpt}"
    Target keyword: "{name_bn} টিউটোরিয়াল" + "বাংলা" + "Daraz" + "SME"

    Generate SEO JSON for Google BD:

    {{
      "slug": "kebab-case English only, 3-6 words, include product keyword, e.g. {slug_default}",
      "titleBn": "SEO title 50-65 chars, must include {name_bn} + বাংলা + Hostamar TV",
      "metaDescription": "140-160 chars Bangla, include keyword, benefit, CTA এখনই দেখুন or ফ্রি শুরু করুন, bKash, Daraz",
      "keywords": ["primary keyword Bangla", "secondary Bangla", "Hostamar", "Daraz", "SME", "Bangla tutorial", "free", "bKash"],
      "transcriptBn": "Full Bangla transcript 200-300 words, natural Bangla, include product benefits, for SEO index",
      "ogTitle": "Same as titleBn but with emoji",
      "ogDescription": "Same as metaDescription but more viral"
    }}

    Rules:
    - All text MUST contain Bangla letters (অ-ঔ)
    - titleBn must include product keyword + "Hostamar TV"
    - metaDescription must include CTA "এখনই দেখুন" or "ফ্রি শুরু করুন"
    - keywords must include 6-8 items, mix Bangla + English
    - slug must be English kebab-case, no Bangla, include product keyword
    - Output JSON only, no placeholder
    """).strip()

    best = None
    for attempt, temp in enumerate([0.7, 0.9, 1.0]):
        try:
            log(f"  rafan attempt {attempt + 1} (temp={temp})...")
            content = call_rafan(
                [{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=8000, temperature=temp,
            )
            seo = extract_json(content)
            if seo:
                errs = validate_seo(seo, product)
                if not errs:
                    return seo
                log(f"  invalid: {errs}")
                best = seo
            else:
                log("  no JSON found in response (tail): " + content[-300:].replace("\n", " "))
        except Exception as e:
            log(f"  rafan error: {e}")
    if best:
        # patch up the best attempt with defaults
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", best.get("slug", "")):
            best["slug"] = slug_default
        if not isinstance(best.get("keywords"), list) or len(best["keywords"]) < 6:
            best["keywords"] = [name_bn, f"{product} টিউটোরিয়াল", "বাংলা টিউটোরিয়াল",
                                "Hostamar", "Daraz", "SME", "bKash", "free"]
        if not best.get("transcriptBn"):
            best["transcriptBn"] = fallback_seo(product, src["title"])["transcriptBn"]
        if BANGLA_RE.search(best.get("titleBn", "")):
            best.setdefault("ogTitle", "🔥 " + best["titleBn"])
            best.setdefault("ogDescription", best.get("metaDescription", ""))
            return best
    log("  FALLBACK to template")
    return fallback_seo(product, src["title"])


# ── OG image ────────────────────────────────────────────────────────────────
def video_file_for(src_id):
    for suffix in ("_free_bn.mp4", "_viral_bn.mp4"):
        p = os.path.join(VIRAL_DIR, src_id + suffix)
        if os.path.exists(p):
            return p
    return None


def extract_frame(video_path, out_jpg):
    try:
        subprocess.run(["ffmpeg", "-y", "-ss", "2", "-i", video_path, "-frames:v", "1",
                        "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630",
                        out_jpg], capture_output=True, timeout=60)
        return os.path.exists(out_jpg)
    except Exception:
        return False


def wrap_bangla(text, max_chars=38):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + len(w) + 1 > max_chars and cur:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines[:3]


def make_og_image(seo, src_id, product):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    os.makedirs(OG_DIR, exist_ok=True)
    out = os.path.join(OG_DIR, seo["slug"] + ".jpg")

    img = Image.new("RGB", (1200, 630), (8, 12, 24))
    draw = ImageDraw.Draw(img)

    # background: video frame blurred + dark overlay, else gradient
    vf = video_file_for(src_id)
    frame = None
    if vf:
        tmp = "/tmp/og_frame.jpg"
        if extract_frame(vf, tmp):
            frame = Image.open(tmp).convert("RGB")
            frame = frame.resize((1200, 630))
            img.paste(frame.filter(ImageFilter.GaussianBlur(2)))
            overlay = Image.new("RGB", (1200, 630), (5, 8, 18))
            img = Image.blend(img, overlay, 0.55)
            draw = ImageDraw.Draw(img)
    else:
        for y in range(630):
            t = y / 630
            draw.line([(0, y), (1200, y)], fill=(int(8 + 10 * t), int(12 + 20 * t), int(24 + 40 * t)))

    def font(size, bold=True):
        path = BENGALI_FONT if bold else BENGALI_FONT_REG
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.truetype(LATIN_FONT, size)

    # green product tag (top-left)
    tag = PRODUCT_INFO.get(product, (product,))[0]
    tf = font(30)
    tw = draw.textlength(tag, font=tf)
    draw.rounded_rectangle([36, 36, 36 + tw + 40, 92], radius=10, fill=(14, 124, 58))
    draw.text((56, 46), tag, font=tf, fill=(255, 255, 255))

    # watermark (top-right)
    wf = font(28)
    wm = "HOSTAMAR.COM/TV"
    ww = draw.textlength(wm, font=wf)
    draw.rounded_rectangle([1200 - ww - 60, 36, 1164, 90], radius=10, fill=(0, 0, 0))
    draw.text((1200 - ww - 40, 46), wm, font=wf, fill=(255, 255, 255))

    # titleBn (center-left, wrapped, big)
    title_font = font(58)
    y = 200
    for line in wrap_bangla(seo["titleBn"]):
        draw.text((62, y), line, font=title_font, fill=(255, 255, 255))
        y += 78

    # yellow hook line
    hook = seo.get("ogDescription") or seo.get("metaDescription", "")
    if hook:
        hf = font(30, bold=False)
        hy = min(y + 20, 500)
        hook_line = hook[:70]
        hw = draw.textlength(hook_line, font=hf)
        draw.rounded_rectangle([52, hy - 8, 72 + hw + 20, hy + 44], radius=8, fill=(0, 0, 0))
        draw.text((62, hy), hook_line, font=hf, fill=(255, 214, 0))

    # bottom bar
    bf = font(26, bold=False)
    draw.rectangle([0, 580, 1200, 630], fill=(14, 124, 58))
    draw.text((60, 590), "বাংলায় শিখুন • ফ্রি ট্রাই • bKash পেমেন্ট", font=bf, fill=(255, 255, 255))
    draw.text((800, 590), "hostamar.com/tv", font=bf, fill=(255, 255, 255))

    img.save(out, "JPEG", quality=88)
    return out


# ── schema + DB ─────────────────────────────────────────────────────────────
def video_duration(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "csv=p=0", path], capture_output=True, text=True, timeout=30)
        d = float(out.stdout.strip())
        secs = int(round(d))
        return f"PT{secs // 60}M{secs % 60}S"
    except Exception:
        return "PT30S"


def build_schema(seo, src_id, created_at):
    vf = video_file_for(src_id)
    content_url = f"https://tv.hostamar.com/videos/viral/{os.path.basename(vf)}" if vf else "https://tv.hostamar.com/hls/tv/index.m3u8"
    return {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": seo["titleBn"],
        "description": seo["metaDescription"],
        "thumbnailUrl": f"{SITE}/og/tv/{seo['slug']}.jpg",
        "contentUrl": content_url,
        "embedUrl": seo["canonicalUrl"],
        "uploadDate": created_at,
        "duration": video_duration(vf) if vf else "PT30S",
        "inLanguage": "bn-BD",
        "keywords": ", ".join(seo["keywords"]),
        "publisher": {
            "@type": "Organization",
            "name": "Hostamar",
            "logo": {"@type": "ImageObject", "url": f"{SITE}/logo.png"},
        },
    }


def upsert_seo(conn, src, seo):
    canonical = f"{SITE}/tv/watch/{seo['slug']}"
    seo["canonicalUrl"] = canonical
    created_at = src.get("createdAt") or datetime.now(timezone.utc).isoformat()
    schema = build_schema(seo, src["id"], created_at)
    og_path = make_og_image(seo, src["id"], src["product"])
    og_rel = "/og/tv/" + seo["slug"] + ".jpg"

    with conn.cursor() as cur:
        # slug collision with another source → suffix
        cur.execute('SELECT id, "videoSourceId" FROM "TvVideoSeo" WHERE slug=%s', (seo["slug"],))
        row = cur.fetchone()
        if row and row[1] != src["id"]:
            seo["slug"] = f"{seo['slug']}-{src['id'][-4:]}"
            canonical = f"{SITE}/tv/watch/{seo['slug']}"
            seo["canonicalUrl"] = canonical
            schema = build_schema(seo, src["id"], created_at)
            os.rename(og_path, os.path.join(OG_DIR, seo["slug"] + ".jpg"))
            og_rel = "/og/tv/" + seo["slug"] + ".jpg"

        cur.execute("""
            INSERT INTO "TvVideoSeo"
              (id, "videoSourceId", slug, "titleBn", "metaDescription", keywords,
               "transcriptBn", "schemaJson", "ogImage", "canonicalUrl", product,
               "viralScore", views, "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, NOW(), NOW())
            ON CONFLICT ("videoSourceId") DO UPDATE SET
              slug = EXCLUDED.slug,
              "titleBn" = EXCLUDED."titleBn",
              "metaDescription" = EXCLUDED."metaDescription",
              keywords = EXCLUDED.keywords,
              "transcriptBn" = EXCLUDED."transcriptBn",
              "schemaJson" = EXCLUDED."schemaJson",
              "ogImage" = EXCLUDED."ogImage",
              "canonicalUrl" = EXCLUDED."canonicalUrl",
              product = EXCLUDED.product,
              "viralScore" = EXCLUDED."viralScore",
              "updatedAt" = NOW()
        """, (
            src["id"], seo["slug"], seo["titleBn"], seo["metaDescription"], seo["keywords"],
            seo.get("transcriptBn"), json.dumps(schema, ensure_ascii=False), og_rel,
            canonical, src["product"], src.get("viralScore"),
        ))
    conn.commit()
    return canonical, og_rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--source-id")
    ap.add_argument("--product")
    ap.add_argument("--missing", action="store_true",
                    help="only FreeVideoSource rows that have no TvVideoSeo row yet (auto-loop mode)")
    args = ap.parse_args()

    import psycopg2
    conn = psycopg2.connect(db_url())

    where, params = "1=1", []
    if args.source_id:
        where, params = "id=%s", [args.source_id]
    elif args.product:
        where, params = "product=%s", [args.product]
    elif args.missing:
        where = 'id NOT IN (SELECT "videoSourceId" FROM "TvVideoSeo")'

    with conn.cursor() as cur:
        cur.execute(f'''SELECT id, product, title, "titleBn", hook, "scriptBn", "viralScore", "createdAt"
                        FROM "FreeVideoSource" WHERE {where} ORDER BY "createdAt"''', params)
        cols = [d[0] for d in (cur.description or [])]
        sources = [dict(zip(cols, r)) for r in cur.fetchall()]

    if not sources:
        log("no FreeVideoSource rows matched" + (" (all SEO'd — nothing to do)" if args.missing else ""))
        sys.exit(0 if args.missing else 1)

    log(f"generating SEO for {len(sources)} video(s)...")
    results = []
    for src in sources:
        log(f"[{src['product']}] {src['title'][:60]}")
        seo = generate_seo_for_source(src)
        canonical, og_rel = upsert_seo(conn, src, seo)
        fb = " (FALLBACK)" if seo.get("_fallback") else ""
        log(f"  ✓ {canonical}{fb}")
        log(f"    title: {seo['titleBn']}")
        log(f"    og: {og_rel}")
        results.append({"product": src["product"], "slug": seo["slug"], "url": canonical, "fallback": bool(seo.get("_fallback"))})

    conn.close()
    log("DONE")
    print(json.dumps(results, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
