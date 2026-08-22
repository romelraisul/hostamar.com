#!/usr/bin/env python3
"""Orchestrator: ingest open-source videos -> Bangla dub -> add to TV playlist -> reload ffmpeg loop.

Ever-fresh mode (default): every run fetches NEW business/fashion/ecommerce
videos, dubs them with gender-matched Bangla voices, appends them to the
playlist, trims the playlist to MAX_PLAYLIST items (oldest first), and
restarts the tv-ffmpeg loop so the channel stays fresh without downtime.
"""
import json, os, subprocess, sys, time

BASE = "/home/romel/hostamar-build"
VDIR = BASE + "/docker/tv-station/videos/opensource"
STATE = BASE + "/scripts/bangla-dub/state.json"
PLAYLIST = BASE + "/docker/tv-station/videos/playlist.host.txt"
NORMALIZED_DIR = BASE + "/docker/tv-station/videos/normalized"

MAX_PLAYLIST = int(os.environ.get("TV_MAX_PLAYLIST", "50"))  # keep max 50 items
KEEP_FOREVER_PREFIXES = ("normalized/",)  # never trim the original demo/brand videos


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

def read_playlist():
    try:
        return [l.rstrip("\n") for l in open(PLAYLIST) if l.strip()]
    except FileNotFoundError:
        return []

def write_playlist(lines):
    tmp = PLAYLIST + ".tmp"
    with open(tmp, "w") as f:
        f.write("\n".join(lines) + ("\n" if lines else ""))
    os.replace(tmp, PLAYLIST)

def append_playlist(path):
    lines = read_playlist()
    entry = "file '" + path + "'"
    if entry not in lines:  # no duplicate entries
        lines.append(entry)
        write_playlist(lines)

def trim_playlist(max_items=MAX_PLAYLIST):
    """Keep newest max_items entries; drop oldest (never the brand/demo set)."""
    lines = read_playlist()
    protected = [l for l in lines if any(l.startswith("file '" + NORMALIZED_DIR + "/" + p.strip("/")) or
                                        ("normalized/" in l) for p in KEEP_FOREVER_PREFIXES)]
    fresh = [l for l in lines if l not in protected]
    trimmed = fresh[len(fresh) - max_items:] if len(fresh) > max_items else fresh
    new_lines = protected + trimmed
    removed = len(fresh) - len(trimmed)
    for l in fresh[:removed]:
        # delete evicted files to bound disk usage
        try:
            p = l.split("file '", 1)[1].rsplit("'", 1)[0]
            if p.startswith(VDIR) and os.path.exists(p):
                os.remove(p)
                log("trimmed old video: " + os.path.basename(p))
        except Exception:
            pass
    if removed:
        write_playlist(new_lines)
    return len(read_playlist())

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


def main(max_items=2):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ingest
    acquire_lock()
    st = load_state()
    now = time.time()
    def recent_fail(cid):
        v = st["failed"].get(cid)
        if not v: return False
        if isinstance(v, dict) and now - v.get("ts", 0) < 43200: return True
        return False

    sources = None
    args = [a for a in sys.argv[1:] if not a.isdigit()]
    if "--sources" in args:
        i = args.index("--sources")
        if i + 1 < len(args):
            sources = [s for s in args[i + 1].split(",") if s]
    cands = [c for c in ingest.fetch_candidates(sources=sources)
             if c["id"] not in st["done"] and not recent_fail(c["id"])]
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
        title_bn = c.get("title_bn") or (
            __import__("dub").translate_en_bn(c["title"][:80]) if c["title"].isascii() else c["title"])
        log("  dubbing to Bangla (" + str(int(dur)) + "s video)")
        try:
            info = __import__("dub").dub_video(dest, bn_dest, title_bn, c["source"], c["license"])
        except Exception as e:
            log("  dub failed: " + str(e)[:200]); st["failed"][c["id"]] = {"err": str(e)[:200], "ts": time.time()}
            try: os.remove(dest)
            except OSError: pass
            continue
        try: os.remove(dest)
        except OSError: pass
        append_playlist(bn_dest)
        total = trim_playlist()
        st["done"][c["id"]] = dict(path=bn_dest, title_bn=title_bn, orig=c["title"],
                                   license=c["license"], source=c["source"], **info)
        save_state(st)
        log("  OK: " + bn_dest + " (gender=" + str(info.get("gender")) +
            ", voice=" + str(info.get("voice")) + ") | playlist size=" + str(total))
        added += 1
    if added:
        log("reloading ffmpeg playlist loop")
        reload_ffmpeg()
    save_state(st)
    log("run complete: +" + str(added) + " Bangla videos, done total " + str(len(st["done"])) +
        ", playlist " + str(len(read_playlist())))

if __name__ == "__main__":
    nums = [int(a) for a in sys.argv[1:] if a.isdigit()]
    main(nums[0] if nums else 2)
