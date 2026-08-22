"""Open-source video ingestion for Hostamar TV — BUSINESS/FASHION/ECOMMERCE focus.

Hostamar is an AI marketing-video maker for Bangladeshi SMEs (Aarong/Sailor/
Daraz sellers), so TV content follows: SME marketing, e-commerce, fashion
business, product photography, retail, sales — NOT NASA space content.

Sources (all legal to rebroadcast with a Bangla dub):
  - PRELINGER via archive.org advancedsearch (public domain) — business,
    advertising, retail, fashion educational films. No API key needed.
  - IA-EDU via archive.org (public domain/CC) — broader educational films.
  - PEXELS videos API (CC0-like Pexels license) — needs PEXELS_API_KEY.
  - PIXABAY videos API (Pixabay Content License) — needs PIXABAY_API_KEY.

Queries rotate deterministically by day-of-year + hour so every run tries
fresh search terms.
"""
import json, os, re, sys, time, urllib.request, urllib.parse

UA = {"User-Agent": "HostamarTV/2.0 (Bangla business education channel; contact: romel@hostamar.com)"}
MAX_BYTES = 220 * 1024 * 1024  # skip sources over 220MB

# Hostamar-service keywords (SME marketing / ecommerce / fashion / product)
BUSINESS_QUERIES = [
    "small business", "marketing", "advertising", "retail store",
    "fashion", "shopping", "sales", "customer service",
    "product demonstration", "commerce trade",
]

PEXELS_QUERIES = [
    "small business marketing", "ecommerce product", "fashion model",
    "product photography", "clothing store", "boutique shop",
    "online shopping delivery", "tailor sewing",
]

PIXABAY_QUERIES = [
    "business", "marketing", "fashion", "shopping",
    "office work", "sewing tailoring",
]


def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _rotation(seq, salt=""):
    """Deterministic rotation by day+hour so each run tries fresh queries."""
    lt = time.localtime()
    idx = (lt.tm_yday * 4 + lt.tm_hour // 2 + len(salt)) % len(seq)
    return seq[idx]


def _ia_file_url(ident, name):
    return f"https://archive.org/download/{ident}/{urllib.parse.quote(name)}"


def _ia_pick_mp4(meta):
    """Pick smallest playable mp4 under MAX_BYTES from archive.org metadata."""
    files = [f for f in meta.get("files", [])
             if str(f.get("name", "")).lower().endswith((".mp4", ".ogv"))]
    if not files:
        return None
    def size(f):
        try: return int(f.get("size", 0) or 0)
        except Exception: return 0
    files.sort(key=size)
    f = files[0]
    if size(f) > MAX_BYTES or size(f) == 0:
        return None
    return f


# ------------------------------------------------------------- archive.org --

def search_prelinger(query=None, rows=10):
    """Public-domain business/advertising/retail films (Prelinger Archives)."""
    q = query or _rotation(BUSINESS_QUERIES, "prelinger")
    adv = (f"collection:(prelinger) AND (title:({q}) OR description:({q}))")
    url = ("https://archive.org/advancedsearch.php?q=" + urllib.parse.quote(adv) +
           "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year"
           f"&rows={rows}&page=1&output=json&sort%5B%5D=downloads+desc")
    out = []
    for doc in get_json(url).get("response", {}).get("docs", []):
        ident = doc.get("identifier")
        if not ident:
            continue
        try:
            meta = get_json(f"https://archive.org/metadata/{ident}")
            f = _ia_pick_mp4(meta)
            if not f:
                continue
            year = doc.get("year") or ""
            title = str(doc.get("title") or ident)[:120]
            out.append({
                "id": f"prelinger-{ident}", "source": "PRELINGER", "external_id": ident,
                "title": title, "description": "",
                "download_url": _ia_file_url(ident, f["name"]),
                "license": "Public Domain (Prelinger Archives)",
                "licenseUrl": "https://archive.org/details/prelinger",
            })
        except Exception:
            continue
    return out


def search_ia_educational(query=None, rows=8):
    """CC-licensed educational business films on archive.org (subject-driven)."""
    q = query or _rotation(BUSINESS_QUERIES, "iaedu")
    adv = ('mediatype:(movies) AND licenseurl:*creativecommons* AND '
           f'(subject:({q}) OR title:({q}))')
    url = ("https://archive.org/advancedsearch.php?q=" + urllib.parse.quote(adv) +
           "&fl%5B%5D=identifier&fl%5B%5D=title"
           f"&rows={rows}&page=1&output=json&sort%5B%5D=downloads+desc")
    out = []
    try:
        docs = get_json(url).get("response", {}).get("docs", [])
    except Exception:
        return out
    for doc in docs:
        ident = doc.get("identifier")
        if not ident:
            continue
        try:
            meta = get_json(f"https://archive.org/metadata/{ident}")
            f = _ia_pick_mp4(meta)
            if not f:
                continue
            md = meta.get("metadata", {}) or {}
            license_url = md.get("licenseurl") or ""
            if isinstance(license_url, list):
                license_url = license_url[0] if license_url else ""
            # skip long podcasts/streams — keep it TV-sized (handled again later)
            out.append({
                "id": f"iaedu-{ident}", "source": "IA-EDU", "external_id": ident,
                "title": str(doc.get("title") or ident)[:120], "description": "",
                "download_url": _ia_file_url(ident, f["name"]),
                "license": ("Creative Commons (Internet Archive)" if license_url.startswith("http")
                            else "See item page (Internet Archive)"),
                "licenseUrl": license_url or f"https://archive.org/details/{ident}",
            })
        except Exception:
            continue
    return out


# ----------------------------------------------------------------- pexels ---

def search_pexels(query=None, per_page=15):
    key = os.environ.get("PEXELS_API_KEY", "")
    if not key:
        print("pexels: no PEXELS_API_KEY set, skipping", file=sys.stderr)
        return []
    q = query or _rotation(PEXELS_QUERIES, "pexels")
    url = (f"https://api.pexels.com/videos/search?query={urllib.parse.quote(q)}"
           f"&per_page={per_page}&orientation=landscape&size=medium")
    req = urllib.request.Request(url, headers={**UA, "Authorization": key})
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
    except Exception as e:
        print(f"pexels search failed: {e}", file=sys.stderr)
        return []
    out = []
    for v in data.get("videos", []):
        vid = v.get("id")
        dur = v.get("duration") or 0
        # pick an SD-ish file ~720p for bandwidth
        files = [f for f in v.get("video_files", []) if f.get("width") and 960 <= f["width"] <= 1920]
        files.sort(key=lambda f: abs((f.get("width") or 0) - 1280))
        if not vid or not files:
            continue
        out.append({
            "id": f"pexels-{vid}", "source": "PEXELS", "external_id": str(vid),
            "title": (q.title() + " — stock footage #" + str(vid))[:120],
            "description": (v.get("url") or ""),
            "download_url": files[0]["link"],
            "license": "Pexels License (free to use)",
            "licenseUrl": "https://www.pexels.com/license/",
        })
    return out


# ---------------------------------------------------------------- pixabay ---

def search_pixabay(query=None, per_page=20):
    key = os.environ.get("PIXABAY_API_KEY", "")
    if not key:
        print("pixabay: no PIXABAY_API_KEY set, skipping", file=sys.stderr)
        return []
    q = query or _rotation(PIXABAY_QUERIES, "pixabay")
    url = (f"https://pixabay.com/api/videos/?key={key}&q={urllib.parse.quote(q)}"
           f"&per_page={per_page}")
    try:
        data = get_json(url)
    except Exception as e:
        print(f"pixabay search failed: {e}", file=sys.stderr)
        return []
    out = []
    for v in data.get("hits", []):
        vid = v.get("id")
        vids = v.get("videos", {})
        # pick SD 960 (or smallest >=960w) for bandwidth
        cand = [("large", vids.get("large")), ("medium", vids.get("medium")), ("small", vids.get("small"))]
        cand = [(n, f) for n, f in cand if f and int(f.get("width", 0) or 0) >= 960] or \
               [(n, f) for n, f in cand if f]
        if not vid or not cand:
            continue
        out.append({
            "id": f"pixabay-{vid}", "source": "PIXABAY", "external_id": str(vid),
            "title": (v.get("user") and (str(v.get("user")).title() + " — stock footage #" + str(vid)) or f"Stock footage #{vid}")[:120],
            "description": "",
            "download_url": cand[0][1]["url"],
            "duration": int(v.get("duration", 0) or 0),
            "license": "Pixabay Content License",
            "licenseUrl": "https://pixabay.com/service/license-summary/",
        })
    return out


# ------------------------------------------------------------------ fetch ---

def fetch_candidates(per_source=6, sources=None):
    """Rotate business queries deterministically; aggregate all sources."""
    want = {s.upper() for s in (sources or [])} if sources else None
    cand = []

    def wanted(name):
        return want is None or name in want

    if wanted("PRELINGER"):
        try: cand += search_prelinger(rows=per_source + 4)[:per_source]
        except Exception as e: print(f"prelinger failed: {e}", file=sys.stderr)
    if wanted("IA-EDU"):
        try: cand += search_ia_educational(rows=per_source + 3)[:per_source - 2]
        except Exception as e: print(f"ia-edu failed: {e}", file=sys.stderr)
    if wanted("PEXELS"):
        cand += search_pexels(per_page=per_source + 6)[:per_source]
    if wanted("PIXABAY"):
        cand += search_pixabay(per_page=per_source + 8)[:per_source]
    # dedupe by id
    seen, out = set(), []
    for c in cand:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        out.append(c)
    return out


def quote_download(url):
    return urllib.parse.quote(url, safe=":/?&=%~+#[]@")


def download(item, dest_path):
    req = urllib.request.Request(quote_download(item["download_url"]), headers=UA)
    total = 0
    with urllib.request.urlopen(req, timeout=180) as r, open(dest_path, "wb") as f:
        while True:
            chunk = r.read(1024 * 512)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_BYTES:
                f.close()
                os.remove(dest_path)
                raise RuntimeError("too large")
            f.write(chunk)
    return total


if __name__ == "__main__":
    print(json.dumps(fetch_candidates(), ensure_ascii=False, indent=1)[:3000])
