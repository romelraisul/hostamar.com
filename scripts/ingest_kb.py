#!/usr/bin/env python3
"""
Hostamar knowledge-base ingestion -> Qdrant.

Scrapes the 6 live product/FAQ pages on hostamar.com, chunks them, embeds via
the SELF-HOSTED Ollama (nomic-embed-text) and upserts into Qdrant collection
`hostamar_kb`. Each point carries payload {product, lang, source, text}.

Run locally (WSL) where both Ollama:11434 and Qdrant:8200 are reachable:
    python3 scripts/ingest_kb.py
"""
import json
import re
import sys
import urllib.request
import urllib.error

OLLAMA = "http://localhost:11434"
QDRANT = "http://localhost:8200"
COLLECTION = "hostamar_kb"
EMBED_MODEL = "nomic-embed-text"
CHUNK = 600
OVERLAP = 80

PAGES = [
    ("ai-video",      "bn", "https://hostamar.com/products/ai-video"),
    ("cloud-hosting", "bn", "https://hostamar.com/products/cloud-hosting"),
    ("ai-chat",      "bn", "https://hostamar.com/products/ai-chat"),
    ("ai-browser",   "bn", "https://hostamar.com/products/ai-browser"),
    ("dev-ide",      "bn", "https://hostamar.com/products/dev-ide"),
    ("game",         "bn", "https://hostamar.com/products/game"),
    ("pricing",      "bn", "https://hostamar.com/pricing"),
]

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "HostamarKB/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "ignore")

def to_text(html: str) -> str:
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    text = TAG_RE.sub(" ", html)
    text = WS_RE.sub(" ", text).strip()
    return text

def chunk(text: str):
    # simple recursive-ish splitter on sentence boundaries
    sents = re.split(r"(?<=[।.!?])\s+", text)
    out, buf = [], ""
    for s in sents:
        if len(buf) + len(s) > CHUNK:
            if buf:
                out.append(buf.strip())
            buf = s
        else:
            buf = (buf + " " + s).strip()
    if buf:
        out.append(buf.strip())
    return out

def embed(text: str):
    data = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(
        f"{OLLAMA}/api/embed",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["embeddings"][0]

def upsert(points: list):
    body = json.dumps({"points": points}).encode()
    req = urllib.request.Request(
        f"{QDRANT}/collections/{COLLECTION}/points",
        data=body,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def main():
    batch = []
    pid = 0
    for product, lang, url in PAGES:
        try:
            html = fetch(url)
        except urllib.error.HTTPError as e:
            print(f"SKIP {url} -> HTTP {e.code}", file=sys.stderr)
            continue
        except Exception as e:  # noqa
            print(f"SKIP {url} -> {e}", file=sys.stderr)
            continue
        text = to_text(html)
        for c in chunk(text):
            if len(c) < 30:
                continue
            try:
                vec = embed(c)
            except Exception as e:  # noqa
                print(f"EMBED FAIL ({product}): {e}", file=sys.stderr)
                continue
            batch.append({
                "id": pid,
                "vector": vec,
                "payload": {"product": product, "lang": lang, "source": url, "text": c},
            })
            pid += 1
            if len(batch) >= 20:
                upsert(batch)
                print(f"upserted {len(batch)} (total {pid})")
                batch = []
    if batch:
        upsert(batch)
        print(f"upserted {len(batch)} (total {pid})")
    print(f"DONE total={pid}")

if __name__ == "__main__":
    main()
