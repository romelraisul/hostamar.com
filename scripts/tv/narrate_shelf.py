#!/usr/bin/env python3
"""Narrate every silent shelf file with Bengali TTS (edge-tts primary, piper fallback)."""
import os
import sys
import subprocess
import asyncio
from pathlib import Path

# ---------- config ----------
BUILD = Path("/home/romel/hostamar-build")
PUBLIC_TV = BUILD / "public" / "tv"
VOICE = "bn-BD-PradeepNeural"  # edge-tts Bengali voice


# ---------- helpers ----------
def run(cmd, timeout=120):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr


def volumedetect(path):
    """Return mean_volume dB, or None if undetectable."""
    rc, out, err = run(
        "ffmpeg -v info -i " + repr(str(path))
        + " -af volumedetect -f null /dev/null 2>&1"
        + " | grep 'mean_volume:'"
    )
    if rc == 0 and out:
        for line in out.splitlines():
            if "mean_volume:" in line:
                try:
                    return float(line.split("mean_volume:")[1].split("dB")[0])
                except ValueError:
                    pass
    return None


def has_audible(path):
    db = volumedetect(path)
    return db is not None and db > -50


async def tts_edge(text, out_mp3):
    """edge-tts Bengali TTS. Returns True on success."""
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(str(out_mp3))
        return out_mp3.exists() and out_mp3.stat().st_size > 512
    except Exception as e:
        print("    edge-tts error: " + str(e)[:80])
        return False


def tts_piper(text, out_wav):
    """piper Bengali TTS fallback. Returns True on success."""
    model_dir = "/home/romel/hostamar-build/docker/tts/models/bn_BD-google-medium"
    try:
        rc, out, err = run(
            "piper -m " + model_dir + "/bn_BD-google-medium.onnx"
            + " -c " + model_dir + "/bn_BD-google-medium.onnx.json"
            + " -i /dev/stdin"
            + " -o " + repr(str(out_wav))
            + " <<< " + repr(text),
            timeout=60,
        )
        return rc == 0 and out_wav.exists() and out_wav.stat().st_size > 512
    except Exception as e:
        print("    piper error: " + str(e)[:80])
        return False


def narrate_file_sync(video_path):
    """Narrate one file (sync wrapper for use in main loop)."""
    bn = video_path.name
    stem = video_path.stem

    # Generate Bengali text from filename
    base = bn.replace(".mp4", "")
    if base.startswith("receipt-"):
        topic = base.replace("receipt-", "").replace("-", " ")
        text = (
            "হোস্টামার টিভির এই ভিডিওতে আমরা দেখছি "
            + topic
            + "। "
            + topic
            + " সম্পর্কে বিস্তারিত জানতে হোস্টামার ডট কম ভিজিট করুন।"
        )
    elif base.startswith("build-log-") or base.startswith("programme-"):
        text = (
            "হোস্টামার টিভির প্রোগ্রাম। "
            + base
            + " সম্পর্কে বিস্তারিত জানতে হোস্টামার ডট কম ভিজিট করুন।"
        )
    else:
        text = (
            "হোস্টামার টিভির এই ভিডিওটি সম্পর্কে বিস্তারিত জানতে "
            + "হোস্টামার ডট কম ভিজিট করুন।"
        )

    print("  [" + bn + "] text: " + text[:70])

    mp3 = Path("/tmp") / (stem + "-narration.mp3")
    wav = Path("/tmp") / (stem + "-narration.wav")
    ok = False

    # edge-tts (async) via new event loop
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        ok = loop.run_until_complete(tts_edge(text, mp3))
        loop.close()
    except Exception as e:
        print("    edge-tts error: " + str(e)[:80])
        ok = False

    # Fallback piper
    if not ok or not mp3.exists():
        ok = tts_piper(text, wav)
        if ok:
            mp3 = wav

    if not ok or not mp3.exists():
        print("  FAILED: TTS generation")
        return False

    # Mux narration under video (video copy, audio replace)
    tmp = Path("/tmp") / (stem + "-narrated.mp4")
    rc, out, err = run(
        "ffmpeg -y -i " + repr(str(video_path))
        + " -i " + repr(str(mp3))
        + " -c:v copy"
        + " -c:a aac -b:a 128k -ar 48000 -ac 2"
        + " -map 0:v:0 -map 1:a:0"
        + " -shortest"
        + " " + repr(str(tmp)),
        timeout=120,
    )
    if rc != 0 or not tmp.exists() or tmp.stat().st_size <= 10000:
        print("  FAILED: ffmpeg mux")
        return False

    # Verify result is audible
    db = volumedetect(tmp)
    if db is None or db <= -50:
        print("  FAILED: result still silent (db=" + str(db) + ")")
        return False

    # Replace original in place
    subprocess.run(["cp", "-f", str(tmp), str(video_path)])
    print("  OK: " + bn + "  dB=" + str(round(db, 1)))
    return True


# ---------- main ----------
async def main():
    print("=" * 58)
    print("Hostamar TV Shelf Narrator — Bengali TTS for silent files")
    print("=" * 58)

    silent = []
    for p in sorted(PUBLIC_TV.glob("*.mp4")):
        db = volumedetect(p)
        if db is None or db <= -50:
            silent.append((p, db))

    print("Silent files: " + str(len(silent)) + " / " + str(len(list(PUBLIC_TV.glob("*.mp4")))))
    print("")

    for i, (path, old_db) in enumerate(silent, 1):
        print("[" + str(i) + "/" + str(len(silent)) + "] " + path.name
              + " (was " + str(old_db) + " dB)")
        ok = narrate_file_sync(path)
        if not ok:
            print("  *** FAILED ***")
        await asyncio.sleep(0.3)  # polite back-off

    remaining = []
    for p in sorted(PUBLIC_TV.glob("*.mp4")):
        db = volumedetect(p)
        if db is None or db <= -50:
            remaining.append((p, db))

    print("")
    print("=" * 58)
    print("Done. Remaining silent: " + str(len(remaining)))
    if remaining:
        print("Still silent:")
        for p, db in remaining:
            print("  " + p.name + "  db=" + str(db))
    else:
        print("ALL SHELF FILES NOW HAVE AUDIO")
    print("=" * 58)


if __name__ == "__main__":
    asyncio.run(main())