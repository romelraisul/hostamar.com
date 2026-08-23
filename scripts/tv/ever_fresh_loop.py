#!/usr/bin/env python3
"""
ever_fresh_loop.py — Loop forever until 24h (2880 videos) done, refilling when low.

- Checks unplayed/played counts every 60s
- If unplayed < 50, refills: hunter_parallel (12) → research filter → create_batch (4 parallel) → seo batch → force_restart
- Stops only when unplayed+played >= 2880 (24h * 120 videos/hour at 30s each)
- Logs to /tmp/ever-fresh.log, survives as systemd tv-ever-fresh.service

Usage:
  python3 scripts/tv/ever_fresh_loop.py          # default 2880 target
  python3 scripts/tv/ever_fresh_loop.py --target 100  # test small
"""
import argparse
import os
import subprocess
import sys
import time

REPO = '/home/romel/hostamar-build'
TSX = os.path.join(REPO, 'node_modules/.bin/tsx')
TARGET_VIDEOS = 2880  # 24h * 3600 / 30s
REFILL_THRESHOLD = 50

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def counts():
    import psycopg2
    conn = psycopg2.connect(db_url())
    cur = conn.cursor()
    cur.execute('SELECT count(*) FROM "TvPlaylistItem" WHERE played=false')
    unplayed = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "TvPlaylistItem" WHERE played=true')
    played = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "TvPlaylistItem"')
    total = cur.fetchone()[0]
    conn.close()
    return unplayed, played, total

def run(cmd, timeout=900):
    print(f"[ever-fresh] $ {' '.join(cmd[:6])}...", flush=True)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=REPO,
                           env={**os.environ, 'DATABASE_URL': db_url()})
        # Print last line for progress
        tail = (p.stdout + p.stderr).strip().splitlines()[-1][:120] if (p.stdout+p.stderr).strip() else ""
        if tail:
            print(f"  -> {tail}", flush=True)
        return p.returncode == 0
    except subprocess.TimeoutExpired:
        print("  timeout", flush=True)
        return False
    except Exception as e:
        print(f"  error {e}", flush=True)
        return False

def refill():
    print("[ever-fresh] REFILLING — hunting 12 videos parallel (p-limit 3)...", flush=True)
    run([TSX, 'scripts/tv/hunter_parallel.ts', '--max-per-product=2', '--audience-focused'], timeout=600)
    print("[ever-fresh] research gate (willPayScore>=7)...", flush=True)
    run(['python3', 'scripts/tv/research_inhouse.py', '--limit', '12'], timeout=900)
    print("[ever-fresh] creating 4 parallel (Piper) ...", flush=True)
    run(['python3', 'scripts/tv/create_batch.py', '--batch=4', '--parallel=4', '--use-piper', '--force-restart'], timeout=1200)
    # SEO for new batch is inside create_batch; also ensure any missing SEO
    run(['python3', 'scripts/tv/seo_generate.py', '--missing'], timeout=600)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--target', type=int, default=TARGET_VIDEOS)
    ap.add_argument('--once', action='store_true', help='single refill cycle then exit (test)')
    args = ap.parse_args()

    print(f"[ever-fresh] target {args.target} videos (24h = {args.target*30/3600:.1f}h), refill threshold {REFILL_THRESHOLD}", flush=True)
    cycles = 0
    while True:
        cycles += 1
        unplayed, played, total = counts()
        coverage_h = (unplayed + played) * 30 / 3600
        print(f"[ever-fresh] cycle {cycles}: coverage {coverage_h:.1f}h / {args.target*30/3600:.1f}h, unplayed {unplayed}, played {played}, total {total} (target {args.target})", flush=True)

        if total >= args.target:
            print(f"[ever-fresh] FINISHED 24H! {total} videos = {coverage_h:.1f}h — ever-fresh target met", flush=True)
            break

        if unplayed < REFILL_THRESHOLD:
            refill()
        else:
            print(f"[ever-fresh] unplayed {unplayed} >= {REFILL_THRESHOLD}, sleeping 60s", flush=True)

        if args.once:
            print("[ever-fresh] --once: exiting after single cycle", flush=True)
            break
        time.sleep(60)

if __name__ == '__main__':
    main()
