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
# Read the concat playlist directly instead of pulling RTMP back out of nginx.
# The RTMP round-trip lagged badly ("lag of 48s", speed=0.18x) because the
# publisher writes into nginx while we read out; the playlist file has no such
# contention and encodes at speed=0.997x. Fall back to RTMP if it is missing.
PLAYLIST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
ERRLOG = '/tmp/tv-restream-ffmpeg.log'

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
        # Source: local concat playlist (no RTMP round-trip contention).
        if os.path.exists(PLAYLIST) and os.path.getsize(PLAYLIST) > 0:
            src = ['-re', '-f', 'concat', '-safe', '0', '-stream_loop', '-1', '-i', PLAYLIST]
        else:
            src = ['-re', '-fflags', '+genpts', '-i', RTMP_IN]
        # RE-ENCODE, do not -c copy. Stream copy preserved the source's broken
        # timeline (ffmpeg showed time=-00:01:27, frames stalled) and YouTube
        # never started the broadcast. -g 60 is the keyframe cadence it wants.
        # -map 0 is REQUIRED for the tee muxer: it has no implicit stream
        # selection, so without it every target fails with
        # "Output file does not contain any stream".
        cmd = (['ffmpeg'] + src + ['-map', '0',
               '-c:v','libx264','-preset','ultrafast','-tune','zerolatency',
               '-b:v','2000k','-maxrate','2200k','-bufsize','4400k',
               '-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0',
               '-c:a','aac','-b:a','128k','-ar','44100','-ac','2',
               '-f','tee', tee])
        print(f"[restream] launching ffmpeg -> {len(dests)}tee", flush=True)
        # stderr MUST go to a file, never a PIPE: nothing drains a PIPE while the
        # process runs, so ffmpeg fills the 64K pipe buffer and blocks — the tee
        # then looks alive while sending nothing, and its errors are unreadable.
        errf = open(ERRLOG, 'ab', buffering=0)
        errf.write(f"\n=== {time.strftime('%Y-%m-%d %H:%M:%S')} launch {len(dests)} dest ===\n".encode())
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=errf)
        # Wait a bit, check if it dies quickly (bad key)
        time.sleep(5)
        if proc.poll() is not None:
            try:
                tail = open(ERRLOG, 'rb').read()[-600:].decode('utf-8', 'replace')
            except Exception:
                tail = "(no log)"
            print(f"[restream] ffmpeg exited quickly: {tail}", flush=True)
            time.sleep(30)

if __name__ == '__main__':
    main()
