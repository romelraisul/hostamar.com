#!/usr/bin/env python3
"""
pureHunter_multilang.py — Multi-language, multi-place PURE quality hunter.

Bangla CC 1080p is effectively 0 on YouTube, so we broaden the hunt:
  - Languages: en-US, en-IN, hi-IN, es-ES, ar-AE, id-ID, bn-BD (keep trying)
  - Places: USA, India, UK, BD, Dubai, Indonesia (via query geo terms)
  - Sources: YouTube (Creative Commons only), Wikimedia Commons (CC-BY-SA/PD),
    Pexels/Pixabay/Coverr (CC0 / license-free) when reachable.

NO TTS, NO drawtext/watermark, NO re-encode. Files land in
docker/tv-station/videos/pure/{lang}_{place}_{id}_pure.mp4.

Consent: external yt-dlp YouTube searches are authorized by the user.
"""
import json
import os
import re
import subprocess
import sys

REPO = "/home/romel/hostamar-build"
PURE_DIR = os.path.join(REPO, "docker/tv-station/videos/pure")
HUNT_LOG = "/tmp/pure_hunt_multilang.log"

# lang -> place -> queries. Place is encoded in the filename for the hero badge.
HUNT_MAP = {
    "en": {
        "US": ["web hosting tutorial creative commons 1080p",
               "AI video generator tutorial creative commons",
               "VS Code tutorial creative commons 1080p",
               "browser automation tutorial creative commons",
               "Blender tutorial creative commons 1080p",
               "NASA space 4K creative commons",
               "linux tutorial creative commons 1080p"],
        "IN": ["hosting tutorial India creative commons 1080p",
               "gaming server hosting tutorial creative commons",
               "programming tutorial creative commons 1080p"],
        "UK": ["web hosting tutorial UK creative commons",
               "open source software tutorial creative commons"],
    },
    "hi": {
        "IN": ["web hosting tutorial Hindi creative commons 1080p",
               "video editing tutorial Hindi creative commons HD"],
    },
    "es": {
        "ES": ["tutorial hosting web creative commons 1080p",
               "tutorial edicion video creative commons 1080p"],
    },
    "ar": {
        "AE": ["شرح استضافة مواقع creative commons",
               "tutorial hosting arabic creative commons"],
    },
    "id": {
        "ID": ["tutorial hosting creative commons 1080p",
               "tutorial edit video creative commons 1080p"],
    },
    "bn": {
        "BD": ["ওয়েব হোস্টিং টিউটোরিয়াল creative commons HD"],
    },
}

# Wikimedia Commons categories — all CC-BY-SA / Public Domain, reuse-safe.
WIKIMEDIA_CATS = [
    "https://commons.wikimedia.org/wiki/Category:Videos_of_computers",
    "https://commons.wikimedia.org/wiki/Category:Videos_of_technology",
]

MIN_HEIGHT = 1080
MAX_PER_QUERY = 3          # cap downloads per query to bound runtime/disk
MAX_TOTAL = 24             # hard cap on total pure files this run


def log(msg):
    print(msg, flush=True)
    with open(HUNT_LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def sh(cmd, timeout=180):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)


def max_height(j):
    h = j.get("height") or 0
    for f in j.get("formats", []) or []:
        h = max(h, f.get("height") or 0)
    return h


def is_cc(j):
    lic = (j.get("license") or "").lower()
    return "creative commons" in lic or "cc" in lic


def download(url, out_path, timeout=300):
    """Download best >=1080p to out_path. Returns path or None.

    Format selector prioritizes HIGH-bitrate 1080p: prefer mp4 video with
    vbr>=3000k, then any >=1080p, then best. Avoids the low-bitrate trap
    where yt-dlp picks a 250k 'best' that fails the quality gate.
    """
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return out_path
    fmt = (
        f"bestvideo[height>={MIN_HEIGHT}][vbr>=3000][ext=mp4]+bestaudio[ext=m4a]/"
        f"bestvideo[height>={MIN_HEIGHT}][ext=mp4]+bestaudio[ext=m4a]/"
        f"best[height>={MIN_HEIGHT}]/best"
    )
    cmd = (
        f'yt-dlp -f "{fmt}" --merge-output-format mp4 '
        f'--no-warnings --no-playlist -o "{out_path}" "{url}"'
    )
    r = sh(cmd, timeout=timeout)
    if r.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return out_path
    # yt-dlp may have written a partial/other-ext file; clean up
    if os.path.exists(out_path) and os.path.getsize(out_path) == 0:
        os.remove(out_path)
    return None


def has_good_format(j):
    """Pre-filter: require at least one format with height>=1080 AND
    (tbr/vbr>=2500k OR filesize>20MB proxy). Skips videos whose only 1080p
    is a 250k slideshow that would fail the gate."""
    for f in j.get("formats", []) or []:
        h = f.get("height") or 0
        if h < MIN_HEIGHT:
            continue
        br = f.get("vbr") or f.get("tbr") or 0
        size = f.get("filesize") or f.get("filesize_approx") or 0
        if br >= 2500 or size >= 20_000_000:
            return True
    return False


def hunt_youtube(lang, place, query, found, budget):
    """Search one query, keep only CC + >=1080p candidates, download up to cap."""
    log(f"[YT] {lang}-{place} -> {query}")
    r = sh(f'yt-dlp --dump-json --flat-playlist --playlist-end 8 --no-warnings "ytsearch8:{query}"', timeout=120)
    if r.returncode != 0 or not r.stdout.strip():
        log("  search failed/empty")
        return
    taken = 0
    for line in r.stdout.strip().splitlines():
        if taken >= MAX_PER_QUERY or len(found) >= MAX_TOTAL or budget[0] <= 0:
            break
        try:
            d = json.loads(line)
        except Exception:
            continue
        vid = d.get("id")
        title = d.get("title", "")
        if not vid:
            continue
        url = d.get("url") or f"https://www.youtube.com/watch?v={vid}"
        # full metadata for license + formats
        rj = sh(f'yt-dlp --dump-json --no-download --no-warnings "{url}"', timeout=60)
        if rj.returncode != 0 or not rj.stdout.strip():
            continue
        try:
            j = json.loads(rj.stdout.strip().splitlines()[-1])
        except Exception:
            continue
        if not is_cc(j):
            log(f"  skip non-CC: {title[:50]}")
            continue
        h = max_height(j)
        if h < MIN_HEIGHT:
            log(f"  skip {h}p (<{MIN_HEIGHT}): {title[:50]}")
            continue
        if not has_good_format(j):
            log(f"  skip low-bitrate 1080p (would fail gate): {title[:50]}")
            continue
        out = os.path.join(PURE_DIR, f"{lang}_{place}_{vid}_pure.mp4")
        log(f"  ✅ CC {h}p [{lang}-{place}]: {title[:50]}")
        budget[0] -= 1
        if download(url, out):
            found.append(out)
            taken += 1
            log(f"  saved {os.path.basename(out)}")
        else:
            log(f"  download failed: {vid}")


def hunt_wikimedia(found, budget):
    """Wikimedia Commons videos — CC-BY-SA/PD, reuse-safe, often 1080p+."""
    for cat in WIKIMEDIA_CATS:
        if len(found) >= MAX_TOTAL or budget[0] <= 0:
            break
        log(f"[WIKIMEDIA] {cat}")
        # yt-dlp can list category pages; take first few video entries
        r = sh(f'yt-dlp --dump-json --flat-playlist --playlist-end 6 --no-warnings "{cat}"', timeout=120)
        if r.returncode != 0 or not r.stdout.strip():
            log("  category fetch failed")
            continue
        taken = 0
        for line in r.stdout.strip().splitlines():
            if taken >= 3 or budget[0] <= 0:
                break
            try:
                d = json.loads(line)
            except Exception:
                continue
            url = d.get("url") or d.get("webpage_url")
            vid = d.get("id") or re.sub(r"\W+", "_", (d.get("title") or "wikimedia"))[:40]
            if not url:
                continue
            out = os.path.join(PURE_DIR, f"mul_WM_{vid}_pure.mp4")
            budget[0] -= 1
            if download(url, out, timeout=240):
                found.append(out)
                taken += 1
                log(f"  saved {os.path.basename(out)}")
            else:
                log(f"  wikimedia download failed: {vid}")


def fallback_copy_viral(found):
    """Last resort: losslessly copy best existing viral files (no re-encode)."""
    log("[FALLBACK] copying best existing viral files losslessly")
    viral = os.path.join(REPO, "docker/tv-station/videos/viral")
    if not os.path.isdir(viral):
        return
    files = [os.path.join(viral, f) for f in os.listdir(viral)
             if f.endswith(".mp4") and os.path.getsize(os.path.join(viral, f)) > 0]
    files.sort(key=os.path.getsize, reverse=True)
    for src in files[:12]:
        if len(found) >= MAX_TOTAL:
            break
        base = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(PURE_DIR, f"mul_BD_{base}_pure.mp4")
        if os.path.exists(dst):
            found.append(dst)
            continue
        r = sh(f'ffmpeg -y -i "{src}" -c:v copy -c:a copy "{dst}"', timeout=120)
        if r.returncode == 0 and os.path.exists(dst) and os.path.getsize(dst) > 0:
            found.append(dst)
            log(f"  copied {base}")


def emergency_test_clip(found):
    log("[EMERGENCY] generating 1 black 5s pure clip so playlist never empty")
    out = os.path.join(PURE_DIR, "mul_XX_test_pure.mp4")
    sh(f'ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=5 -f lavfi -i anullsrc '
       f'-c:v libx264 -crf 18 -c:a aac -t 5 "{out}"', timeout=60)
    if os.path.exists(out):
        found.append(out)


def main():
    open(HUNT_LOG, "w", encoding="utf-8").close()
    os.makedirs(PURE_DIR, exist_ok=True)
    log("=== pureHunter_multilang start ===")
    found = []
    budget = [MAX_TOTAL]  # mutable counter shared across hunters

    for lang, places in HUNT_MAP.items():
        for place, queries in places.items():
            for q in queries:
                if len(found) >= MAX_TOTAL:
                    break
                hunt_youtube(lang, place, q, found, budget)

    hunt_wikimedia(found, budget)

    log(f"hunt found: {len(found)} pure files")
    if not found:
        fallback_copy_viral(found)
        log(f"after fallback: {len(found)}")
    if not found:
        emergency_test_clip(found)

    # language/place diversity summary
    langs, places_seen = set(), set()
    for f in found:
        m = re.match(r"([a-z]{2})_([A-Z]{2})_", os.path.basename(f))
        if m:
            langs.add(m.group(1))
            places_seen.add(m.group(2))
    log(f"FINAL: {len(found)} files, {len(langs)} languages {sorted(langs)}, "
        f"{len(places_seen)} places {sorted(places_seen)}")
    print(f"PURE_COUNT={len(found)} LANGS={len(langs)} PLACES={len(places_seen)}")


if __name__ == "__main__":
    main()
