#!/usr/bin/env python3
"""
enable_no_repeat.py — Make TV ever-fresh: no video ever repeats.

Does:
  1. Sets TvPlaylistItem.played=false, playedAt=null for all (fresh start)
  2. Dedupes playlist.host.txt (each file once, no weight loop)
  3. Verifies `sort | uniq -d` is 0
  4. No DB weight needed — each video plays once, then marked played by watcher

Usage:
  python3 scripts/tv/enable_no_repeat.py --confirm
  cat docker/tv-station/videos/playlist.host.txt | sort | uniq -d  # must be 0
  bash scripts/tv/force_restart_tv.sh
"""
import argparse
import os
import sys

REPO = '/home/romel/hostamar-build'
PLAYLIST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
PLAYLIST_TXT = os.path.join(REPO, 'docker/tv-station/videos/playlist.txt')

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--confirm', action='store_true')
    args = ap.parse_args()
    if not args.confirm:
        print("Run with --confirm to enable no-repeat")
        sys.exit(2)

    import psycopg2
    url = db_url()
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    # 1) Reset played flag for ever-fresh start
    cur.execute('UPDATE "TvPlaylistItem" SET played=false, "playedAt"=NULL')
    print(f"Reset {cur.rowcount} items to played=false")

    # 2) Dedupe: keep first occurrence of each url, delete duplicates (weight loop leftovers)
    cur.execute('SELECT id, url FROM "TvPlaylistItem" ORDER BY position ASC')
    rows = cur.fetchall()
    seen = set()
    dups = []
    for pid, url in rows:
        if url in seen:
            dups.append(pid)
        else:
            seen.add(url)
    for pid in dups:
        cur.execute('DELETE FROM "TvPlaylistItem" WHERE id=%s', (pid,))
        print(f"  removed duplicate playlist {pid[:8]}")
    print(f"Deduped: removed {len(dups)} duplicate entries")

    # 3) Renumber positions 1..N
    cur.execute('SELECT id FROM "TvPlaylistItem" ORDER BY position ASC')
    ids = [r[0] for r in cur.fetchall()]
    for i, pid in enumerate(ids, 1):
        cur.execute('UPDATE "TvPlaylistItem" SET position=%s WHERE id=%s', (i, pid))
    print(f"Renumbered {len(ids)} items")

    # 4) Regenerate playlist files — each file ONCE, no weight
    cur.execute('SELECT id FROM "TvChannel" LIMIT 1')
    row = cur.fetchone()
    cid = row[0] if row else None
    if not cid:
        print("No TvChannel")
        sys.exit(1)
    cur.execute('SELECT url FROM "TvPlaylistItem" WHERE "channelId"=%s ORDER BY position ASC', (cid,))
    urls = [r[0] for r in cur.fetchall()]
    lines = [f"file '{u}'" for u in urls]
    for p in [PLAYLIST, PLAYLIST_TXT]:
        open(p+'.tmp','w').write('\n'.join(lines)+'\n')
        os.rename(p+'.tmp', p)
    print(f"Regenerated {PLAYLIST} with {len(urls)} lines (each once)")

    conn.commit()

    # 5) Verify no repeat
    uniq_d = len(urls) - len(set(urls))
    print(f"uniq -d check: {uniq_d} duplicates (must be 0) — {'PASS' if uniq_d==0 else 'FAIL'}")

    # 6) Coverage estimate
    est_sec = len(urls) * 30  # avg 30s per video
    print(f"Current coverage: {len(urls)} videos × 30s = {est_sec//60} min ({est_sec/3600:.1f}h). "
          f"Need 2880 for 24h; hunter will fill gap at current rate ~12/hr = 288/day.")

    print("Done. Now run: bash scripts/tv/force_restart_tv.sh to air new head immediately.")

if __name__ == '__main__':
    main()
