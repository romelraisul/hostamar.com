#!/usr/bin/env python3
"""Process ONE OpenSourceVideo end-to-end: download -> Bangla dub -> normalize -> playlist -> report to site DB."""
import json, os, subprocess, sys, time, urllib.request

BASE = "/home/romel/hostamar-build"
sys.path.insert(0, BASE + "/scripts/bangla-dub")
API = os.environ.get("HOSTAMAR_API", "https://hostamar.com")
VDIR = BASE + "/docker/tv-station/videos/opensource"

def log(m):
    print("[" + time.strftime("%H:%M:%S") + "] " + m, flush=True)

def report(secret, payload):
    try:
        req = urllib.request.Request(
            API + "/api/tv/agent/opensource-report?secret=" + urllib.parse.quote(secret),
            data=json.dumps(payload).encode(), method="POST",
            headers={"Content-Type": "application/json", "x-agent-secret": secret})
        json.load(urllib.request.urlopen(req, timeout=30))
        return True
    except Exception as e:
        log("report failed: " + str(e)[:150])
        return False

import urllib.parse

def main():
    job = json.load(open(sys.argv[1]))
    secret = job["secret"]
    oid = job["openSourceVideoId"]
    item = job["item"]  # {id, source, externalId, title, downloadUrl, license}
    import ingest, dub
    dest = os.path.join(VDIR, item["id"] + ".mp4")
    bn_dest = os.path.join(VDIR, item["id"] + "_bn.mp4")

    if not os.path.exists(bn_dest):
        report(secret, {"openSourceVideoId": oid, "status": "DOWNLOADED"})
        log("downloading " + item["id"])
        ingest.download({"download_url": item["downloadUrl"]}, dest)
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dest],
                           capture_output=True, text=True)
        dur = float(r.stdout.strip() or 0)
        if dur < 30 or dur > 900:
            os.remove(dest)
            report(secret, {"openSourceVideoId": oid, "status": "FAILED", "error": "duration " + str(dur)})
            return
        report(secret, {"openSourceVideoId": oid, "status": "DUBBING", "localPath": dest, "duration": dur})
        title_bn = dub.translate_en_bn(item["title"][:80]) if item["title"].isascii() else item["title"]
        log("dubbing to Bangla (" + str(int(dur)) + "s)")
        dub.dub_video(dest, bn_dest, title_bn, item["source"], item.get("license", ""))
        os.remove(dest)
        # add to local playlist
        with open(BASE + "/docker/tv-station/videos/playlist.host.txt", "a") as f:
            f.write("file " + chr(39) + bn_dest + chr(39) + "\n")
        # reload ffmpeg loop
        try:
            os.kill(int(open("/tmp/ffmpeg.pid").read().strip()), 15)
            time.sleep(3)
        except Exception:
            pass
        subprocess.run(["bash", BASE + "/scripts/start-tv-live.sh"], capture_output=True, timeout=120)
    else:
        title_bn = item.get("title") or "video"

    report(secret, {"openSourceVideoId": oid, "status": "DUBBED", "banglaPath": bn_dest, "titleBn": title_bn})
    # mark state so auto.py does not redo it
    try:
        st_path = BASE + "/scripts/bangla-dub/state.json"
        st = json.load(open(st_path))
        st["done"][item["id"]] = {"path": bn_dest, "title_bn": title_bn, "source": item["source"]}
        json.dump(st, open(st_path, "w"), ensure_ascii=False)
    except Exception:
        pass
    log("done: " + bn_dest)

if __name__ == "__main__":
    main()
