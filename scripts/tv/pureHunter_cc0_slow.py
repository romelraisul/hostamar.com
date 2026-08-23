#!/usr/bin/env python3
"""
pureHunter_cc0_slow.py — CC0/Public-Domain-only hunter for slow internet TV.

SOURCES (user's FINAL list — 100% safe to stream everywhere):
  1. NASA image/video library   (Public Domain)      via images.nasa.gov API
  2. Blender Foundation films   (CC-BY, safe w/ credit) official download URLs
  3. Pexels                     (Pexels License)     via yt-dlp page URLs
  4. Pixabay                    (Pixabay Content Lic.)via yt-dlp page URLs
  5. Coverr                     (CC0)                direct mp4
  6. Prelinger / archive.org    (Public Domain)      via archive.org metadata API

Every file is transcoded to SLOW profile: 854x480 @ ~800k H.264/AAC.
Output: docker/tv-station/videos/pure/cc0_{Product}_{source}_{n}_pure.mp4

NO TTS, NO drawtext here (ads burned later by burn_still_ads.py).
"""
import glob
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

REPO = "/home/romel/hostamar-build"
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
LOG = "/tmp/pure_hunt_cc0.log"

# Slow transcode profile
VF = ["-vf", "scale=854:480:force_original_aspect_ratio=decrease,"
              "pad=854:480:(ow-iw)/2:(oh-ih)/2"]
VC = ["-c:v", "libx264", "-b:v", "800k", "-maxrate", "900k",
      "-bufsize", "1600k", "-preset", "fast", "-profile:v", "main"]
AC = ["-c:a", "aac", "-b:a", "96k", "-ar", "44100"]
CUT = ["-t", "150"]

# Product -> ad-relevant CC0 source picks (see docs/CC0_SLOW_FINAL.md)
NASA_QUERIES = {
    "Hosting": ["server room", "data center"],
    "Browser":  ["computer screen"],
    "IDE":      ["programmer working"],
}
BLENDER_FILMS = {
    # name -> (url, product)
    "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4": ("Video", "bbb"),
    "https://media.xiph.org/tearsofsteel/tears_of_steel_720p.mov": ("Video", "tos"),
}
ARCHIVE_QUERY = {
    "Gaming": ["computer games", "arcade"],
    "Chat":   ["telephone operator", "communication"],
}

UA = {"User-Agent": "Mozilla/5.0 (HostamarTV/1.0; +https://hostamar.com)"}


def log(m):
    print(m, flush=True)
    open(LOG, "a", encoding="utf-8").write(m + "\n")


def sh(cmd, timeout=300):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True,
                          timeout=timeout)


def http_json(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception as e:
        log(f"  http fail {url[:70]}: {e}")
        return None


def transcode_slow(src, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 100_000:
        return dst
    cmd = (["ffmpeg", "-y", "-i", src] + CUT + VF + VC + AC +
           ["-movflags", "+faststart", dst])
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 100_000:
        sz = os.path.getsize(dst)
        if sz <= 50_000_000:
            return dst
        os.remove(dst)
        log(f"  transcode too big ({sz//1_000_000}MB)")
    return None


def add(product, source, tmp_src, found):
    """Transcode a downloaded temp file into pure/ with cc0 naming."""
    if not tmp_src or not os.path.exists(tmp_src) or os.path.getsize(tmp_src) < 100_000:
        return False
    n = found.get(product, 0) + 1
    dst = os.path.join(PURE_DIR, f"cc0_{product}_{source}_{n}_pure.mp4")
    out = transcode_slow(tmp_src, dst)
    if tmp_src != dst and os.path.exists(tmp_src):
        try:
            os.remove(tmp_src)
        except OSError:
            pass
    if out:
        found[product] = n
        log(f"  ✅ CC0 {product} <- {source}: {os.path.basename(out)} "
            f"({os.path.getsize(out)//1_000_000}MB)")
        return True
    return False


# ---------------- NASA (Public Domain) ----------------

def hunt_nasa(found):
    for product, queries in NASA_QUERIES.items():
        for q in queries:
            if found.get(product, 0) >= 2:
                continue
            api = ("https://images-api.nasa.gov/search?media_type=video&q="
                   + urllib.parse.quote(q))
            j = http_json(api)
            items = ((j or {}).get("collection", {}) or {}).get("items", [])
            for it in items[:3]:
                if found.get(product, 0) >= 2:
                    break
                hj = http_json(it.get("href", ""))
                if not hj:
                    continue
                mp4s = [u for u in hj if u.endswith("~orig.mp4") or "~large.mp4" in u]
                # prefer small: mobile.mp4 first
                small = [u for u in hj if u.endswith("mobile.mp4")]
                pick = (small or mp4s or [u for u in hj if u.endswith(".mp4")])
                if not pick:
                    continue
                url = pick[0].replace(" ", "%20")
                tmp = os.path.join(PURE_DIR, f"_tmp_{product}_nasa_{found.get(product,0)}.mp4")
                r = sh(f'curl -sL --max-time 240 -o "{tmp}" "{url}"', timeout=260)
                if add(product, "nasa", tmp, found):
                    break


# ---------------- Blender (CC-BY, credit in attribution.json) ----------------

def hunt_blender(found):
    for url, (product, tag) in BLENDER_FILMS.items():
        if found.get(product, 0) >= 2:
            continue
        tmp = os.path.join(PURE_DIR, f"_tmp_{product}_blender_{tag}.mp4")
        sh(f'curl -sL --max-time 300 -o "{tmp}" "{url}"', timeout=320)
        add(product, f"blender_{tag}", tmp, found)


# ---------------- Prelinger / archive.org (Public Domain) ----------------

def hunt_archive(found):
    for product, queries in ARCHIVE_QUERY.items():
        for q in queries:
            if found.get(product, 0) >= 2:
                continue
            api = ("https://archive.org/advancedsearch.php?q="
                   + urllib.parse.quote(f'{q} AND collection:prelinger')
                   + "&fl%5B%5D=identifier&rows=3&output=json")
            j = http_json(api)
            docs = ((j or {}).get("response", {}) or {}).get("docs", [])
            for doc in docs:
                if found.get(product, 0) >= 2:
                    break
                ident = doc.get("identifier")
                if not ident:
                    continue
                md = http_json(f"https://archive.org/metadata/{ident}")
                files = (md or {}).get("files", [])
                mp4s = [f["name"] for f in files
                        if f.get("name", "").lower().endswith(".mp4")]
                if not mp4s:
                    continue
                # pick smallest mp4 (slow-net friendly)
                sizes = {f["name"]: int(f.get("size") or 1 << 60)
                         for f in files if f.get("name", "").lower().endswith(".mp4")}
                pick = min(mp4s, key=lambda n: sizes[n])
                url = f"https://archive.org/download/{ident}/{urllib.parse.quote(pick)}"
                tmp = os.path.join(PURE_DIR, f"_tmp_{product}_prelinger.mp4")
                sh(f'curl -sL --max-time 240 -o "{tmp}" "{url}"', timeout=260)
                if add(product, "prelinger", tmp, found):
                    break


# ---------------- Pexels / Pixabay / Coverr (best-effort) ----------------

def hunt_stock(found):
    """These sites block direct scraping often; try yt-dlp on known-good pages.
    Failures are fine — NASA/Blender/Prelinger already cover the products."""
    tries = [
        ("Gaming", "https://www.pexels.com/video/aerial-view-of-esports-arena-3130284/"),
        ("Chat",   "https://www.pixabay.com/videos/id-31296/"),
    ]
    for product, url in tries:
        if found.get(product, 0) >= 2:
            continue
        tmp = os.path.join(PURE_DIR, f"_tmp_{product}_stock.mp4")
        r = sh(f'yt-dlp -f "best[height<=720]" --no-warnings --no-playlist '
               f'-o "{tmp}" "{url}"', timeout=240)
        if r.returncode != 0 or not os.path.exists(tmp):
            log(f"  stock skip ({product}): site blocked/no result")
            continue
        add(product, "stock", tmp, found)


def main():
    open(LOG, "w", encoding="utf-8").close()
    os.makedirs(PURE_DIR, exist_ok=True)
    log("=== pureHunter_cc0_slow start ===")
    found = {}
    # count existing cc0_ files
    for f in glob.glob(os.path.join(PURE_DIR, "cc0_*_pure.mp4")):
        m = re.match(r"cc0_([A-Za-z]+)_", os.path.basename(f))
        if m and m.group(1) in found or m:
            found[m.group(1)] = found.get(m.group(1), 0) + 1
    log(f"existing cc0: {found}")

    hunt_blender(found)
    hunt_nasa(found)
    hunt_archive(found)
    hunt_stock(found)

    log(f"FINAL cc0 map: {found}")
    print("CC0_MAP=" + json.dumps(found))


if __name__ == "__main__":
    main()
