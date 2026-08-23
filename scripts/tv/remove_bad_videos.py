#!/usr/bin/env python3
"""
remove_bad_videos.py — Remove 5 trust-killing videos and any audience-mismatched content.

Matches by title keywords (case-insensitive):
  animated videos with ai, Perl Programming, Stunning AI Videos in Minu, Chatbotapp, Daraz 11.11

Also doubles as a generic bad-video cleaner: future bad titles added to BAD_KEYWORDS.

For each match:
  - Delete TvPlaylistItem + TvVideoStats (Neon)
  - Delete FreeVideoSource + TvVideoSeo + FreeVideoSourceResearch + viral files (if linked)
  - For orphan playlist items (Daraz 11.11 viral with no FreeVideoSource), delete by title
  - Regenerate playlist.host.txt + playlist.txt
  - Force-restart ffmpeg via force_restart.py so TV doesn't loop the old fd
"""
import argparse
import glob
import os
import re
import subprocess
import sys

REPO = '/home/romel/hostamar-build'
PLAYLIST_HOST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
PLAYLIST_TXT = os.path.join(REPO, 'docker/tv-station/videos/playlist.txt')
VIRAL_DIR = os.path.join(REPO, 'docker/tv-station/videos/viral')
FREE_DIR = os.path.join(REPO, 'docker/tv-station/videos/free')

BAD_KEYWORDS = [
    "animated videos with ai",
    "Perl Programming",
    "Stunning AI Videos in Minu",
    "Chatbotapp",
    "Daraz 11.11",
]

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def log(msg):
    print(msg, flush=True)

def find_bad_playlist_ids(cur):
    cond = " OR ".join([f"title ILIKE '%{k}%'" for k in BAD_KEYWORDS])
    cur.execute(f'SELECT id, title FROM "TvPlaylistItem" WHERE {cond}')
    return cur.fetchall()

def find_bad_source_ids(cur):
    # Daraz 11.11 has no FreeVideoSource, skip it here
    src_keywords = [k for k in BAD_KEYWORDS if k != "Daraz 11.11"]
    cond = " OR ".join([f"title ILIKE '%{k}%'" for k in src_keywords])
    cur.execute(f'SELECT id, title, product FROM "FreeVideoSource" WHERE {cond}')
    return cur.fetchall()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--confirm', action='store_true', help='actually delete')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    do_delete = args.confirm and not args.dry_run
    if not args.confirm and not args.dry_run:
        print("Run with --confirm to delete or --dry-run to preview")
        sys.exit(2)

    import psycopg2
    url = db_url()
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    bad_playlist = find_bad_playlist_ids(cur)
    bad_sources = find_bad_source_ids(cur)
    bad_source_ids = [r[0] for r in bad_sources]

    log(f"Bad TvPlaylistItem: {len(bad_playlist)}")
    for pid, title in bad_playlist:
        log(f"  playlist {pid[:8]} — {title[:55]}")
    log(f"Bad FreeVideoSource: {len(bad_sources)}")
    for sid, title, prod in bad_sources:
        log(f"  source {sid[:8]} [{prod}] — {title[:55]}")

    if not do_delete:
        log("--dry-run: no changes")
        return

    # 1) Delete TvPlaylistItem + TvVideoStats
    for pid, _ in bad_playlist:
        cur.execute('DELETE FROM "TvVideoStats" WHERE "playlistItemId"=%s', (pid,))
        cur.execute('DELETE FROM "TvPlaylistItem" WHERE id=%s', (pid,))
        log(f"  deleted playlist {pid[:8]}")

    # 2) Delete FreeVideoSource-linked rows and files
    for sid, title, prod in bad_sources:
        cur.execute('DELETE FROM "TvVideoSeo" WHERE "videoSourceId"=%s', (sid,))
        cur.execute('DELETE FROM "FreeVideoSourceResearch" WHERE "videoSourceId"=%s', (sid,))
        # files: viral/*{sid}* and free/*{sid}* + original
        for pat in [os.path.join(VIRAL_DIR, f"{sid}*"), os.path.join(FREE_DIR, f"{sid}*")]:
            for p in glob.glob(pat):
                try:
                    os.remove(p)
                    log(f"  deleted file {os.path.basename(p)}")
                except OSError as e:
                    log(f"  skip file {p}: {e}")
        cur.execute('DELETE FROM "FreeVideoSource" WHERE id=%s', (sid,))
        log(f"  deleted source {sid[:8]}")

    conn.commit()
    log("DB committed")

    # 3) Regenerate playlist files from remaining TvPlaylistItem
    cur.execute('SELECT id FROM "TvChannel" LIMIT 1')
    row = cur.fetchone()
    if row:
        channel_id = row[0]
        cur.execute('SELECT url FROM "TvPlaylistItem" WHERE "channelId"=%s ORDER BY position ASC', (channel_id,))
        urls = [r[0] for r in cur.fetchall()]
        lines = [f"file '{u}'" for u in urls]
        for path in [PLAYLIST_HOST, PLAYLIST_TXT]:
            tmp = path + '.tmp'
            open(tmp, 'w').write('\n'.join(lines) + '\n')
            os.rename(tmp, path)
        log(f"Regenerated playlists: {len(urls)} entries")
        log(f"  head: {lines[0][:80] if lines else '(empty)'}")

    conn.close()

    # 4) Force restart ffmpeg so new head actually plays
    log("Force-restarting tv-ffmpeg...")
    subprocess.run(['python3', os.path.join(REPO, 'scripts/tv/force_restart.py')], timeout=60)
    log("Done. Verify: ls -l /proc/$(pgrep -f rtmp)/fd | grep viral should NOT contain bad keywords")
    bad = " ".join([f"'{k}'" for k in BAD_KEYWORDS])
    log(f"  check: grep -i -E \"perl|animated|Stunning|Chatbotapp|Daraz 11\" playlist.host.txt should be 0")
    remaining = open(PLAYLIST_HOST).read()
    hits = sum(1 for k in BAD_KEYWORDS if k.lower() in remaining.lower())
    log(f"  remaining bad hits in playlist.host.txt: {hits}")

if __name__ == '__main__':
    main()
