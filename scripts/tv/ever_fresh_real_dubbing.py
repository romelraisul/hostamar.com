#!/usr/bin/env python3
"""
ever_fresh_real_dubbing.py — Never stops until 24h (2880) of REAL dubbed keep-music videos.

Same as ever_fresh_loop.py but uses real_dubbing.py (Demucs keep-music + XTTS clone + Wav2Lip)
instead of create_batch voice-over. Falls back to Piper when XTTS/Wav2Lip down.

Loop: every 60s check unplayed+played, if unplayed <20 refill 12 parallel hunter → research → real_dubbing batch
"""
import os, subprocess, sys, time
REPO = '/home/romel/hostamar-build'
TSX = os.path.join(REPO, 'node_modules/.bin/tsx')
TARGET = 2880
REFILL = 20

def db_url():
    for l in open(os.path.join(REPO, '.env.local')):
        if l.startswith('DATABASE_URL='):
            return l.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL')

def counts():
    import psycopg2
    c = psycopg2.connect(db_url()); cur = c.cursor()
    cur.execute('SELECT count(*) FROM "TvPlaylistItem" WHERE played=false'); unplayed = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "TvPlaylistItem" WHERE played=true'); played = cur.fetchone()[0]
    c.close()
    return unplayed, played, unplayed+played

def run(cmd, timeout=900):
    print(f"$ {' '.join(cmd[:4])}...", flush=True)
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=REPO, env={**os.environ, 'DATABASE_URL': db_url()})
    tail = (p.stdout+p.stderr).splitlines()[-1][:120] if (p.stdout+p.stderr).strip() else ""
    if tail: print(f"  -> {tail}", flush=True)
    return p.returncode==0

def main():
    print(f"[real-dubbing] target {TARGET} (24h), refill <{REFILL}", flush=True)
    while True:
        unplayed, played, total = counts()
        cov = total*30/3600
        print(f"[real-dubbing] coverage {cov:.1f}h /24h unplayed {unplayed} total {total}", flush=True)
        if total >= TARGET:
            print(f"FINISHED 24H {total} = {cov:.1f}h", flush=True)
            break
        if unplayed < REFILL:
            print("[real-dubbing] REFILL 12 hunter parallel...", flush=True)
            run([TSX,'scripts/tv/hunter_parallel.ts','--max-per-product=2','--audience-focused'], 600)
            run(['python3','scripts/tv/research_inhouse.py','--limit','12'], 900)
            # Real dubbing batch 4 parallel keep-music
            for _ in range(3):  # 3 batches of 4 =12
                run(['python3','scripts/tv/real_dubbing.py','--product','Video','--force-restart'], 900)
                run(['python3','scripts/tv/real_dubbing.py','--product','Hosting','--force-restart'], 900)
            run(['python3','scripts/tv/seo_generate.py','--missing'], 600)
            run(['bash','scripts/tv/force_restart_tv.sh'], 60)
        time.sleep(60)

if __name__ == '__main__':
    main()
