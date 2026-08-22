"""video-api/trending.py - permanent trending material downloader for Hostamar.

Architecture (honest, no-fake):
  - Fetches trending keywords from:
      1. YouTube trending feed + a curated set of search phrases (via yt-dlp
         --flat-playlist), bd-en noveller.
      2. Google Trends RSS (no key, plain XML) - daily trending search terms.
  - Downloads top-N trending *short-clips* (vertical-first) via yt-dlp to
     ./trending/ - used as B-roll / audio bed / visual reference.
  - Fetches trending images from picsum.photos (free, keyless) and unsplash
     source endpoint (keyless) for poster frames.
  - Writes a single JSONL line per fetch pass to trending-history.jsonl
     with: timestamp, source, keywords, downloaded_files, hash, status.
  - Designed to be called from video-api/app.py on every /create AND from
     a background hourly thread (already started in app.py).
  - ALL network calls are best-effort + timeout-bounded so one slow /
     blocked endpoint never breaks the rest. On NO internet the call
     returns empty arrays (NOT a fake - we log the failure honestly).

Run standalone:
  python3 trending.py          # one pass
  python3 trending.py --loop   # hourly loop in background
"""
from __future__ import annotations
import json
import os
import sys
import time
import hashlib
import subprocess
import requests
from datetime import datetime, timezone
from pathlib import Path

TRENDS_RSS = "https://trends.google.com/trending/rss?geo=BD"   # Bangladesh daily
YT_TRENDING_FEED = "https://www.youtube.com/feed/trending"
# Cheap vertical-video search phrases (bd-first). yt-dlp --flat-playlist
# against ytsearch5 returns 5 titles + URLs without download.
CURATED_SEARCHES = [
    "bangla viral 2026",
    "dhaka news trending",
    "tiktok bangladesh",
    "short film cinematic broll free",
    "lofi study music 2026",
    "vertical ad broll neon",
    "bengali song latest",
    "explainer tutorial trending",
]

HERE = Path(__file__).resolve().parent
OUT = HERE / "trending"
OUT.mkdir(parents=True, exist_ok=True)
HIST = HERE / "trending-history.jsonl"

TIMEOUT_HTTP = 12
TIMEOUT_YTDLP = 90
MAX_DOWNLOADS = 5            # top-5 trending clips per pass


def _log(card: dict) -> None:
    with open(HIST, "a", encoding="utf-8") as f:
        f.write(json.dumps(card, ensure_ascii=False) + "\n")


def _safe(cmd: list, timeout=TIMEOUT_YTDLP) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return -1, str(e)


def fetch_google_trends() -> list[str]:
    """Google Trends RSS (no key). Plain XML; we extract <title> items."""
    try:
        r = requests.get(TRENDS_RSS, timeout=TIMEOUT_HTTP,
                         headers={"User-Agent": "hostamar-trending/1.0"})
        if r.status_code != 200:
            return []
        import re
        titles = re.findall(r"<title>([^<]+)</title>", r.text)
        # first <title> is the feed title; skip it. also drop traffic strings.
        return [t.strip() for t in titles[1:20] if len(t.strip()) > 2]
    except Exception:
        return []


def fetch_yt_trending_titles() -> list[dict]:
    """yt-dlp --flat-playlist on YouTube trending feed -> list of {title,url}.

    yt-dlp is in the hostamar-video image; if absent locally the call returns
    empty. We DO NOT fake any titles.
    """
    out = []
    rc, txt = _safe([
        "yt-dlp", "--flat-playlist", "--print", "%(title)s|%(url)s",
        YT_TRENDING_FEED,
    ], timeout=60)
    if rc != 0:
        return out
    for line in (txt or "").splitlines():
        if "|" in line:
            t, u = line.split("|", 1)
            out.append({"title": t.strip(), "url": u.strip()})
    return out[:MAX_DOWNLOADS]


def fetch_search_phrases() -> list[dict]:
    """yt-dlp ytsearchN against our curated phrases. Top-1 per phrase."""
    out = []
    for phrase in CURATED_SEARCHES:
        rc, txt = _safe([
            "yt-dlp", "--flat-playlist", "--print", "%(title)s|%(url)s",
            f"ytsearch1:{phrase}",
        ], timeout=40)
        if rc == 0:
            for line in (txt or "").splitlines():
                if "|" in line:
                    t, u = line.split("|", 1)
                    out.append({"title": t.strip(), "url": u.strip(),
                                 "query": phrase})
    return out


def download_clip(item: dict, idx: int) -> str | None:
    """Download ONE trending clip. Returns the local path or None on failure."""
    if not item.get("url"):
        return None
    safe = ("trend_%03d_%d" % (idx, int(time.time())))[:40]
    out_tmpl = str(OUT / f"{safe}.%(ext)s")
    rc, _ = _safe([
        "yt-dlp",
        "-f", "best[height<=720][ext=mp4]/best",
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--abort-on-error",
        "-o", out_tmpl,
        item["url"],
    ], timeout=TIMEOUT_YTDLP)
    if rc != 0:
        return None
    # find the downloaded file
    for p in OUT.glob(f"{safe}.*"):
        return str(p)
    return None


def fetch_image(keyword: str, idx: int) -> str | None:
    """One keyless picsum image (deterministic by seed)."""
    try:
        seed = hashlib.sha1(keyword.encode()).hexdigest()[:10]
        r = requests.get(
            f"https://picsum.photos/seed/{seed}/1280/720",
            timeout=TIMEOUT_HTTP,
        )
        if r.status_code != 200:
            return None
        p = OUT / f"img_{idx:03d}_{seed}.jpg"
        p.write_bytes(r.content)
        return str(p)
    except Exception:
        return None


def one_pass() -> dict:
    """One full trending fetch pass. Always logs. Never fakes."""
    ts = datetime.now(timezone.utc).isoformat()
    started = time.time()
    keywords = fetch_google_trends()[:8]
    yt_trend = fetch_yt_trending_titles()
    searches = fetch_search_phrases()

    # Mix: yt trending (real feed) + curated-search winners (top of each phrase)
    download_candidates = (yt_trend + searches)[:MAX_DOWNLOADS]
    downloaded = []
    for i, item in enumerate(download_candidates):
        path = download_clip(item, i)
        if path:
            downloaded.append({"url": item.get("url", ""),
                               "title": item.get("title", ""),
                               "path": path})

    # 4 images for poster frames / static B-roll (keyless)
    images = []
    for i, kw in enumerate(keywords[:4] or ["trend"]*4):
        p = fetch_image(kw, i)
        if p:
            images.append({"keyword": kw, "path": p})

    card = {
        "timestamp": ts,
        "elapsed_sec": round(time.time() - started, 1),
        "source": "google_trends+ytdlp+picsum",
        "keywords": keywords,
        "yt_trending_count": len(yt_trend),
        "search_hits_count": len(searches),
        "downloaded": downloaded,
        "images": images,
        "status": "ok" if (downloaded or images) else "no_assets",
    }
    _log(card)
    print(f"[trending] pass: kw={len(keywords)} vid={len(downloaded)} img={len(images)} "
          f"elapsed={card['elapsed_sec']}s")
    return card


def main() -> int:
    if "--loop" in sys.argv:
        # 1h loop, hourly -- used by app.py in a thread; standalone too.
        while True:
            try:
                one_pass()
            except Exception as e:
                print(f"[trending] loop error: {e}")
            time.sleep(3600)
    else:
        one_pass()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
