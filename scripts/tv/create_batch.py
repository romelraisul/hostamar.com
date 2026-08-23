#!/usr/bin/env python3
"""
create_batch.py — Batch 4 parallel creator (Piper 0.58s + ffmpeg veryfast).

Takes N unused FreeVideoSource rows (audience-gated) and runs create_from_free.ts
for each in parallel (limit 4). Each does: download + Piper TTS + music mix +
ffmpeg enhance + publish pos1 + auto-SEO trigger. Uses /dev/shm for intermediates
when available.

Usage:
  python3 scripts/tv/create_batch.py --batch=4 --use-piper --parallel=4 --force-restart
"""
import argparse
import os
import subprocess
import sys
import time

REPO = '/home/romel/hostamar-build'
TSX = os.path.join(REPO, 'node_modules/.bin/tsx')

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def get_candidates(limit):
    import psycopg2
    conn = psycopg2.connect(db_url())
    cur = conn.cursor()
    cur.execute('''SELECT id, product, title FROM "FreeVideoSource"
                   WHERE used=false AND ("relevanceScore" IS NULL OR "relevanceScore">=7)
                   ORDER BY "viralScore" DESC LIMIT %s''', (limit,))
    rows = cur.fetchall()
    conn.close()
    return [{'id': r[0], 'product': r[1], 'title': r[2]} for r in rows]

def create_one(source_id, use_piper, idx):
    env = dict(os.environ)
    env['DATABASE_URL'] = db_url()
    if not use_piper:
        env['USE_PIPER'] = '0'
    # Prefer ramdisk for intermediates
    env['TMPDIR'] = '/dev/shm' if os.path.isdir('/dev/shm') else '/tmp'
    cmd = [TSX, 'scripts/tv/create_from_free.ts', f'--sourceId={source_id}']
    start = time.time()
    print(f"[batch {idx}] {source_id[:8]} start", flush=True)
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=900, env=env, cwd=REPO)
    ok = p.returncode == 0 and 'PUBLISHED' in (p.stdout + p.stderr)
    dt = time.time() - start
    tail = (p.stdout + p.stderr).strip().splitlines()[-1][:120] if (p.stdout + p.stderr).strip() else ""
    print(f"[batch {idx}] {'✓' if ok else '✗'} {dt:.1f}s {tail}", flush=True)
    return ok

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--batch', type=int, default=4)
    ap.add_argument('--parallel', type=int, default=4)
    ap.add_argument('--use-piper', action='store_true', default=True)
    ap.add_argument('--force-restart', action='store_true', help='force_restart after batch')
    args = ap.parse_args()

    cands = get_candidates(args.batch)
    if not cands:
        print("No unused candidates (audience-gated)")
        sys.exit(0)
    print(f"Batch creating {len(cands)} videos (parallel={args.parallel}) — Piper {'on' if args.use_piper else 'off'}")

    # Run in chunks of parallel
    ok_count = 0
    for i in range(0, len(cands), args.parallel):
        chunk = cands[i:i+args.parallel]
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as ex:
            futures = {ex.submit(create_one, c['id'], args.use_piper, i+j): c for j, c in enumerate(chunk)}
            for fut in concurrent.futures.as_completed(futures):
                if fut.result():
                    ok_count += 1

    print(f"Batch done: {ok_count}/{len(cands)} published")
    if args.force_restart and ok_count > 0:
        subprocess.run(['python3', os.path.join(REPO, 'scripts/tv/force_restart.py')], timeout=60)
        print("Force-restarted tv-ffmpeg to new head")

    # Trigger SEO batch for newly published
    for c in cands[:ok_count]:
        subprocess.run(['python3', os.path.join(REPO, 'scripts/tv/seo_generate.py'), '--source-id', c['id']], timeout=120)

if __name__ == '__main__':
    main()
