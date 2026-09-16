#!/usr/bin/env python3
"""
restream.py — Push the TV feed to every active TvStreamDestination (YouTube,
Facebook, custom RTMP).

One plain ffmpeg per destination. Not -f tee: YouTube refused to start the
broadcast through the tee muxer (health degraded to "not receiving enough
video"), while a direct push starts it every time.

Source is the local concat playlist, not rtmp://127.0.0.1:1935/live/tv. Pulling
the stream back out of nginx contends with the publisher that is writing into
it and lagged badly ("lag of 48s", speed=0.18x); the file encodes at ~1.0x.

Configure destinations via:
  POST /api/tv/restream  { platform, rtmpUrl, streamKey, label }
or direct DB: INSERT INTO "TvStreamDestination" ...

Runs as systemd restream.service (restart=always). With no active destination
it sleeps and polls every 60s.
"""
import os
import subprocess
import time

REPO = '/home/romel/hostamar-build'
RTMP_IN = 'rtmp://127.0.0.1:1935/live/tv'
PLAYLIST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
ERRLOG = '/tmp/tv-restream-ffmpeg.log'
POLL_WHEN_IDLE = 60
POLL_WHEN_LIVE = 15


def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=', 1)[1].strip().strip('"').split('&channel')[0]
    return None


def destinations():
    import psycopg2
    try:
        conn = psycopg2.connect(db_url())
        cur = conn.cursor()
        cur.execute('SELECT "rtmpUrl", "streamKey", platform FROM "TvStreamDestination" WHERE "isActive"=true')
        rows = cur.fetchall()
        conn.close()
        out = []
        for rtmpUrl, key, platform in rows:
            out.append((platform, rtmpUrl.rstrip('/') + '/' + key.lstrip('/')))
        return out
    except Exception as e:
        print(f"[restream] DB error {e}", flush=True)
        return None  # None = unknown, distinct from [] = genuinely none


def source_args():
    # Prefer the pre-concatenated loop.mp4. The raw concat playlist STALLS
    # mid-run (measured: freeze at frame 3350, then speed 0.78x with drops
    # climbing) because the demuxer re-opens the list at a member boundary and
    # the timestamps are broken. loop.mp4 is one flat file, built once by
    # docker/tv-station/makeloop.sh. Fall back to the playlist, then RTMP.
    loop = os.path.join(os.path.dirname(PLAYLIST), 'loop.mp4')
    if os.path.exists(loop) and os.path.getsize(loop) > 0:
        return ['-re', '-stream_loop', '-1', '-i', loop]
    TS = ['-fflags', '+genpts', '-avoid_negative_ts', 'make_zero',
          '-use_wallclock_as_timestamps', '0']
    if os.path.exists(PLAYLIST) and os.path.getsize(PLAYLIST) > 0:
        return ['-re', '-f', 'concat', '-safe', '0', '-stream_loop', '-1',
                '-i', PLAYLIST] + TS
    return ['-re'] + TS + ['-i', RTMP_IN]


def launch(dests):
    """Start one encoder per destination. Returns the live Popen list."""
    src = source_args()
    procs = []
    for platform, url in dests:
        # BITRATE IS SET BY THE MEASURED UPLINK, NOT BY TASTE.
        # This line uploads 18-44 KB/s (0.15-0.35 Mbps, 3 samples). The egress was
        # 1200 kbps / 150 KB/s — about 4x over budget — so ffmpeg read the source
        # fine but the RTMP socket could not drain, giving speed 0.94x with drop
        # climbing and the broadcast dying after ~30 min. An earlier 20s test
        # "passed" only because lavfi needs no sustained throughput.
        # 180k video + 32k audio = 212 kbps (26 KB/s), which fits with headroom,
        # and still looks like TV at 360p. Raise only after re-measuring upload.
        cmd = (['ffmpeg'] + src + ['-map', '0',
               '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,'
                      'pad=640:360:(ow-iw)/2:(oh-ih)/2',
               '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
               '-b:v', '180k', '-maxrate', '200k', '-bufsize', '400k',
               '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
               '-c:a', 'aac', '-b:a', '32k', '-ar', '44100', '-ac', '2',
               '-f', 'flv', url])
        # stderr MUST go to a file, never a PIPE: nothing drains a PIPE while the
        # process runs, so ffmpeg fills the 64K pipe buffer and blocks — the
        # encoder then looks alive while sending nothing, errors unreadable.
        f = open(ERRLOG, 'ab', buffering=0)
        f.write(f"\n=== {time.strftime('%Y-%m-%d %H:%M:%S')} launch {platform} -> {url.split('/')[2]} ===\n".encode())
        p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=f)
        print(f"[restream] pusher pid={p.pid} -> {platform}", flush=True)
        procs.append(p)
    time.sleep(6)
    dead = [p for p in procs if p.poll() is not None]
    if dead:
        try:
            tail = open(ERRLOG, 'rb').read()[-400:].decode('utf-8', 'replace')
        except Exception:
            tail = "(no log)"
        print(f"[restream] {len(dead)}/{len(procs)} pusher(s) exited immediately: {tail}", flush=True)
    return [p for p in procs if p.poll() is None]


def stop(procs, why):
    if not procs:
        return
    print(f"[restream] {why} — stopping {len(procs)} pusher(s)", flush=True)
    for p in procs:
        p.terminate()
    for p in procs:
        try:
            p.wait(timeout=5)
        except Exception:
            p.kill()


def main():
    print("[restream] service started, polling TvStreamDestination", flush=True)
    procs = []
    last = -1
    while True:
        dests = destinations()
        if dests is None:            # DB unreachable — leave whatever runs alone
            time.sleep(POLL_WHEN_LIVE)
            continue
        if len(dests) != last:
            print(f"[restream] active destinations: {len(dests)} "
                  f"({', '.join(p for p, _ in dests) or 'none'})", flush=True)
            last = len(dests)
            stop(procs, "destination set changed")
            procs = []
        if not dests:
            time.sleep(POLL_WHEN_IDLE)
            continue
        # Restart if every encoder has died (bad key, ingest rejection).
        if procs and all(p.poll() is not None for p in procs):
            print("[restream] all pushers dead; relaunching", flush=True)
            procs = []
        if procs:
            time.sleep(POLL_WHEN_LIVE)
            continue
        procs = launch(dests)
        time.sleep(POLL_WHEN_LIVE)


if __name__ == '__main__':
    main()
