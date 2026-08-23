#!/usr/bin/env python3
"""
full_workflow.py — ONE COMMAND: hunt → research → create(Bangla+music+enhance) → publish → SEO → notify.

Orchestrates the battle-tested stages (each stage is independently runnable):

  1. browser_search_youtube_cc  (hunt_tool.ts — camofox browser automation)
  2. research_inhouse.py        (llama relevance gate; whisper/vision auto-skip if unsupported)
  3. create_from_free.ts        (download → Bangla VO → music bed mix → ffmpeg enhance
                                 + burns; Hunyuan edit auto-used when comfy is up)
  4. seo_generate.py            (/tv/watch/{slug} + OG + sitemap row)
  5. notify.py                  (Telegram if configured, TvLog always)

Usage:
  python3 scripts/tv/full_workflow.py --product Video --now
    [--use-rafan] [--max-hunt 1] [--skip-research] [--skip-hunt]

Exit codes: 0 = published; 1 = no usable candidate this round; 2 = config error.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

REPO = '/home/romel/hostamar-build'
TSX = os.path.join(REPO, 'node_modules/.bin/tsx')


def log(msg):
    print(f"[workflow] {msg}", flush=True)


def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=', 1)[1].strip().strip('"').replace('&channel_binding=require', '').replace('-pooler.', '.')
    raise SystemExit('DATABASE_URL missing')


def pg_query(sql, params=None):
    import psycopg2
    conn = psycopg2.connect(db_url())
    with conn.cursor() as cur:
        cur.execute(sql, params or [])
        rows = None
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    conn.commit()
    conn.close()
    return rows


def run(cmd, env=None, timeout=None):
    e = dict(os.environ)
    e.setdefault('DATABASE_URL', db_url())
    if env:
        e.update(env)
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=e, cwd=REPO)
    return p.returncode, (p.stdout or '') + (p.stderr or '')


def stage_hunt(product, max_hunt):
    """Find a fresh CC candidate via the camofox browser tool."""
    log(f'stage 1/5: browser hunt for {product}')
    rc, out = run([TSX, 'scripts/tv/hunt_tool.ts', f'--product={product}', f'--max={max_hunt}'], timeout=600)
    tail = out.strip().splitlines()[-1] if out.strip() else '{}'
    try:
        j = json.loads(tail)
    except Exception:
        j = {'ok': False, 'error': tail[:150]}
    log(f"  hunt: inserted={j.get('inserted')} err={j.get('error', '-')}")
    return j


def pick_candidate(source_id, product):
    """Highest viralScore unused candidate that passed the research gate."""
    where, params = 'used=false AND ("relevanceScore" IS NULL OR "relevanceScore">=7)', []
    if source_id:
        where, params = 'id=%s', [source_id]
    elif product:
        where += ' AND product=%s'
        params.append(product)
    rows = pg_query(f'''SELECT id, product, title, "viralScore", "relevanceScore"
                        FROM "FreeVideoSource" WHERE {where}
                        ORDER BY "viralScore" DESC LIMIT 1''', params)
    return rows[0] if rows else None


def stage_research(source_id):
    """llama relevance gate (+whisper/vision when gateway supports)."""
    log('stage 2/5: in-house research (relevance gate)')
    rc, out = run(['python3', 'scripts/tv/research_inhouse.py', '--source-id', source_id], timeout=900)
    keep = ''.join(l for l in out.splitlines() if '[research]' in l or l.startswith(('[', '{')))[-600:]
    log(f'  research: {keep.splitlines()[-1][:160] if keep.strip() else "no output"}')
    row = pg_query('SELECT "relevanceScore" FROM "FreeVideoSourceResearch" WHERE "videoSourceId"=%s', [source_id])
    score = row[0]['relevanceScore'] if row else None
    return score


def stage_create(source_id, use_rafan):
    """Bangla VO + music bed + enhance/burns + publish pos1 + restart tv-ffmpeg."""
    log('stage 3/5: create (Bangla + music + enhance) & publish')
    cmd = [TSX, 'scripts/tv/create_from_free.ts', f'--sourceId={source_id}']
    rc, out = run(cmd, timeout=1200)
    important = [l for l in out.splitlines() if any(k in l for k in
                 ('PUBLISHED', 'titleBn:', 'gender:', 'music', 'comfy', 'seo:', 'FATAL', 'Error'))]
    for l in important[-8:]:
        print('   ' + l[:160])
    return rc == 0 and 'PUBLISHED' in out, out


def stage_seo(source_id):
    """/tv/watch/{slug} + OG + VideoObject (template-primary, fast)."""
    log('stage 4/5: auto-SEO')
    rc, out = run(['python3', 'scripts/tv/seo_generate.py', '--source-id', source_id], timeout=300)
    ok = '✓ https://hostamar.com/tv/watch/' in out
    slug = ''
    for l in out.splitlines():
        if 'https://hostamar.com/tv/watch/' in l and '✓' in l:
            slug = l.strip().lstrip('✓ ').split('/tv/watch/')[-1].rstrip('.')
            break
    log(f"  seo: page={'OK' if ok else 'FAILED'} slug={slug}")
    return ok, slug


def stage_notify(product, title_bn, slug, hunyuan_used):
    log('stage 5/5: notify')
    edit = 'Hunyuan edit' if hunyuan_used else 'ffmpeg enhance'
    msg = (f"New {product} video: {title_bn or '(Bangla title pending)'} — "
           f"{edit} + best Bangla + SEO page https://hostamar.com/tv/watch/{slug} now on TV")
    rc, out = run(['python3', 'scripts/notify.py', msg], timeout=60)
    log(f"  {out.strip().splitlines()[-1][:120] if out.strip() else 'done'}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--product')
    ap.add_argument('--source-id')
    ap.add_argument('--now', action='store_true', help='run immediately (informational)')
    ap.add_argument('--one', action='store_true', help='single round (automation mode)')
    ap.add_argument('--use-rafan', action='store_true', help='pass rafan enhancement to SEO/create stages')
    ap.add_argument('--max-hunt', type=int, default=1)
    ap.add_argument('--skip-hunt', action='store_true')
    ap.add_argument('--skip-research', action='store_true')
    args = ap.parse_args()

    if not args.product and not args.source_id:
        print('need --product X or --source-id ID')
        sys.exit(2)

    # comfy status once, for the log line
    try:
        comfy = urllib.request.urlopen(os.environ.get('COMFY_URL', 'http://172.17.112.1:8188') + '/system_stats', timeout=4).status
    except Exception:
        comfy = 0
    log(f"comfy: {'UP' if comfy == 200 else 'DOWN → ffmpeg enhance fallback'}")

    # 1) hunt fresh candidates
    if not args.source_id and not args.skip_hunt:
        for _ in range(max(args.max_hunt, 1)):
            stage_hunt(args.product, args.max_hunt)

    # 2) pick best gated candidate
    cand = pick_candidate(args.source_id, args.product)
    if not cand:
        log('no eligible candidate (all used / gated <7) — nothing to do this round')
        sys.exit(1)
    sid = cand['id']
    log(f"candidate: [{cand['product']}] {cand['title'][:60]} (score={cand.get('relevanceScore')})")

    # 3) research gate (skip when explicitly researched already or flag set)
    if not args.skip_research and cand.get('relevanceScore') is None:
        score = stage_research(sid)
        if score is not None and score < 7:
            log(f'rejected by research gate ({score}) — run again for next candidate')
            sys.exit(1)

    # 4) create + publish
    created, out = stage_create(sid, args.use_rafan)
    if not created:
        log('create/publish FAILED — see output above')
        sys.exit(1)

    # extract published Bangla title for notify
    title_bn = ''
    for l in out.splitlines():
        if 'titleBn:' in l:
            title_bn = l.split('titleBn:', 1)[1].strip()
            break

    # 5) SEO
    ok, slug = stage_seo(sid)

    # 6) notify
    stage_notify(cand['product'], title_bn, slug, hunyuan_used=False)

    log(f'DONE — {cand["product"]} live on TV' + (f', page /tv/watch/{slug}' if slug else ''))
    sys.exit(0)


if __name__ == '__main__':
    main()
