#!/usr/bin/env python3
"""Orchestrator: ingest open-source videos -> Bangla dub -> add to TV playlist -> reload ffmpeg loop."""
import json, os, subprocess, sys, time

BASE = "/home/romel/hostamar-build"
VDIR = BASE + "/docker/tv-station/videos/opensource"
STATE = BASE + "/scripts/bangla-dub/state.json"
PLAYLIST = BASE + "/docker/tv-station/videos/playlist.host.txt"


LOCK = "/tmp/bangla-auto.lock"
def acquire_lock():
    try:
        pid = int(open(LOCK).read().strip())
        os.kill(pid, 0)
        log("another auto.py running (pid " + str(pid) + "), exiting")
        sys.exit(0)
    except Exception:
        pass
    open(LOCK, "w").write(str(os.getpid()))

def log(msg):
    print("[" + time.strftime("%Y-%m-%d %H:%M:%S") + "] " + msg, flush=True)

def load_state():
    try:
        return json.load(open(STATE))
    except Exception:
        return {"done": {}, "failed": {}}

def save_state(st):
    json.dump(st, open(STATE, "w"), ensure_ascii=False, indent=1)

def ffprobe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except Exception:
        return None

def reload_ffmpeg():
    # Prefer systemd-managed ffmpeg (tv-ffmpeg.service); fall back to manual script.
    r = subprocess.run(["systemctl", "--user", "restart", "tv-ffmpeg"],
                       capture_output=True, text=True, timeout=60)
    if r.returncode == 0:
        return
    try:
        pid = int(open("/tmp/ffmpeg.pid").read().strip())
        os.kill(pid, 15)
        time.sleep(3)
    except Exception:
        pass
    subprocess.run(["bash", BASE + "/scripts/start-tv-live.sh"],
                   capture_output=True, text=True, timeout=120)

def append_playlist(path):
    with open(PLAYLIST, "a") as f:
        f.write("file " + chr(39) + path + chr(39) + "\n")

def main(max_items=2):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ingest, dub
    acquire_lock()
    st = load_state()
    now = time.time()
    def recent_fail(cid):
        v = st["failed"].get(cid)
        if not v: return False
        if isinstance(v, dict) and now - v.get("ts", 0) < 43200: return True
        return False
    cands = [c for c in ingest.fetch_candidates() if c["id"] not in st["done"] and not recent_fail(c["id"])]
    cands.sort(key=lambda c: c["source"] == "BLENDER")  # short films first
    added = 0
    for c in cands:
        if added >= max_items:
            break
        dest = os.path.join(VDIR, c["id"] + ".mp4")
        bn_dest = os.path.join(VDIR, c["id"] + "_bn.mp4")
        if os.path.exists(bn_dest):
            st["done"][c["id"]] = {"path": bn_dest, "title": c["title"]}
            continue
        log("downloading " + c["source"] + ":" + c["id"] + " " + c["title"][:60])
        try:
            ingest.download(c, dest)
        except Exception as e:
            log("  download failed: " + str(e)); st["failed"][c["id"]] = {"err": str(e)[:200], "ts": time.time()}; continue
        dur = ffprobe_duration(dest)
        if not dur or dur < 30 or dur > 900:
            log("  skip: duration " + str(dur)); st["failed"][c["id"]] = {"err": "duration " + str(dur), "ts": time.time()}
            try: os.remove(dest)
            except OSError: pass
            continue
        title_bn = dub.translate_en_bn(c["title"][:80]) if c["title"].isascii() else c["title"]
        log("  dubbing to Bangla (" + str(int(dur)) + "s video)")
        try:
            info = dub.dub_video(dest, bn_dest, title_bn, c["source"], c["license"])
        except Exception as e:
            log("  dub failed: " + str(e)[:200]); st["failed"][c["id"]] = {"err": str(e)[:200], "ts": time.time()}[:200]
            try: os.remove(dest)
            except OSError: pass
            continue
        try: os.remove(dest)
        except OSError: pass
        append_playlist(bn_dest)
        st["done"][c["id"]] = dict(path=bn_dest, title_bn=title_bn, orig=c["title"],
                                   license=c["license"], source=c["source"], **info)
        save_state(st)
        log("  OK: " + bn_dest)
        added += 1
    if added:
        log("reloading ffmpeg playlist loop")
        reload_ffmpeg()
    save_state(st)
    log("run complete: +" + str(added) + " Bangla videos, total " + str(len(st["done"])))

if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 2)
