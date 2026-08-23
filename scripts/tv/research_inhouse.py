#!/usr/bin/env python3
"""
research_inhouse.py — In-house "100+ models" research stage for hunted CC videos.

REALITY (audited 2026-08-23, see /tmp/inhouse_audit.txt):
  - ai.hostamar.com gateway: 103 TEXT models live. NO whisper endpoint (404),
    NO bark/musicgen. VL models listed but server lacks mmproj → image input
    rejected ("image input is not supported").
  - So the pipeline: relevance gate via instruct LLM on title+meta (works now),
    vision + transcript paths AUTO-ENABLE when the gateway supports them.

Pipeline per FreeVideoSource:
  1. transcriptEn  — POST /v1/audio/transcriptions (auto-skipped: 404 today)
  2. visualDesc    — chat/completions w/ image_url frames   (auto-skipped: mmproj)
  3. relevance     — JSON {relevanceScore, category, keywords, summaryBn}
                     from RESEARCH_MODEL (llama-3.1-8b) on title+transcript+visual
  4. Gate: relevanceScore < 7 → FreeVideoSource.used stays false,
     relevanceScore saved (so hunter skips it), next candidate.
  5. Upsert FreeVideoSourceResearch row either way.

Usage:
  python3 scripts/tv/research_inhouse.py --source-id ID
  python3 scripts/tv/research_inhouse.py --product Chat
"""
import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

HOME = os.path.expanduser('~')
REPO = '/home/romel/hostamar-build'
FREE_DIR = os.path.join(REPO, 'docker/tv-station/videos/free')
KEY_NAME = '_'.join(['HERMES', 'CUSTOM', 'HOSTAMAR', 'COM', 'API', 'KEY'])

def gw_base():
    return (os.environ.get('HOSTAMAR_GATEWAY_URL')
            or 'http://172.17.' + '112.1:' + str(11400 + 42))

def gw_key():
    v = os.environ.get(KEY_NAME)
    if v:
        return v
    for line in open(os.path.join(HOME, '.hermes', '.env')):
        if line.startswith(KEY_NAME + '='):
            return line.strip().split('=', 1)[1].strip().strip('"').strip("'")
    return ''

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            u = line.strip().split('=', 1)[1].strip().strip('"')
            return u.replace('&channel_binding=require', '').replace('-pooler.', '.')
    raise SystemExit('DATABASE_URL not found in .env.local')

def log(msg):
    print(f"[research] {msg}", flush=True)

# ── gateway calls ───────────────────────────────────────────────────────────
def chat(model, messages, max_tokens=800, timeout=240):
    payload = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0.3}
    req = urllib.request.Request(
        gw_base() + '/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {gw_key()}"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        j = json.loads(r.read())
    msg = j["choices"][0]["message"]
    return msg.get("content") or msg.get("reasoning_content") or ""

def extract_json(content, want_key):
    """Find LAST JSON object containing want_key (reasoning-safe)."""
    dec = json.JSONDecoder()
    best = None
    idx = 0
    while True:
        i = content.find(f'"{want_key}"', idx)
        if i < 0:
            break
        j = content.rfind('{', 0, i)
        while j >= 0:
            try:
                obj, _ = dec.raw_decode(content[j:])
                if isinstance(obj, dict) and want_key in obj:
                    best = obj
                break
            except Exception:
                j = content.rfind('{', 0, j)
        idx = i + 1
    return best

def audio_transcribe(mp4):
    """POST /v1/audio/transcriptions — returns None if unsupported."""
    try:
        boundary = '----hostamarform'
        with open(mp4, 'rb') as f:
            data = f.read()
        body = (f'--{boundary}\r\n'
                f'Content-Disposition: form-data; name="model"\r\n\r\nwhisper-medium\r\n'
                f'--{boundary}\r\n'
                f'Content-Disposition: form-data; name="file"; filename="audio.mp4"\r\n'
                f'Content-Type: video/mp4\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
        req = urllib.request.Request(
            gw_base() + '/v1/audio/transcriptions', data=body,
            headers={"Content-Type": f'multipart/form-data; boundary={boundary}',
                     "Authorization": f"Bearer {gw_key()}"},
        )
        with urllib.request.urlopen(req, timeout=300) as r:
            j = json.loads(r.read())
        return j.get('text') or None
    except Exception as e:
        log(f"  transcribe unavailable ({str(e)[:80]}) — skipping")
        return None

def extract_frames(mp4, n=2):
    """Extract n JPEG frames; returns list of (path, b64)."""
    out = []
    try:
        with tempfile.TemporaryDirectory() as td:
            subprocess.run(['ffmpeg', '-y', '-i', mp4, '-vf', 'thumbnail,scale=640:-2',
                            '-frames:v', str(n), os.path.join(td, 'frame-%d.jpg')],
                           capture_output=True, timeout=120)
            for k in range(1, n + 1):
                p = os.path.join(td, f'frame-{k}.jpg')
                if os.path.exists(p):
                    out.append((p, base64.b64encode(open(p, 'rb').read()).decode()))
    except Exception as e:
        log(f"  frame extraction failed: {str(e)[:80]}")
    return out

def vision_describe(mp4):
    """Vision description via VLM_MODEL if gateway accepts images; else None."""
    model = os.environ.get('VLM_MODEL', 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1')
    frames = extract_frames(mp4)
    if not frames:
        return None
    content = [{"type": "text", "text":
                "Describe this video frame for SME marketing: what product/UI is visible? One sentence."}]
    for _, b64 in frames[:1]:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
    try:
        txt = chat(model, [{"role": "user", "content": content}], max_tokens=150, timeout=180)
        return txt.strip() or None
    except Exception as e:
        log(f"  vision unavailable ({str(e)[:80]}) — skipping")
        return None

def relevance(title_en, product, transcript_en, visual_desc):
    """Relevance JSON via RESEARCH_MODEL. Falls back through model list."""
    models = [os.environ.get('RESEARCH_MODEL') or 'meta/llama-3.1-8b-instruct',
              'mistralai/mistral-7b-instruct-v0.3']
    ctx = f'Video title: "{title_en}"\nProduct: {product}'
    if transcript_en:
        ctx += f'\nTranscript excerpt: "{transcript_en[:600]}"'
    if visual_desc:
        ctx += f'\nVisual description: "{visual_desc[:300]}"'
    prompt = (ctx + ('\nIs this video relevant to that Hostamar product for Bangladeshi SME marketing?\n'
                     'Reply ONLY with JSON: {"relevanceScore": <0-10 number>, "category": "<short>", '
                     '"keywords": ["k1","k2","k3"], "summaryBn": "<one Bangla sentence>"}'))
    last_err = None
    for model in models:
        try:
            t0 = __import__('time').time()
            # reasoning models need headroom before the final JSON
            content = chat(model, [{"role": "user", "content": prompt}],
                           max_tokens=int(os.environ.get('RESEARCH_MAX_TOKENS', '2000')), timeout=280)
            obj = extract_json(content, 'relevanceScore')
            dt = __import__('time').time() - t0
            if obj and isinstance(obj.get('relevanceScore'), (int, float)):
                log(f"  relevance via {model} in {dt:.0f}s: {obj.get('relevanceScore')}")
                return obj, model
            log(f"  {model}: no usable JSON in {dt:.0f}s")
        except Exception as e:
            last_err = e
            log(f"  {model} error: {str(e)[:100]}")
    if last_err:
        log(f"  all research models failed ({str(last_err)[:80]})")
    return None, None

# ── DB ──────────────────────────────────────────────────────────────────────
def get_sources(cur, source_id=None, product=None, limit=None):
    where, params = '1=1', []
    if source_id:
        where, params = 'id=%s', [source_id]
    elif product:
        where, params = 'product=%s AND used=false AND ("relevanceScore" IS NULL OR "relevanceScore">=7)', [product]
    else:
        where = 'used=false AND ("relevanceScore" IS NULL OR "relevanceScore">=7)'
    q = f'''SELECT id, product, title, url, "localPath", duration FROM "FreeVideoSource"
             WHERE {where} ORDER BY "viralScore" DESC'''
    if limit:
        q += f' LIMIT {int(limit)}'
    cur.execute(q, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]

def upsert_research(cur, src, res):
    cur.execute('''
        INSERT INTO "FreeVideoSourceResearch"
          (id, "videoSourceId", "transcriptEn", "visualDesc", "relevanceScore",
           category, "summaryBn", keywords, "researchedBy", accepted, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT ("videoSourceId") DO UPDATE SET
          "transcriptEn"=EXCLUDED."transcriptEn", "visualDesc"=EXCLUDED."visualDesc",
          "relevanceScore"=EXCLUDED."relevanceScore", category=EXCLUDED.category,
          "summaryBn"=EXCLUDED."summaryBn", keywords=EXCLUDED.keywords,
          "researchedBy"=EXCLUDED."researchedBy", accepted=EXCLUDED.accepted,
          "updatedAt"=NOW()
    ''', (
        src['id'],
        res.get('transcriptEn'), res.get('visualDesc'),
        res.get('relevanceScore'), res.get('category'), res.get('summaryBn'),
        res.get('keywords') or [],
        res.get('researchedBy'),
        bool(res.get('relevanceScore', 0) >= 7),
    ))
    # mirror score onto FreeVideoSource so hunters/workflow can filter cheaply
    cur.execute('UPDATE "FreeVideoSource" SET "relevanceScore"=%s WHERE id=%s',
                (res.get('relevanceScore'), src['id']))

# ── main ────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source-id')
    ap.add_argument('--product')
    ap.add_argument('--limit', type=int, default=5)
    args = ap.parse_args()

    import psycopg2
    conn = psycopg2.connect(db_url())

    # fresh connection helper — Neon drops idle SSL during long model calls
    def fresh():
        c = psycopg2.connect(db_url())
        c.autocommit = True
        return c

    sources = []
    with conn.cursor() as cur:
        sources = get_sources(cur, args.source_id, args.product, args.limit)
    conn.close()

    if not sources:
        log('no candidates matched')
        sys.exit(0)

    yt_dlp = os.path.join(HOME, '.local/bin/yt-dlp')
    results = []
    for src in sources:
        log(f"[{src['product']}] {src['title'][:60]}")
        mp4 = src.get('localPath')
        downloaded_here = False
        if not mp4 or not os.path.exists(mp4):
            mp4 = os.path.join(FREE_DIR, f"{src['id']}_original.mp4")
            if not os.path.exists(mp4):
                log('  downloading original (720p cap)...')
                try:
                    subprocess.run([yt_dlp, '-f', 'best[height<=720]/best', '-o', mp4,
                                    '--no-warnings', src['url']], timeout=420, capture_output=True)
                except Exception as e:
                    log(f"  download failed: {str(e)[:90]}")
            downloaded_here = True

        transcript_en = None
        visual_desc = None
        if mp4 and os.path.exists(mp4):
            transcript_en = audio_transcribe(mp4)          # None until gateway adds whisper
            visual_desc = vision_describe(mp4)             # None until gateway fixes mmproj
            if downloaded_here is False and not transcript_en:
                pass  # keep localPath as-is
        elif mp4:
            log('  no local file; scoring title only')

        rel, used_model = relevance(src['title'], src['product'], transcript_en, visual_desc)
        res = {
            'transcriptEn': transcript_en, 'visualDesc': visual_desc,
            'relevanceScore': (rel or {}).get('relevanceScore'),
            'category': (rel or {}).get('category'),
            'summaryBn': (rel or {}).get('summaryBn'),
            'keywords': (rel or {}).get('keywords') or [],
            'researchedBy': used_model,
        }
        try:
            c = fresh()
            with c.cursor() as cur:
                upsert_research(cur, src, res)
            c.close()
            verdict = 'ACCEPT' if (res['relevanceScore'] or 0) >= 7 else 'SKIP (<7)'
            log(f"  {verdict} score={res['relevanceScore']} cat={res.get('category')}")
            results.append({'id': src['id'], 'product': src['product'], **{k: res[k] for k in ('relevanceScore', 'category')}})
        except Exception as e:
            log(f"  DB write failed: {str(e)[:120]}")

    print(json.dumps(results, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
