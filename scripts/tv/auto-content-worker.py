#!/usr/bin/env python3
"""
Hostamar TV 24/7 Auto-Content Worker
Generates copyright-safe content from NASA, YouTube, ComfyUI.
Publishes to TV shelf for HLS + YouTube live broadcast.
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
NASA_API = "https://images-api.nasa.gov/search"
PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
PIXABAY_KEY = os.environ.get("PIXABAY_API_KEY", "")

# ComfyUI on Windows host — WSL can't reach Win localhost, use cmd bridge
COMFYUI_WIN = "http://127.0.0.1:8189"


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
            return float(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            pass
    return 0, 0


def volumedetect(path):
    rc, out, err = run(
        "ffmpeg -v info -i " + repr(str(path))
        + " -af volumedetect -f null /dev/null 2>&1"
    )
    mean = max_db = None
    for line in (out + err).split("\n"):
        if "mean_volume:" in line:
            try:
                mean = float(line.split("mean_volume:")[1].split("dB")[0].strip())
            except ValueError:
                pass
        if "max_volume:" in line:
            try:
                max_db = float(line.split("max_volume:")[1].split("dB")[0].strip())
            except ValueError:
                pass
    return mean, max_db


def has_audible(path):
    db = volumedetect(path)
    return db[0] is not None and db[0] > -40


def add_to_playlist(video_path):
    with open(PLAYLIST, "a") as f:
        f.write("file '" + str(video_path) + "'\n")


def publish_video(dest, label=""):
    add_to_playlist(dest)
    dur, size = probe(dest)
    print("  PUBLISHED: " + dest.name + " (" + str(round(dur, 1)) + "s)")
    return dest


def fetch_nasa_video(query="space", max_results=3):
    """Search NASA Video Library for public-domain video clips."""
    url = NASA_API + "?media_type=video&q=" + urllib.parse.quote(query)
    url += "&page=1&page_size=" + str(max_results)
    try:
        data = json.loads(http_get(url))
        items = data.get("collection", {}).get("items", [])
        results = []
        for item in items[:max_results]:
            data_item = item.get("data", [{}])[0]
            # Video URLs are in links array
            links = item.get("links", [])
            video_links = [l for l in links if "video" in l.get("href", "")]
            image_links = [l for l in links if l.get("render") == "image"]
            thumbnail = image_links[0]["href"] if image_links else ""
            for vl in video_links[:1]:
                results.append({
                    "url": vl["href"],
                    "title": data_item.get("title", ""),
                    "thumbnail": thumbnail,
                    "nasa_id": data_item.get("nasa_id", ""),
                })
        return results
    except Exception as e:
        print("  NASA fetch error: " + str(e))
        return []


def download_nasa_clip(url, dest_dir, filename=None):
    if not filename:
        filename = url.split("/")[-1].split("?")[0]
        if not filename.endswith((".mp4", ".mov", ".webm")):
            filename += ".mp4"
    dest = dest_dir / filename
    if dest.exists() and dest.stat().st_size > 10000:
        return dest
    try:
        cmd = ("ffmpeg -y -i " + url
               + " -t 30 -c:v libx264 -preset ultrafast -crf 28"
               + " -c:a aac -b:a 64k -ar 44100 -ac 2"
               + " -vf scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2"
               + " -movflags +faststart "
               + repr(str(dest)))
        rc, out, err = run(cmd, timeout=200)
        if rc == 0 and dest.exists() and dest.stat().st_size > 10000:
            return dest
    except Exception as e:
        print("    Download error: " + str(e)[:80])
    return None


def comfyui_curl_get():
    """GET /prompt returns queue state. Returns (queue_remaining, ...)."""
    try:
        rc, out, err = run('cmd.exe /c "curl -s ' + COMFYUI_WIN + '/prompt"', timeout=15)
        if rc == 0:
            data = json.loads(out)
            remaining = (data.get("exec_info") or {}).get("queue_remaining", 0)
            return remaining
    except Exception:
        pass
    return 0


def comfyui_submit_workflow(workflow_graph, timeout=120):
    """Submit a workflow to ComfyUI on Windows host. Returns prompt_id or None."""
    try:
        payload = json.dumps({"prompt": workflow_graph})
        # Use cmd.exe to reach Windows-side ComfyUI
        cmd = ('cmd.exe /c "curl -s -X POST ' + COMFYUI_WIN
               + '/api/v1/prompt -H \\"Content-Type: application/json\\"'
               + ' -d \\"' + payload.replace('"', '\\"') + '\\""')
        rc, out, err = run(cmd, timeout=timeout)
        if rc == 0:
            data = json.loads(out)
            if "prompt_id" in data:
                return data["prompt_id"]
            if "node_errors" in data and data["node_errors"]:
                print("  ComfyUI node_errors: " + str(data["node_errors"])[:200])
    except Exception as e:
        print("  ComfyUI submit error: " + str(e))
    return None


def comfyui_wait_and_download(prompt_id, output_dir, timeout=180):
    """Wait for ComfyUI job to finish, return downloaded image path."""
    start = time.time()
    while time.time() - start < timeout:
        time.sleep(3)
        try:
            rc, out, err = run(
                'cmd.exe /c "curl -s ' + COMFYUI_WIN + '/history/' + prompt_id + '"',
                timeout=15,
            )
            if rc == 0:
                data = json.loads(out)
                if prompt_id in data:
                    status = data[prompt_id].get("status", {})
                    if status.get("status_str") == "success":
                        outputs = data[prompt_id].get("outputs", {})
                        for node_id, node_out in outputs.items():
                            if "images" in node_out:
                                for img in node_out["images"]:
                                    filename = img.get("filename", "")
                                    subfolder = img.get("subfolder", "")
                                    img_url = (COMFYUI_WIN + "/view?filename="
                                               + urllib.parse.quote(filename)
                                               + "&subfolder="
                                               + urllib.parse.quote(subfolder)
                                               + "&type=output")
                                    dest = output_dir / ("comfyui_" + filename)
                                    rc2, _, _ = run(
                                        'cmd.exe /c "curl -s -o ' + str(dest)
                                        + ' ' + img_url + '"',
                                        timeout=60,
                                    )
                                    if dest.exists() and dest.stat().st_size > 1000:
                                        return dest
                    elif status.get("status_str") == "error":
                        print("  ComfyUI job failed: " + str(status)[:100])
                        return None
        except Exception:
            pass
    return None


def comfyui_generate(prompt_text, output_dir, width=854, height=480):
    """Generate an image via ComfyUI SDXL Turbo."""
    # SDXL Turbo: 1-4 steps, fast
    workflow = {
        "3": {"inputs": {"seed": int(time.time()) % 100000, "steps": 4, "cfg": 1.0,
                         "sampler_name": "euler", "scheduler": "normal",
                         "denoise": 1.0,
                         "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                         "latent_image": ["5", 0]},
              "class_type": "KSampler"},
        "4": {"inputs": {"ckpt_name": "sd_xl_turbo_1.0_fp16.safetensors"},
              "class_type": "CheckpointLoaderSimple"},
        "5": {"inputs": {"width": width, "height": height, "batch_size": 1},
              "class_type": "EmptyLatentImage"},
        "6": {"inputs": {"text": prompt_text, "clip": ["4", 1]},
              "class_type": "CLIPTextEncode"},
        "7": {"inputs": {"text": "text, watermark, low quality, blurry", "clip": ["4", 1]},
              "class_type": "CLIPTextEncode"},
        "8": {"inputs": {"samples": ["3", 0], "vae": ["4", 2]},
              "class_type": "VAEDecode"},
        "9": {"inputs": {"images": ["8", 0]}, "filename_prefix": "hostamar_tv",
              "class_type": "PreviewImage"},
    }

    pid = comfyui_submit_workflow(workflow)
    if not pid:
        return None
    print("  ComfyUI job " + pid + " submitted, waiting...")
    return comfyui_wait_and_download(pid, output_dir)


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
            if 15 <= dur <= 300:
                publish_video(clip, "NASA " + nasa["title"][:30])
            else:
                print("    Skipped: duration " + str(dur) + "s out of range")

    # ComfyUI generation
    queue_remaining = comfyui_curl_get()
    if queue_remaining == 0:
        prompts = [
            "beautiful cosmic nebula, cinematic, 4k, science documentary",
            "deep space galaxy, stars, nebula, astronomy, 4k",
            "scientific laboratory, futuristic technology, clean, professional",
        ]
        prompt = prompts[int(time.time()) % len(prompts)]
        print("  Generating ComfyUI: " + prompt[:50])
        output_dir = PUBLIC_TV / "comfyui"
        output_dir.mkdir(parents=True, exist_ok=True)
        img = comfyui_generate(prompt, output_dir)
        if img:
            print("  ComfyUI generated: " + img.name)


def generate_nature_content():
    """Fetch nature videos from Pexels/Pixabay if keys are set."""
    if not PEXELS_KEY and not PIXABAY_KEY:
        return
    print("\n[" + str(datetime.now()) + "] Generating nature content...")
    # ... (existing code)


def main_loop():
    """Main 24/7 content generation loop."""
    print("")
    print("=" * 60)
    print("Hostamar TV 24/7 Auto-Content Worker")
    print("Started: " + str(datetime.now()))
    print("Sources: NASA Video Library, ComfyUI")
    print("ComfyUI: " + COMFYUI_WIN + " (via cmd bridge)")
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
        print("  Cycle " + str(cycle) + " complete. Next in 300s")
        time.sleep(300)


if __name__ == "__main__":
    main_loop()
