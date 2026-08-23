#!/usr/bin/env python3
"""
no_repeat_watcher.py — Ever-fresh TV watcher.

Watches the ffmpeg fd for the currently playing file, waits its duration,
then marks that TvPlaylistItem as played=true, removes it from the head of
playlist.host.txt, and force-restarts ffmpeg to the next item.

Runs as systemd tv-no-repeat-watcher.service (restart=always). Lightweight
poll every 5s, no CPU when idle.

If the playlist drops below 5 items, it triggers a hunter kick via
full_workflow to refill (so 24h coverage grows).
"""
import os
import subprocess
import sys
import time
import urllib.request

REPO = '/home/romel/hostamar-build'
PLAYLIST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
RTMP = 'rtmp://127.0.0.1:1935/live/tv'

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    return None

def rtmp_pid():
    try:
        out = subprocess.check_output(['pgrep','-f',RTMP], text=True).strip().split()
        return int(out[0]) if out else None
    except Exception:
        return None

def open_video(pid):
    try:
        for fd in os.listdir(f'/proc/{pid}/fd'):
            try:
                t = os.readlink(f'/proc/{pid}/fd/{fd}')
                if '/videos/' in t and t.endswith('.mp4'):
                    return t
            except OSError:
                continue
    except OSError:
        pass
    return None

def mark_played(url):
    import psycopg2
    try:
        conn = psycopg2.connect(db_url())
        cur = conn.cursor()
        # Keep at least 2 unplayed as buffer — never drain to 0 while refilling
        cur.execute('SELECT count(*) FROM "TvPlaylistItem" WHERE played=false')
        remaining_before = cur.fetchone()[0]
        if remaining_before <= 2:
            print(f"[watcher] buffer low ({remaining_before} left), skipping mark to keep TV alive", flush=True)
            return remaining_before
        cur.execute('UPDATE "TvPlaylistItem" SET played=true, "playedAt"=NOW() WHERE url=%s', (url,))
        # Also regenerate playlist.host.txt without played items
        cur.execute('SELECT id FROM "TvChannel" LIMIT 1')
        cid = cur.fetchone()[0]
        cur.execute('SELECT url FROM "TvPlaylistItem" WHERE "channelId"=%s AND played=false ORDER BY position ASC', (cid,))
        urls = [r[0] for r in cur.fetchall()]
        # Renumber remaining
        cur.execute('SELECT id FROM "TvPlaylistItem" WHERE "channelId"=%s AND played=false ORDER BY position ASC', (cid,))
        ids = [r[0] for r in cur.fetchall()]
        for i, pid in enumerate(ids, 1):
            cur.execute('UPDATE "TvPlaylistItem" SET position=%s WHERE id=%s', (i, pid))
        conn.commit()
        for p in [PLAYLIST, PLAYLIST.replace('playlist.host.txt','playlist.txt')]:
            esc_lines = [f"file '{u.replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}'" for u in urls]
            open(p+'.tmp','w').write('\n'.join(esc_lines)+'\n')
            os.rename(p+'.tmp', p)
        print(f"[watcher] marked played {os.path.basename(url)} — remaining {len(urls)}", flush=True)
        return len(urls)
    except Exception as e:
        print(f"[watcher] DB error {e}", flush=True)
        return None

def maybe_refill(remaining):
    if remaining is not None and remaining < 5:
        print("[watcher] playlist low (<5), kicking hunter for refill", flush=True)
        try:
            subprocess.run(['python3', os.path.join(REPO,'scripts/tv/full_workflow.py'),
                            '--product','Video','--one'], timeout=900)
        except Exception as e:
            print(f"[watcher] refill failed {e}", flush=True)

def main():
    print("[watcher] ever-fresh watcher started (poll 5s)", flush=True)
    last_video = None
    while True:
        try:
            pid = rtmp_pid()
            if not pid:
                time.sleep(5)
                continue
            video = open_video(pid)
            if not video or video == last_video:
                time.sleep(5)
                continue
            last_video = video
            print(f"[watcher] now playing {os.path.basename(video)}", flush=True)
            # Wait for its duration + 2s, then mark played and restart
            try:
                dur = float(subprocess.check_output(
                    ['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', video],
                    text=True, timeout=10).strip() or "30")
            except Exception:
                dur = 30
            time.sleep(min(dur + 2, 90))
            # Verify still same file before marking (in case we already advanced)
            cur_video = open_video(rtmp_pid() or pid)
            # Mark the *previous* head (video) as played regardless, to ensure no repeat
            remaining = mark_played(video)
            maybe_refill(remaining)
            # Force restart to next head
            subprocess.run(['python3', os.path.join(REPO,'scripts/tv/force_restart.py')], timeout=60)
        except Exception as e:
            print(f"[watcher] loop error {e}", flush=True)
            time.sleep(5)

if __name__ == '__main__':
    main()
