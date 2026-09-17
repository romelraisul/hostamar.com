#!/usr/bin/env python3
"""
Hostamar TV 24/7 Auto-Content Worker
Generates unlimited copyright-safe content from various sources.
Sources: NASA Video Library, Pexels, Pixabay, Coverr, ComfyUI generation.
Publishes to TV shelf, feeds both local HLS and YouTube live.
"""
import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

BUILD = Path("/home/romel/hostamar-build")
PUBLIC_TV = BUILD / "public" / "tv"
PLAYLIST = BUILD / "docker/tv-station/videos/playlist.host.txt"
COMFYUI = "http://127.0.0.1:8188"
NASA_API = "https://images-api.nasa.gov/search"
PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
PIXABAY_KEY = os.environ.get("PIXABAY_API_KEY", "")

LOOP_INTERVAL = 300  # 5 minutes between content generation cycles
MIN_DURATION = 15
MAX_DURATION = 300
MAX_FILE_SIZE = 50 * 1024 * 1024


def run(cmd, timeout=300):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr


def http_get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "hostamar-tv/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def probe(path):
    rc, out, err = run(
        "ffprobe -v error -show_entries format=duration,size"
        " -of csv=p=0 " + repr(str(path))
    )
    if rc == 0 and out:
        parts = out.strip().split(",")
        try:
            return float(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        except (ValueError, IndexError):
            return 0, 0
    return 0, 0


def has_audio(path):
    rc, out, err = run(
        "ffmpeg -v info -i " + repr(str(path))
        + " -af volumedetect -f null /dev/null 2>&1 | grep mean_volume"
    )
    if rc == 0 and out:
        for line in out.splitlines():
            if "mean_volume:" in line:
                try:
                    db = float(line.split("mean_volume:")[1].split("dB")[0])
                    return db > -50
                except ValueError:
                    return False
    return False


def add_to_playlist(mp4_path):
    abs_path = str(mp4_path.resolve())
    line = "file '" + abs_path + "'\n"
    with open(PLAYLIST, "a") as f:
        f.write(line)
    return line


def publish_video(source_path, title):
    """Copy to public/tv, add to playlist."""
    slug_base = title.lower().replace(" ", "-")[:50]
    ext = source_path.suffix
    dest = PUBLIC_TV / (slug_base + ext)
    if dest.exists():
        slug = slug_base + "-" + str(int(time.time()))
        dest = PUBLIC_TV / (slug + ext)
    subprocess.run(["cp", "-f", str(source_path), str(dest)])
    add_to_playlist(dest)
    dur, size = probe(dest)
    print("  PUBLISHED: " + dest.name + " (" + str(round(dur, 1)) + "s)")
    return dest


def fetch_nasa_video(query="space", max_results=3):
    """Search NASA Video Library for public-domain video clips.
       STUB: not yet verified in this session — needs network run."""
    url = NASA_API + "?media_type=video&q=" + urllib.parse.quote(query)
    url = url + "&page=1&per_page=" + str(max_results)
    try:
        data = json.loads(http_get(url))
        items = data.get("collection", {}).get("items", [])
        results = []
        for item in items[:max_results]:
            data_item = item.get("data", [{}])[0]
            video_files = data_item.get("video_files", [])
            if video_files:
                for vf in video_files:
                    q = (vf.get("quality", "") or "").lower()
                    if q in ("hd", "4k") or vf.get("res", "") in (
                        "1920x1080", "3840x2160",
                    ):
                        results.append({
                            "url": vf["src"],
                            "title": data_item.get("title", ""),
                            "nasa_id": data_item.get("nasa_id", ""),
                        })
                        break
                if not results or results[-1]["url"] != video_files[0]["src"]:
                    results.append({
                        "url": video_files[0]["src"],
                        "title": data_item.get("title", ""),
                        "nasa_id": data_item.get("nasa_id", ""),
                    })
        return results
    except Exception as e:
        print("  NASA fetch error: " + str(e))
        return []


def download_nasa_clip(url, dest_dir):
    """Download a NASA video clip. STUB: not yet verified."""
    name = url.split("/")[-1].split("?")[0] or ("nasa_" + str(int(time.time())) + ".mp4")
    dest = dest_dir / name
    if dest.exists() and dest.stat().st_size > 10000:
        return dest
    cmd = (
        "curl -L -o " + repr(str(dest)) + " " + repr(url)
        + " --connect-timeout 10 --max-time 180 -C -"
    )
    rc, out, err = run(cmd, timeout=200)
    if rc == 0 and dest.exists() and dest.stat().st_size > 10000:
        return dest
    return None


def check_comfyui_queue():
    """Check if ComfyUI queue is empty. Verified: ComfyUI running on :8188."""
    try:
        rc, out, err = run("curl -s " + COMFYUI + "/queue", timeout=10)
        if rc == 0:
            data = json.loads(out)
            pending = (data.get("queue", {}) or {}).get("pending", [])
            return pending == []
    except Exception:
        pass
    return True


def generate_comfyui_image(prompt, width=1024, height=576):
    """Submit a prompt to ComfyUI for image generation.
       STUB: submits to queue; actual generation depends on ComfyUI workflow."""
    if not check_comfyui_queue():
        print("  ComfyUI queue not empty, skipping")
        return None
    try:
        body = json.dumps({"prompt": prompt, "width": width, "height": height})
        rc, out, err = run(
            "curl -s -X POST " + COMFYUI + "/prompt"
            " -d '{\"prompt\": " + body + "}' 2>&1",
            timeout=10,
        )
        if rc == 0:
            data = json.loads(out)
            print("  ComfyUI prompt submitted: " + str(data))
            return data.get("prompt_id")
    except Exception as e:
        print("  ComfyUI submission error: " + str(e))
    return None


def generate_science_content():
    """Generate science/nature content from NASA + ComfyUI."""
    print("\n[" + str(datetime.now()) + "] Generating science content...")
    nasa_results = fetch_nasa_video("nature earth science", 2)
    for i, nasa in enumerate(nasa_results):
        print("  NASA clip " + str(i + 1) + ": " + nasa["title"][:60])
        clip_dir = PUBLIC_TV / "nasa"
        clip_dir.mkdir(parents=True, exist_ok=True)
        clip = download_nasa_clip(nasa["url"], clip_dir)
        if clip and clip.stat().st_size > 10000:
            dur, size = probe(clip)
            if MIN_DURATION <= dur <= MAX_DURATION:
                publish_video(clip, "NASA " + nasa["title"][:30])
            else:
                print("    Skipped: duration " + str(dur) + "s out of range")

    if check_comfyui_queue():
        prompt = "cosmic nebula swirling, cinematic, 4k, space science"
        generate_comfyui_image(prompt)


def generate_nature_content():
    """Generate nature content from Pexels/Pixabay. STUB: needs API keys."""
    print("\n[" + str(datetime.now()) + "] Generating nature content...")

    if PEXELS_KEY:
        try:
            url = "https://api.pexels.com/videos/search?query=nature&per_page=3"
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "hostamar-tv/1.0",
                    "Authorization": PEXELS_KEY,
                },
            )
            data = json.loads(http_get(url, timeout=15))
            for video in data.get("videos", [])[:2]:
                for vf in video.get("video_files", []):
                    if vf.get("quality") in ("hd", "full-hd", "4k"):
                        clip_url = vf["link"]
                        clip_dir = PUBLIC_TV / "pexels"
                        clip_dir.mkdir(parents=True, exist_ok=True)
                        clip = download_nasa_clip(clip_url, clip_dir)
                        if clip:
                            publish_video(clip, "Pexels Nature " + video.get("duration", ""))
                        break
        except Exception as e:
            print("  Pexels error: " + str(e))

    if PIXABAY_KEY:
        try:
            url = "https://pixabay.com/api/videos/?key=" + PIXABAY_KEY + "&q=nature&per_page=3"
            req = urllib.request.Request(url, headers={"User-Agent": "hostamar-tv/1.0"})
            data = json.loads(http_get(url, timeout=15))
            for hit in data.get("hits", [])[:2]:
                vids = hit.get("videos", {})
                for video in vids.values():
                    if isinstance(video, dict) and "link" in video:
                        clip_url = video["link"]
                        clip_dir = PUBLIC_TV / "pixabay"
                        clip_dir.mkdir(parents=True, exist_ok=True)
                        clip = download_nasa_clip(clip_url, clip_dir)
                        if clip:
                            publish_video(clip, "Pixabay " + str(hit.get("tags", ""))[:30])
                        break
        except Exception as e:
            print("  Pixabay error: " + str(e))


def main_loop():
    """Main 24/7 content generation loop."""
    print("")
    print("=" * 60)
    print("Hostamar TV 24/7 Auto-Content Worker")
    print("Started: " + str(datetime.now()))
    print("Sources: NASA Video Library, Pexels, Pixabay, ComfyUI")
    print("Publish target: " + str(PUBLIC_TV) + " -> playlist -> TV + YouTube live")
    print("=" * 60)
    print("")

    cycle = 0
    while True:
        cycle += 1
        print("\n--- Cycle " + str(cycle) + " ---")
        try:
            generate_science_content()
            generate_nature_content()
        except Exception as e:
            print("  ERROR in cycle: " + str(e))
        print("  Cycle " + str(cycle) + " complete. Next in " + str(LOOP_INTERVAL) + "s")
        time.sleep(LOOP_INTERVAL)


if __name__ == "__main__":
    main_loop()