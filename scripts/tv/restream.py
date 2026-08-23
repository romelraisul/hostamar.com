#!/usr/bin/env python3
"""
restream.py — Push TV RTMP to 100+ destinations (YouTube, Facebook, custom).

Reads TvStreamDestination where isActive=true (channelId's channel). Builds
an ffmpeg that reads rtmp://127.0.0.1:1935/live/tv and tee-copies to each
rtmpUrl/streamKey. No re-encode when possible (-c copy) for 100+ efficiency.

Configure destinations via:
  POST /api/tv/restream  { platform, rtmpUrl, streamKey, label }
or direct DB: INSERT INTO "TvStreamDestination" ...

Runs as systemd restream.service (restart=always). When no destinations
are enabled, it sleeps and polls every 60s.
"""
import os
import subprocess
import sys
import time

REPO = '/home/romel/hostamar-build'
RTMP_IN = 'rtmp://127.0.0.1:1935/live/tv'

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    return None

def destinations():
    import psycopg2
    try:
        conn = psycopg2.connect(db_url())
        cur = conn.cursor()
        cur.execute('SELECT "rtmpUrl", "streamKey", platform FROM "TvStreamDestination" WHERE "isActive"=true')
        rows = cur.fetchall()
        conn.close()
        # rtmpUrl is base (e.g. rtmp://a.rtmp.youtube.com/live2/), streamKey appended
        out = []
        for rtmpUrl, key, platform in rows:
            url = rtmpUrl.rstrip('/') + '/' + key.lstrip('/')
            out.append((platform, url))
        return out
    except Exception as e:
        print(f"[restream] DB error {e}", flush=True)
        return []

def main():
    print("[restream] service started, polling TvStreamDestination", flush=True)
    proc = None
    last_count = -1
    while True:
        dests = destinations()
        if len(dests) != last_count:
            print(f"[restream] active destinations: {len(dests)} ({', '.join(p for p,_ in dests) or 'none — add via /admin/tv/restream'})", flush=True)
            last_count = len(dests)
            if proc:
                print("[restream] destinations changed, restarting ffmpeg", flush=True)
                proc.terminate()
                try: proc.wait(timeout=5)
                except: proc.kill()
                proc = None
        if not dests:
            time.sleep(60)
            continue
        if proc and proc.poll() is None:
            time.sleep(10)
            continue
        # Build tee muxer: -f tee "[f=flv]rtmp://...|[f=flv]rtmp://..."
        tee = "|".join([f"[f=flv]{url}" for _, url in dests])
        cmd = ['ffmpeg','-re','-i',RTMP_IN,'-c','copy','-f','tee', tee]
        print(f"[restream] launching ffmpeg -> {len(dests)}tee", flush=True)
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        # Wait a bit, check if it dies quickly (bad key)
        time.sleep(5)
        if proc.poll() is not None:
            err = proc.stderr.read().decode()[-500:] if proc.stderr else ""
            print(f"[restream] ffmpeg exited quickly: {err[:200]}", flush=True)
            time.sleep(30)

if __name__ == '__main__':
    main()
