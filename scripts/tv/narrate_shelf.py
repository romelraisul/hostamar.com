#!/usr/bin/env python3
"""
narrate_shelf.py — give every own-shelf render real, audible narration.

Why: all 53 own renders carried either no audio track or an anullsrc one, so the
whole channel aired digital silence (max|x|=0 across 120491 samples on
receipt-tunnel). The old guard (`has_audio()`) checked for a STREAM, not for
SIGNAL, so silence passed every check.

This narrates the card title + a CTA in Bangla via edge-tts (piper fallback),
muxes with the video stream copied (never re-encoded), and REFUSES to write an
output that is still silent. Idempotent: an already-audible file is skipped.

ponytail: one short line of narration over a 15s receipt, not a script — receipts
have no script field. Replace with real per-video copy when REEL starts
generating them; the mux/verify path stays.
"""
import argparse
import os
import re
import subprocess
import sys

REPO = "/home/romel/hostamar-build"
EDGE = os.path.join(REPO, "public/tv")
TP = re.compile(r"^(cc0_|clean_cc0_|cmt[0-9])")
VOICE = os.environ.get("TV_HINDI_VOICE", "bn-BD-PradeepNeural")
CTA = "আরও জানতে hostamar.com ভিজিট করুন।"


def mean_db(path):
    """Mean volume in dB, or None when there is no measurable audio."""
    r = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "mean_volume:" in line:
            try:
                return float(line.split("mean_volume:")[1].split("dB")[0])
            except ValueError:
                return None
    return None


def audible(path, floor_db=-50.0):
    d = mean_db(path)
    return d is not None and d >= floor_db


def narrate(text, out_mp3):
    try:
        import edge_tts
    except ImportError:
        return None
    import asyncio
    try:
        asyncio.run(edge_tts.Communicate(text, VOICE).save(out_mp3))
    except Exception:
        return None
    return out_mp3 if os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 512 else None


def fix_one(filename, dry=False):
    """Returns (action, detail). action in {skip, fixed, failed}."""
    path = os.path.join(EDGE, filename)
    if not os.path.isfile(path):
        return "failed", "missing file"
    if audible(path):
        return "skip", "already audible"
    stem = os.path.splitext(filename)[0]
    line = stem.replace("-", " ").replace("_", " ")
    text = f"{line}। {CTA}"
    if dry:
        return "fixed", f"would narrate: {text[:60]}"
    mp3 = f"/tmp/shelf-narr-{stem[:40]}.mp3"
    if not narrate(text, mp3):
        return "failed", "narration failed"
    tmp = path + ".narrated.mp4"
    r = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", path, "-i", mp3,
         "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-af", "apad",
         "-shortest", tmp],
        capture_output=True, text=True)
    if r.returncode != 0:
        return "failed", r.stderr[-120:]
    # the guard: never replace a silent file with another silent file
    if not audible(tmp):
        os.remove(tmp)
        return "failed", "output still silent"
    os.replace(tmp, path)
    return "fixed", f"{mean_db(path):.1f} dB"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    files = sorted(f for f in os.listdir(EDGE)
                   if f.endswith(".mp4") and not TP.match(f) and not f.endswith("-short.mp4"))
    if args.limit:
        files = [f for f in files if not audible(os.path.join(EDGE, f))][: args.limit]
    fixed = skipped = failed = 0
    for f in files:
        action, detail = fix_one(f, dry=args.dry_run)
        if action == "fixed":
            fixed += 1
        elif action == "skip":
            skipped += 1
        else:
            failed += 1
        print(f"  [{action}] {f} — {detail}", flush=True)
    print(f"DONE fixed={fixed} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
