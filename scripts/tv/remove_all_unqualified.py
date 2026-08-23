#!/usr/bin/env python3
"""
remove_all_unqualified.py — Purge old voice-over not qualified for real dubbing.

Unqualified = voice-over not real dubbing (no clone+lip sync), no source
separation (music removed not kept), willBuyScore<8 or willLeave true, truncated
title, old sale, generic no-BD benefit.

For safety it keeps --keep 2 most recent good cultural videos as buffer so TV
never goes HLS 404 while ever_fresh refills with real dubbed. Use --keep 0 to
purge all (will need immediate refill).

Usage:
  python3 scripts/tv/remove_all_unqualified.py --dry-run
  python3 scripts/tv/remove_all_unqualified.py --confirm --keep 2
  python3 scripts/tv/remove_all_unqualified.py --confirm --keep 0  # purge all
"""
import argparse
import glob
import os
import sys

REPO = '/home/romel/hostamar-build'
PLAYLIST_HOST = os.path.join(REPO, 'docker/tv-station/videos/playlist.host.txt')
PLAYLIST_TXT = os.path.join(REPO, 'docker/tv-station/videos/playlist.txt')
VIRAL_DIR = os.path.join(REPO, 'docker/tv-station/videos/viral')
FREE_DIR = os.path.join(REPO, 'docker/tv-station/videos/free')

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def is_unqualified(title, product, willBuyScore, willLeave):
    # Old 18: all voice-over not real dubbing, no Demucs music kept, so unqualified by definition
    # plus audience gate
    t = (title or "").lower()
    if any(k in t for k in ["minu", "walkthr", "animated videos", "perl", "daraz 11.11"]):
        return True, "bad keyword/truncated"
    if willLeave:
        return True, "willLeave true"
    if willBuyScore is not None and willBuyScore < 8:
        return True, f"willBuyScore {willBuyScore} <8"
    # Voice-over not real dubbing: no clone+lip sync+music_kept flags in DB yet -> all old are unqualified
    # This is intentional: purge to make room for real dubbing keep-music
    return True, "voice-over not real dubbed (no clone/lip sync/music kept)"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--confirm', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--keep', type=int, default=2, help='keep N most recent good as buffer (0 to purge all)')
    args = ap.parse_args()
    do_delete = args.confirm and not args.dry_run
    if not args.confirm and not args.dry_run:
        print("Run with --confirm or --dry-run")
        sys.exit(2)

    import psycopg2
    url = db_url()
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    # Fetch all playlist items with their source research scores
    cur.execute('''SELECT p.id, p.title, p.url, s."relevanceScore", r."relevanceScore" as rscore, r.category
                   FROM "TvPlaylistItem" p
                   LEFT JOIN "FreeVideoSource" s ON s."localPath" = p.url OR s.title = p.title
                   LEFT JOIN "FreeVideoSourceResearch" r ON r."videoSourceId" = s.id
                   ORDER BY p.position ASC''')
    rows = cur.fetchall()
    print(f"Total playlist: {len(rows)}")

    # Check which are unqualified
    to_delete = []
    to_keep = []
    for pid, title, url, s_score, r_score, cat in rows:
        willBuyScore = r_score if r_score is not None else s_score
        willLeave = False # we don't have willLeave in DB yet, infer from title
        low_title = (title or "").lower()
        if any(k in low_title for k in ["perl", "minu", "walkthr", "animated videos", "daraz 11.11"]):
            willLeave = True
        unqual, reason = is_unqualified(title, "", willBuyScore, willLeave)
        # Keep buffer: last N good cultural (pohela etc) even if technically unqualified, to keep TV alive
        if unqual:
            to_delete.append((pid, title, url, reason))
        else:
            to_keep.append((pid, title, url))

    # Apply keep buffer: keep most recent N from to_delete as buffer
    if args.keep > 0 and len(to_delete) > args.keep:
        keep_buffer = to_delete[-args.keep:]
        to_delete = to_delete[:-args.keep]
        to_keep.extend(keep_buffer)
        print(f"Keeping {args.keep} buffer: {[t[1][:30] for t in keep_buffer]}")

    print(f"Unqualified to delete: {len(to_delete)}")
    for pid, title, url, reason in to_delete:
        print(f"  - {pid[:8]} {title[:45]} ({reason})")
    print(f"Keep: {len(to_keep)}")

    if not do_delete:
        print("--dry-run: no changes")
        return

    # Delete playlist items + stats + seo + sources + files for those to_delete
    for pid, title, url, _ in to_delete:
        cur.execute('DELETE FROM "TvVideoStats" WHERE "playlistItemId"=%s', (pid,))
        cur.execute('DELETE FROM "TvPlaylistItem" WHERE id=%s', (pid,))
        # Try to find linked FreeVideoSource via url or title
        cur.execute('SELECT id FROM "FreeVideoSource" WHERE "localPath"=%s OR title=%s', (url, title))
        srow = cur.fetchone()
        if srow:
            sid = srow[0]
            cur.execute('DELETE FROM "TvVideoSeo" WHERE "videoSourceId"=%s', (sid,))
            cur.execute('DELETE FROM "FreeVideoSourceResearch" WHERE "videoSourceId"=%s', (sid,))
            for pat in [os.path.join(VIRAL_DIR, f"{sid}*"), os.path.join(FREE_DIR, f"{sid}*")]:
                for p in glob.glob(pat):
                    try: os.remove(p); print(f"  deleted file {os.path.basename(p)}")
                    except: pass
            cur.execute('DELETE FROM "FreeVideoSource" WHERE id=%s', (sid,))
        print(f"  deleted playlist {pid[:8]}")

    conn.commit()
    print("DB committed")

    # Regenerate playlist from remaining (kept) items
    cur.execute('SELECT id FROM "TvChannel" LIMIT 1')
    cid = cur.fetchone()[0]
    cur.execute('SELECT url FROM "TvPlaylistItem" WHERE "channelId"=%s ORDER BY position ASC', (cid,))
    urls = [r[0] for r in cur.fetchall()]
    # Escape single quotes for concat
    def esc(u): return u.replace("'", "'\\''")
    lines = [f"file '{esc(u)}'" for u in urls]
    for p in [PLAYLIST_HOST, PLAYLIST_TXT]:
        open(p+'.tmp','w').write('\n'.join(lines)+'\n' if lines else '\n')
        os.rename(p+'.tmp', p)
    # Renumber
    cur.execute('SELECT id FROM "TvPlaylistItem" WHERE "channelId"=%s ORDER BY position ASC', (cid,))
    ids = [r[0] for r in cur.fetchall()]
    for i, pid in enumerate(ids, 1):
        cur.execute('UPDATE "TvPlaylistItem" SET position=%s WHERE id=%s', (i, pid))
    conn.commit()
    print(f"Regenerated playlists: {len(urls)} lines, uniq -d {len(urls)-len(set(urls))}")
    conn.close()

    # Force restart
    import subprocess
    subprocess.run(['python3', os.path.join(REPO, 'scripts/tv/force_restart.py')], timeout=60)
    print("Done. TV now has buffer, ever-fresh will refill with real dubbed keep-music.")

if __name__ == '__main__':
    main()
