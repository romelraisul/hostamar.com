"""Open-source video ingestion: NASA (public domain), Prelinger (public domain), Blender (CC-BY)."""
import json, re, sys, urllib.request, urllib.parse

UA = {"User-Agent": "HostamarTV/1.0 (educational Bangla dubbing; contact: romel@hostamar.com)"}
MAX_BYTES = 220 * 1024 * 1024  # skip sources over 220MB

BLENDER = [
    {"id": "bbb", "source": "BLENDER", "external_id": "BigBuckBunny_124", "title": "Big Buck Bunny", "license": "CC-BY 3.0", "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"},
    {"id": "sintel", "source": "BLENDER", "external_id": "Sintel", "title": "Sintel", "license": "CC-BY 3.0", "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"},
    {"id": "ed", "source": "BLENDER", "external_id": "ElephantsDream", "title": "Elephants Dream", "license": "CC-BY 2.5", "licenseUrl": "https://creativecommons.org/licenses/by/2.5/"},
    {"id": "tos", "source": "BLENDER", "external_id": "TearsOfSteel", "title": "Tears of Steel", "license": "CC-BY 3.0", "licenseUrl": "https://creativecommons.org/licenses/by/3.0/"},
]

NASA_QUERIES = ["earth from space", "mars rover", "james webb telescope", "moon artemis", "sun solar flare"]
PRELINGER_QUERIES = ["farming", "health education", "science classroom", "bangladesh", "rice agriculture"]

def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def search_nasa(query):
    q = urllib.parse.quote(query)
    data = get_json(f"https://images-api.nasa.gov/search?q={q}&media_type=video&year_start=2018")
    out = []
    for item in data.get("collection", {}).get("items", [])[:10]:
        d = (item.get("data") or [{}])[0]
        nid = d.get("nasa_id")
        if not nid:
            continue
        try:
            assets = get_json(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nid)}")
            items = assets.get("collection", {}).get("items", [])
            cands = [i for i in items if i.get("href", "").lower().endswith(".mp4")]
            if not cands:
                continue
            # prefer medium/mobile versions over orig
            def rank(u):
                ul = u.lower()
                return (0 if "mobile" in ul or "medium" in ul else 1, ul)
            url = sorted(cands, key=lambda i: rank(i["href"]))[0]["href"]
            out.append({"id": f"nasa-{nid}", "source": "NASA", "external_id": nid,
                        "title": d.get("title", nid)[:120], "description": (d.get("description") or "")[:800],
                        "download_url": url, "license": "Public Domain (NASA)",
                        "licenseUrl": "https://www.nasa.gov/nasa-brand-center/images-and-media/"})
        except Exception:
            continue
    return out

def search_prelinger(query):
    q = urllib.parse.quote(f"collection:(prelinger) AND title:({query})")
    data = get_json(f"https://archive.org/advancedsearch.php?q={q}&fl%5B%5D=identifier&fl%5B%5D=title&rows=8&page=1&output=json")
    out = []
    for doc in data.get("response", {}).get("docs", []):
        ident = doc.get("identifier")
        if not ident:
            continue
        try:
            meta = get_json(f"https://archive.org/metadata/{ident}")
            files = [f for f in meta.get("files", []) if f.get("name", "").lower().endswith(".mp4")]
            if not files:
                continue
            def size(f):
                try: return int(f.get("size", 0) or 0)
                except: return 0
            small = sorted(files, key=size)[0]
            if size(small) > MAX_BYTES:
                continue
            url = f"https://archive.org/download/{ident}/{urllib.parse.quote(small[name])}"
            out.append({"id": f"prelinger-{ident}", "source": "PRELINGER", "external_id": ident,
                        "title": (doc.get("title") or ident)[:120], "description": "",
                        "download_url": url, "license": "Public Domain (Prelinger Archives)",
                        "licenseUrl": "https://archive.org/details/prelinger"})
        except Exception:
            continue
    return out

def blender_list():
    out = []
    for b in BLENDER:
        try:
            meta = get_json(f"https://archive.org/metadata/{b[external_id]}")
            files = [f for f in meta.get("files", []) if f.get("name", "").lower().endswith(".mp4")]
            if not files:
                continue
            def size(f):
                try: return int(f.get("size", 0) or 0)
                except: return 0
            small = sorted(files, key=size)[0]
            if size(small) > MAX_BYTES:
                continue
            out.append({**b, "id": f"blender-{b[id]}",
                        "description": "Blender Foundation open movie",
                        "download_url": f"https://archive.org/download/{b[external_id]}/{urllib.parse.quote(small[name])}"})
        except Exception:
            continue
    return out

def fetch_candidates(per_source=4):
    """Rotate queries deterministically by day so each run tries fresh content."""
    day = __import__("time").tm_yday if hasattr(__import__("time"), "tm_yday") else 0
    import time as _t
    doy = _t.localtime().tm_yday
    cand = []
    cand += blender_list()
    try: cand += search_nasa(NASA_QUERIES[doy % len(NASA_QUERIES)])[:per_source]
    except Exception as e: print(f"nasa search failed: {e}", file=sys.stderr)
    try: cand += search_prelinger(PRELINGER_QUERIES[doy % len(PRELINGER_QUERIES)])[:per_source]
    except Exception as e: print(f"prelinger search failed: {e}", file=sys.stderr)
    return cand

def quote_download(url):
    import urllib.parse
    return urllib.parse.quote(url, safe=":/?&=%~+#[]")


def download(item, dest_path):
    req = urllib.request.Request(quote_download(item["download_url"]), headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest_path, "wb") as f:
        total = 0
        while True:
            chunk = r.read(1024 * 512)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_BYTES:
                f.close()
                import os; os.remove(dest_path)
                raise RuntimeError("too large")
            f.write(chunk)
    return total

if __name__ == "__main__":
    print(json.dumps(fetch_candidates(), ensure_ascii=False, indent=1)[:3000])
